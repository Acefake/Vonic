import type { ChildProcess } from 'node:child_process'
import type { Logger } from '../logger'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { app } from 'electron'

export interface JavaProcessConfig {
  /** JAR 文件路径 */
  jarPath: string
  /** Java 可执行文件路径（可选，默认使用系统 java） */
  javaPath?: string
  /** JVM 参数 */
  jvmArgs?: string[]
  /** 应用参数 */
  appArgs?: string[]
  /** 端口号 */
  port?: number
  /** 启动超时时间（毫秒） */
  startupTimeout?: number
}

export class JavaProcessManager {
  private javaProcess: ChildProcess | null = null
  private config: JavaProcessConfig
  private isStarting = false
  private isRunning = false
  private logger?: Logger

  constructor(config: JavaProcessConfig, logger?: Logger) {
    this.config = {
      jvmArgs: ['-Xmx512m', '-Xms256m'],
      appArgs: [],
      port: 8090,
      startupTimeout: 30000,
      ...config,
    }
    this.logger = logger
  }

  /**
   * 启动 Java 进程
   */
  async start(): Promise<void> {
    if (this.isRunning || this.isStarting) {
      await this.logger?.log('info', 'Java 进程已在运行或正在启动')
      return
    }

    this.isStarting = true

    try {
      // 检查 JAR 文件是否存在
      if (!existsSync(this.config.jarPath)) {
        throw new Error(`JAR 文件不存在: ${this.config.jarPath}`)
      }

      // 构建启动命令
      const javaCommand = this.config.javaPath || 'java'
      const args = [
        ...this.config.jvmArgs!,
        '-jar',
        this.config.jarPath,
        ...this.config.appArgs!,
      ]

      const fullCommand = `${javaCommand} ${args.join(' ')}`
      await this.logger?.log('info', `启动 Java 进程: ${fullCommand}`)

      // 启动进程
      this.javaProcess = spawn(javaCommand, args, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      await this.logger?.log('info', 'Java 进程已启动（后台运行）')

      // 监听标准输出
      this.javaProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          this.logger?.log('info', `[Java] ${output}`)
        }
      })

      // 监听错误输出
      this.javaProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          this.logger?.log('error', `[Java Error] ${output}`)
        }
      })

      // 监听进程退出
      this.javaProcess.on('exit', (code, signal) => {
        this.logger?.log('warn', `Java 进程退出，code: ${code}, signal: ${signal}`)
        this.isRunning = false
        this.javaProcess = null
      })

      // 监听进程错误
      this.javaProcess.on('error', (error) => {
        this.logger?.log('error', `Java 进程错误: ${error}`)
        this.isRunning = false
        this.isStarting = false
      })

      // 立即标记为运行中，不等待健康检查
      this.isRunning = true
      this.isStarting = false
    }
    catch (error) {
      this.isStarting = false
      this.isRunning = false
      await this.logger?.log('error', `启动 Java 进程失败: ${error}`)
      throw error
    }
  }

  /**
   * 停止 Java 进程
   */
  async stop(): Promise<void> {
    if (!this.javaProcess) {
      return
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // 强制杀死进程
        if (this.javaProcess && !this.javaProcess.killed) {
          this.logger?.log('warn', '强制终止 Java 进程')
          this.javaProcess.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      this.javaProcess!.once('exit', () => {
        clearTimeout(timeout)
        this.javaProcess = null
        this.isRunning = false
        this.logger?.log('info', 'Java 进程已停止')
        resolve()
      })

      // 发送终止信号
      this.logger?.log('info', '停止 Java 进程...')
      this.javaProcess!.kill('SIGTERM')
    })
  }

  /**
   * 重启 Java 进程
   */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  /**
   * 获取进程状态
   */
  getStatus(): { isRunning: boolean, isStarting: boolean, pid?: number } {
    return {
      isRunning: this.isRunning,
      isStarting: this.isStarting,
      pid: this.javaProcess?.pid,
    }
  }
}

/**
 * 获取 JAR 文件路径
 */
export function getJarPath(): string {
  if (app.isPackaged) {
    // 生产环境：从 resources 目录读取
    return join(process.resourcesPath, 'jar', 'javaSever.jar')
  }
  else {
    // 开发环境：从项目根目录读取
    return join(app.getAppPath(), 'jar', 'javaSever.jar')
  }
}

/**
 * 创建 Java 进程管理器实例
 */
export function createJavaProcessManager(
  config?: Partial<JavaProcessConfig>,
  logger?: Logger,
): JavaProcessManager {
  const defaultConfig: JavaProcessConfig = {
    jarPath: getJarPath(),
    jvmArgs: ['-Xmx512m', '-Xms256m'],
    appArgs: [],
    port: 8090,
    startupTimeout: 30000,
    ...config,
  }

  return new JavaProcessManager(defaultConfig, logger)
}

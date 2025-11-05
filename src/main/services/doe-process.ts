import type { ChildProcess } from 'node:child_process'
import type { Logger } from '@/main/app/handlers/LogerManager'
import { exec, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import util from 'node:util'
import axios from 'axios'
import { app } from 'electron'

const execAsync = util.promisify(exec)

/**
 * 获取DOE服务的路径
 * 在开发环境和生产环境中使用不同的路径
 */
function getDoeServicePath(): { batPath: string, workingDir: string } {
  const isPackaged = app.isPackaged

  if (isPackaged) {
    // 生产环境：使用打包后的资源路径
    const resourcesPath = process.resourcesPath
    const batPath = join(resourcesPath, 'services', 'doeService', 'start.bat')
    const workingDir = join(resourcesPath, 'services', 'doeService')
    return { batPath, workingDir }
  }
  else {
    // 开发环境：使用源码路径
    const batPath = join(process.cwd(), 'src', 'main', 'services', 'doeService', 'start.bat')
    const workingDir = join(process.cwd(), 'src', 'main', 'services', 'doeService')
    return { batPath, workingDir }
  }
}

export interface DoeProcessConfig {
  /** start.bat 文件路径 */
  batPath: string
  /** 工作目录 */
  workingDir: string
  /** 端口号 */
  port?: number
  /** 启动超时时间（毫秒） */
  startupTimeout?: number
  /** 健康检查URL */
  healthCheckUrl?: string
}

export class DoeProcessManager {
  private doeProcess: ChildProcess | null = null
  private config: DoeProcessConfig
  private isStarting = false
  private isRunning = false
  private logger?: Logger

  constructor(config: DoeProcessConfig, logger?: Logger) {
    this.config = {
      port: 25504,
      startupTimeout: 30000,
      healthCheckUrl: 'http://localhost:25504/api/v1/integ/doe/validate',
      ...config,
    }
    this.logger = logger
  }

  /**
   * 启动 DOE 进程
   */
  async start(): Promise<void> {
    if (this.isRunning || this.isStarting) {
      await this.logger?.log('info', 'DOE 服务已在运行或正在启动')
      return
    }

    this.isStarting = true

    try {
      // 启动前先尝试杀死占用端口的进程
      await this.killProcessOnPort(this.config.port!)

      // 检查 start.bat 文件是否存在
      if (!existsSync(this.config.batPath)) {
        throw new Error(`start.bat 文件不存在: ${this.config.batPath}`)
      }

      await this.logger?.log('info', `启动 DOE 服务: ${this.config.batPath}`)

      // 启动进程 - 使用 cmd.exe 来执行 bat 文件
      this.doeProcess = spawn('cmd.exe', ['/c', this.config.batPath], {
        cwd: this.config.workingDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true, // 隐藏命令行窗口
      })

      await this.logger?.log('info', 'DOE 服务进程已启动')

      // 监听标准输出
      this.doeProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          // 过滤掉一些不重要的输出
          if (!output.includes('chcp') && !output.includes('Active code page')) {
            this.logger?.log('info', `[DOE] ${output}`)
          }
        }
      })

      // 监听错误输出
      this.doeProcess.stderr?.on('data', (data) => {
        const output = data.toString().trim()
        if (output) {
          this.logger?.log('error', `[DOE Error] ${output}`)
        }
      })

      // 监听进程退出
      this.doeProcess.on('exit', (code, signal) => {
        this.logger?.log('warn', `DOE 进程退出，code: ${code}, signal: ${signal}`)
        this.isRunning = false
        this.doeProcess = null
      })

      // 监听进程错误
      this.doeProcess.on('error', (error) => {
        this.logger?.log('error', `DOE 进程错误: ${error}`)
        this.isRunning = false
        this.isStarting = false
      })

      // 等待服务启动完成
      await this.waitForStartup()
      this.isRunning = true
      this.isStarting = false

      await this.logger?.log('info', 'DOE 服务启动成功')
    }
    catch (error) {
      this.isStarting = false
      this.isRunning = false
      await this.logger?.log('error', `启动 DOE 服务失败: ${error}`)
      throw error
    }
  }

  /**
   * 查找并终止占用指定端口的进程
   * @param port 端口号
   */
  private async killProcessOnPort(port: number): Promise<void> {
    if (process.platform !== 'win32') {
      this.logger?.log('info', 'Skipping kill-process-on-port, not on Windows.')
      return
    }

    let pids: string[]
    try {
      const command = `netstat -aon | findstr ":${port}" | findstr "LISTENING"`
      const { stdout } = await execAsync(command)
      const lines = stdout.trim().split('\n')
      const pidSet = new Set<string>()
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && pid !== '0') {
          pidSet.add(pid)
        }
      }
      pids = [...pidSet]
    }
    catch (error) {
      await this.logger?.log('error', `查找并终止占用端口 ${port} 的进程失败: ${error}`)
      return
    }

    if (pids.length === 0) {
      return
    }

    for (const pid of pids) {
      try {
        await this.logger?.log('info', `找到占用端口 ${port} 的进程，PID: ${pid}，正在终止...`)
        await execAsync(`taskkill /F /PID ${pid}`)
        await this.logger?.log('info', `进程 ${pid} 已成功终止。`)
      }
      catch (killError) {
        console.error(killError)
        await this.logger?.log('warn', `终止进程 ${pid} 时出错 (可能已终止)`)
      }
    }
  }

  /**
   * 等待服务启动完成
   */
  private async waitForStartup(): Promise<void> {
    const startTime = Date.now()
    const timeout = this.config.startupTimeout!

    while (Date.now() - startTime < timeout) {
      try {
        if (this.config.healthCheckUrl) {
          await axios.get(this.config.healthCheckUrl, { timeout: 2000 })
          return // 健康检查成功
        }
        else {
          // 如果没有健康检查URL，等待一段时间
          await new Promise(resolve => setTimeout(resolve, 5000))
          return
        }
      }
      catch {
        // 继续等待
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    throw new Error(`DOE 服务启动超时 (${timeout}ms)`)
  }

  /**
   * 停止 DOE 进程
   */
  async stop(): Promise<void> {
    if (!this.doeProcess) {
      return
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // 强制杀死进程
        if (this.doeProcess && !this.doeProcess.killed) {
          this.logger?.log('warn', '强制终止 DOE 进程')
          this.doeProcess.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      this.doeProcess!.once('exit', () => {
        clearTimeout(timeout)
        this.doeProcess = null
        this.isRunning = false
        this.logger?.log('info', 'DOE 进程已停止')
        resolve()
      })

      // 发送终止信号
      this.logger?.log('info', '停止 DOE 进程...')
      this.doeProcess!.kill('SIGTERM')
    })
  }

  /**
   * 重启 DOE 进程
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
      pid: this.doeProcess?.pid,
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isRunning || !this.config.healthCheckUrl) {
      return false
    }

    try {
      await axios.get(this.config.healthCheckUrl, { timeout: 5000 })
      return true
    }
    catch (error) {
      this.logger?.log('warn', `DOE 服务健康检查失败: ${error}`)
      return false
    }
  }
}

/**
 * 获取 DOE 服务配置
 */
export function getDoeServiceConfig(): DoeProcessConfig {
  const { batPath, workingDir } = getDoeServicePath()

  return {
    batPath,
    workingDir,
    port: 25504,
    startupTimeout: 30000,
    healthCheckUrl: 'http://localhost:25504/api/v1/integ/doe/validate',
  }
}

/**
 * 创建DOE进程管理器的便捷函数
 */
export function createDoeProcessManager(
  config?: {
    port?: number
    startupTimeout?: number
    healthCheckUrl?: string
  },
  logger?: Logger,
): DoeProcessManager {
  const defaultConfig = getDoeServiceConfig()
  const finalConfig = { ...defaultConfig, ...config }
  return new DoeProcessManager(finalConfig, logger)
}

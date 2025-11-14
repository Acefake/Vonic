import type { DoeProcessManager } from './doe-process'
import type { Logger } from '@/main/app/handlers/LogerManager'
import { createDoeProcessManager } from './doe-process'

/**
 * DOE 服务管理器配置接口
 */
export interface DoeServiceConfig {
  /** DOE 服务端口 */
  port?: number
  /** 启动超时时间（毫秒） */
  startupTimeout?: number
  /** 健康检查 URL */
  healthCheckUrl?: string
  /** 是否启用 DOE 服务 */
  enabled?: boolean
  /** 是否自动清理端口 */
  autoCleanupPort?: boolean
  /** 是否强制终止进程 */
  forceKillProcesses?: boolean
}

/**
 * DOE 服务管理器
 * 负责管理 DOE 服务的启动、停止、重启和健康检查
 */
export class DoeServiceManager {
  private doeManager?: DoeProcessManager
  private config: DoeServiceConfig
  private logger?: Logger
  private isStarting = false
  private isRunning = false
  private healthCheckInterval?: NodeJS.Timeout

  constructor(config: DoeServiceConfig = {}, logger?: Logger) {
    this.config = {
      enabled: true,
      ...config,
    }
    this.logger = logger

    // 只有在启用 DOE 服务时才创建进程管理器
    if (this.config.enabled) {
      this.doeManager = createDoeProcessManager(this.config, logger)
    }
  }

  /**
   * 启动 DOE 服务
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      await this.logger?.log('info', 'DOE 服务已禁用，跳过启动')
      return
    }

    if (!this.doeManager) {
      throw new Error('DOE 进程管理器未初始化')
    }

    if (this.isRunning || this.isStarting) {
      await this.logger?.log('info', 'DOE 服务已在运行或正在启动')
      return
    }

    this.isStarting = true
    await this.logger?.log('info', '开始启动 DOE 服务...')

    try {
      await this.doeManager.start()

      // 等待服务完全就绪
      await this.logger?.log('info', 'DOE 服务进程已启动，等待服务就绪...')
      await this.waitForServiceReady()

      this.isRunning = true
      this.isStarting = false
      await this.logger?.log('info', 'DOE 服务启动成功并已就绪')

      // 启动健康检查
      this.startHealthCheck()

      // 延迟进行首次健康检查
      setTimeout(() => {
        this.performHealthCheck()
      }, 2000)
    }
    catch (error) {
      this.isStarting = false
      await this.logger?.log('error', `DOE 服务启动失败: ${error}`)
      throw error
    }
  }

  /**
   * 停止 DOE 服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning && !this.isStarting) {
      await this.logger?.log('info', 'DOE 服务未运行')
      return
    }

    await this.logger?.log('info', '开始停止 DOE 服务...')

    // 停止健康检查
    this.stopHealthCheck()

    try {
      if (this.doeManager) {
        await this.doeManager.stop()
      }
      this.isRunning = false
      this.isStarting = false
      await this.logger?.log('info', 'DOE 服务已停止')
    }
    catch (error) {
      await this.logger?.log('error', `停止 DOE 服务失败: ${error}`)
      throw error
    }
  }

  /**
   * 重启 DOE 服务
   */
  async restart(): Promise<void> {
    await this.logger?.log('info', '正在重启 DOE 服务...')

    try {
      await this.stop()
      await this.start()
      await this.logger?.log('info', 'DOE 服务重启成功')
    }
    catch (error) {
      await this.logger?.log('error', `DOE 服务重启失败: ${error}`)
      throw error
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isRunning: boolean
    isStarting: boolean
    pid?: number
    enabled: boolean
  } {
    const doeStatus = this.doeManager?.getStatus() || {
      isRunning: false,
      isStarting: false,
      pid: undefined,
    }

    return {
      isRunning: this.isRunning,
      isStarting: this.isStarting,
      pid: doeStatus.pid,
      enabled: this.config.enabled || false,
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (!this.config.enabled || !this.doeManager) {
      return true // 如果服务被禁用，认为是健康的
    }

    try {
      return await this.doeManager.healthCheck()
    }
    catch (error) {
      await this.logger?.log('error', `DOE 服务健康检查失败: ${error}`)
      return false
    }
  }

  /**
   * 启动定期健康检查
   */
  private startHealthCheck(): void {
    // 清除之前的定时器
    this.stopHealthCheck()

    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck()

      if (!isHealthy && this.isRunning) {
        await this.logger?.log('warn', 'DOE 服务健康检查失败，尝试重启...')

        try {
          await this.restart()
          await this.logger?.log('info', 'DOE 服务重启成功')
        }
        catch (error) {
          await this.logger?.log('error', `重启 DOE 服务失败: ${error}`)
        }
      }
    }, 3000000) // 每30秒检查一次
  }

  /**
   * 等待服务就绪
   */
  private async waitForServiceReady(): Promise<void> {
    const maxRetries = 30 // 最多重试30次
    const retryInterval = 2000 // 每2秒重试一次

    for (let i = 0; i < maxRetries; i++) {
      try {
        const isReady = await this.healthCheck()
        if (isReady) {
          await this.logger?.log('info', `DOE 服务就绪检查通过 (第${i + 1}次尝试)`)
          return
        }
      }
      catch (error) {
        await this.logger?.log('warn', `DOE 服务就绪检查失败 (第${i + 1}次尝试): ${error}`)
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryInterval))
      }
    }

    throw new Error(`DOE 服务在 ${maxRetries * retryInterval / 1000} 秒内未能就绪`)
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = await this.healthCheck()

      if (isHealthy) {
        await this.logger?.log('info', 'DOE 服务健康检查通过')
      }
      else {
        await this.logger?.log('warn', 'DOE 服务健康检查失败')
      }
    }
    catch (error) {
      await this.logger?.log('error', `健康检查过程中发生错误: ${error}`)
    }
  }

  /**
   * 获取 DOE 进程管理器实例
   */
  getDoeManager(): DoeProcessManager | undefined {
    return this.doeManager
  }

  /**
   * 检查服务是否已启用
   */
  isEnabled(): boolean {
    return this.config.enabled || false
  }
}

/**
 * 创建 DOE 服务管理器实例
 */
export function createDoeServiceManager(
  config?: DoeServiceConfig,
  logger?: Logger,
): DoeServiceManager {
  return new DoeServiceManager(config, logger)
}

// 为了保持向后兼容，导出一个别名
export const ServiceManager = DoeServiceManager
export const createServiceManager = createDoeServiceManager
export type ServiceManagerConfig = DoeServiceConfig

import type { ChildProcess } from 'node:child_process'
import { Logger } from '../app/handlers/LogerManager'

/**
 * 进程池任务接口
 */
interface PoolTask<T> {
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/**
 * 进程池管理器
 */
export class ProcessPool {
  private maxConcurrent: number
  private activeProcesses: Set<ChildProcess> = new Set()
  private queue: Array<PoolTask<any>> = []
  private logger: Logger

  constructor(maxConcurrent: number, logger?: Logger) {
    this.maxConcurrent = maxConcurrent
    this.logger = logger || new Logger()
  }

  /**
   * 执行任务
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const poolTask: PoolTask<T> = {
        execute: task,
        resolve,
        reject,
      }

      this.queue.push(poolTask)
      this.processQueue()
    })
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeProcesses.size < this.maxConcurrent) {
      const task = this.queue.shift()
      if (!task)
        continue

      this.executeTask(task)
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask<T>(task: PoolTask<T>): Promise<void> {
    try {
      const result = await task.execute()
      task.resolve(result)
    }
    catch (error) {
      task.reject(error as Error)
    }
    finally {
      // 任务完成后继续处理队列
      this.processQueue()
    }
  }

  /**
   * 获取活跃进程数
   */
  getActiveCount(): number {
    return this.activeProcesses.size
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * 更新最大并发数
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max)
    this.logger.log('info', `进程池最大并发数已更新为: ${this.maxConcurrent}`)
    this.processQueue()
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = []
  }
}

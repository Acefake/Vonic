/**
 * 信号量类，用于控制并发数量
 */
export class Semaphore {
  private permits: number
  private waiting: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  /**
   * 获取许可
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }

  /**
   * 释放许可
   */
  release(): void {
    this.permits++
    const next = this.waiting.shift()
    if (next) {
      this.permits--
      next()
    }
  }

  /**
   * 获取当前可用许可数
   */
  getAvailablePermits(): number {
    return this.permits
  }

  /**
   * 获取等待队列长度
   */
  getWaitingCount(): number {
    return this.waiting.length
  }
}

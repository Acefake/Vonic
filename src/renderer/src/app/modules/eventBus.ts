import type { EventBusAPI } from '../types'

/**
 * 事件总线实现
 */
class EventBus implements EventBusAPI {
  private events = new Map<string, Set<(data: unknown) => void>>()

  /**
   * 订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback as (data: unknown) => void)

    // 返回取消订阅函数
    return () => this.off(event, callback as (data: unknown) => void)
  }

  /**
   * 订阅一次性事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  once<T = unknown>(event: string, callback: (data: T) => void): void {
    const wrappedCallback = (data: T): void => {
      callback(data)
      this.off(event, wrappedCallback as (data: unknown) => void)
    }
    this.on(event, wrappedCallback)
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param data 事件数据
   */
  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        }
        catch (error) {
          console.error(`EventBus: 事件 "${event}" 的回调执行失败:`, error)
        }
      })
    }
  }

  /**
   * 取消订阅
   * @param event 事件名称
   * @param callback 回调函数，如果不提供则取消该事件的所有订阅
   */
  off(event: string, callback?: (data: unknown) => void): void {
    if (!callback) {
      // 取消该事件的所有订阅
      this.events.delete(event)
      return
    }

    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      // 如果该事件没有订阅者了，删除该事件
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * 清除所有事件监听
   */
  clear(): void {
    this.events.clear()
  }
}

/**
 * 事件总线 API 实例
 */
export const eventBusAPI = new EventBus()

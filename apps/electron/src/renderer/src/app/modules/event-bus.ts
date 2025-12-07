import type { EventBusAPI } from '../types'
import { EventBus } from 'event-bus-common'

/**
 * 事件总线实现
 * 对 event-bus-common 的简单封装
 */
class EventBusImpl implements EventBusAPI {
  private eventBus = new EventBus()

  /**
   * 订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    const subscription = this.eventBus.on(event, callback)
    // event-bus-common 的 on 方法返回 EventSubscription 对象，包含 unsubscribe 方法
    return typeof subscription === 'function'
      ? subscription
      : () => {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe()
          }
        }
  }

  /**
   * 订阅一次性事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  once<T = unknown>(event: string, callback: (data: T) => void): void {
    this.eventBus.once(event, callback)
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param data 事件数据
   */
  emit<T = unknown>(event: string, data?: T): void {
    this.eventBus.emit(event, data)
  }

  /**
   * 取消订阅
   * @param event 事件名称
   * @param _callback 可选的回调函数（event-bus-common 的 off 方法只支持按事件名取消，此参数暂未使用）
   */
  off(event: string, _callback?: (data: unknown) => void): void {
    // event-bus-common 的 off 方法只接受 event 参数，会取消该事件的所有监听
    this.eventBus.off(event)
  }

  /**
   * 清除所有事件监听
   */
  clear(): void {
    this.eventBus.clear()
  }
}

/**
 * 事件总线 API 实例
 */
export const eventBusAPI = new EventBusImpl()

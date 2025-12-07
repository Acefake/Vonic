import type { MessageAPI } from '../types'
import { message as antMessage } from 'ant-design-vue'

export const messageAPI: MessageAPI = {
  /**
   * 成功消息
   */
  success(content: string, duration = 3): void {
    antMessage.success(content, duration)
  },

  /**
   * 错误消息
   */
  error(content: string, duration = 3): void {
    antMessage.error(content, duration)
  },

  /**
   * 警告消息
   */
  warning(content: string, duration = 3): void {
    antMessage.warning(content, duration)
  },

  /**
   * 信息消息
   */
  info(content: string, duration = 3): void {
    antMessage.info(content, duration)
  },

  /**
   * 加载消息
   * @returns 关闭函数
   */
  loading(content: string, duration = 0): () => void {
    const hide = antMessage.loading(content, duration)
    return () => hide()
  },
}

import type { NotificationAPI, NotificationConfig } from '../types'
import { notification } from 'ant-design-vue'

export const notificationAPI: NotificationAPI = {
  /**
   * 成功通知
   */
  success(config: NotificationConfig): void {
    notification.success({
      placement: 'topRight',
      duration: 4.5,
      ...config,
    })
  },

  /**
   * 错误通知
   */
  error(config: NotificationConfig): void {
    notification.error({
      placement: 'topRight',
      duration: 4.5,
      ...config,
    })
  },

  /**
   * 警告通知
   */
  warning(config: NotificationConfig): void {
    notification.warning({
      placement: 'topRight',
      duration: 4.5,
      ...config,
    })
  },

  /**
   * 信息通知
   */
  info(config: NotificationConfig): void {
    notification.info({
      placement: 'topRight',
      duration: 4.5,
      ...config,
    })
  },
}

import type { AppAPI } from './types'
import { getProductConfig } from '../../../config/product.config'
import { clipboardAPI } from './modules/clipboard'
import { debugAPI } from './modules/debug'
import { dialogAPI } from './modules/dialog'
import { eventBusAPI } from './modules/event-bus'
import { fileAPI } from './modules/file'
import { httpAPI } from './modules/http'
import { loggerAPI } from './modules/logger'
import { messageAPI } from './modules/message'
import { notificationAPI } from './modules/notification'
import { pluginAPI } from './modules/plugin'
import { storageAPI } from './modules/storage'
import { systemAPI } from './modules/system'
import { windowAPI } from './modules/window'

const productConfig = getProductConfig()

export const app: AppAPI = {
  /** 窗口控制 API */
  window: windowAPI,

  /** 消息通知 API */
  message: messageAPI,

  /** 存储 API */
  storage: storageAPI,

  /** 日志系统 API */
  logger: loggerAPI,

  /** 对话框 API */
  dialog: dialogAPI,

  /** 通知 API */
  notification: notificationAPI,

  /** 剪贴板 API */
  clipboard: clipboardAPI,

  /** 文件操作 API */
  file: fileAPI,

  /** HTTP 请求 API */
  http: httpAPI,

  /** 系统信息 API */
  system: systemAPI,

  /** 事件总线 API */
  eventBus: eventBusAPI,

  /** Debug API */
  debug: debugAPI,

  /** 插件 API */
  plugin: pluginAPI,

  /** 应用版本 */
  version: productConfig.version || '1.0.0',

  /** 是否开发环境 */
  isDev: import.meta.env.DEV,

  /** 产品配置 */
  productConfig,
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { app: AppAPI }).app = app
}

export default app

export type * from './types'

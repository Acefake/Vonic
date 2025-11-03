export interface WindowCreateOptions {
  /** 自定义配置 */
  config?: {
    width?: number
    height?: number
    title?: string
  }
  /** 窗口自定义数据 */
  data?: unknown
}

/**
 * 窗口实例信息（用于返回给渲染进程）
 */
export interface WindowInstanceInfo {
  /** 窗口 ID */
  id: number
  /** 窗口名称 */
  windowName: string
  /** 窗口标题 */
  title: string
  /** 是否已销毁 */
  isDestroyed: boolean
  /** 是否可见 */
  isVisible: boolean
  /** 是否聚焦 */
  isFocused: boolean
  /** 窗口数据 */
  data?: unknown
}

/**
 * IPC 响应格式
 */
export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

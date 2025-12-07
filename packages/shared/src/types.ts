/**
 * 窗口创建选项
 */
export interface WindowCreateOptions {
  config?: {
    width?: number
    height?: number
    title?: string
  }
  data?: unknown
}

/**
 * 窗口实例信息
 */
export interface WindowInstanceInfo {
  id: number
  windowName: string
  title: string
  isDestroyed: boolean
  isVisible: boolean
  isFocused: boolean
  data?: unknown
}

/**
 * IPC 响应格式
 */
export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 文件过滤器
 */
export interface FileFilter {
  name: string
  extensions: string[]
}

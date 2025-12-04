/**
 * 文件选择选项
 */
export interface SelectFileOptions {
  /** 文件过滤器 */
  filters?: FileFilter[]
  /** 是否允许多选 */
  multiple?: boolean
  /** 对话框标题 */
  title?: string
  /** 使用预设的文件过滤器（'read' | 'write' | 'none'） */
  usePresetFilters?: 'read' | 'write' | 'none'
  /** 默认打开的目录路径 */
  defaultPath?: string
}

/**
 * 保存文件选项
 */
export interface SaveFileOptions {
  /** 默认路径 */
  defaultPath?: string
  /** 文件过滤器 */
  filters?: FileFilter[]
  /** 对话框标题 */
  title?: string
  /** 使用预设的文件过滤器 */
  usePresetFilters?: boolean
}

/**
 * 文件过滤器
 */
export interface FileFilter {
  /** 过滤器名称 */
  name: string
  /** 允许的扩展名列表 */
  extensions: string[]
}

/**
 * 应用信息
 */
export interface AppInfo {
  /** 应用名称 */
  name: string
  /** 应用版本 */
  version: string
  /** 操作系统平台 */
  platform: string
  /** CPU 架构 */
  arch: string
  /** Electron 版本 */
  electronVersion: string
  /** Chrome 版本 */
  chromeVersion: string
  /** Node.js 版本 */
  nodeVersion: string
}

/**
 * 系统信息
 */
export interface SystemInfo {
  /** 操作系统平台 */
  platform: NodeJS.Platform
  /** CPU 核心数 */
  cpuCount: number
  /** 总内存（字节） */
  totalMemory: number
  /** 可用内存（字节） */
  freeMemory: number
  /** 主机名 */
  hostname: string
  /** 操作系统版本 */
  osVersion: string
  /** 用户主目录 */
  homeDir: string
}

/**
 * 内存使用情况
 */
export interface MemoryUsage {
  /** 系统总内存（字节） */
  total: number
  /** 进程已使用内存（字节） */
  used: number
  /** 系统可用内存（字节） */
  available: number
  /** 常驻集大小（字节） */
  rss: number
  /** 堆总大小（字节） */
  heapTotal: number
  /** 堆已使用大小（字节） */
  heapUsed: number
  /** 外部内存使用（字节） */
  external: number
}

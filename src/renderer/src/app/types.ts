/**
 * App API 类型定义
 * 集中管理所有 App API 相关的类型定义
 */

import type { ModalFuncProps } from 'ant-design-vue'
import type { VueNode } from 'ant-design-vue/es/_util/type'
import type { AxiosInstance } from 'axios'
import type { ProductConfig } from '@/config/product'
import type { WindowName } from '@/shared/constants'
import type { WindowCreateOptions, WindowInstanceInfo } from '@/shared/types'

// ==================== 窗口相关类型 ====================

/**
 * 窗口 API 接口
 */
export interface WindowConfig {
  /** 窗口名称 */
  windowName: WindowName
  /** 是否不显示布局组件 */
  noLayout: boolean
  /** 窗口标题 */
  title?: string
}

/**
 * 窗口实例 API 接口
 * 每个窗口类都有这些方法
 */
export interface WindowInstanceAPI {
  /**
   * 打开窗口
   * @param options 窗口选项（支持 config, data）
   * @param waitForResult 是否等待窗口关闭并返回结果（默认 false）
   * @returns Promise，如果 waitForResult 为 true 则等待窗口关闭时返回结果
   */
  open: (options?: WindowCreateOptions, waitForResult?: boolean) => Promise<unknown>
  /**
   * 关闭窗口
   * @param result 关闭时返回的结果值（用于传递给等待的 Promise）
   * @param windowId 可选指定窗口 ID，不指定则关闭当前窗口或所有同名窗口
   */
  close: (result?: unknown, windowId?: number) => void
  /**
   * 获取所有同名窗口实例列表
   * @returns Promise<WindowInstanceInfo[]>
   */
  getAll: () => Promise<WindowInstanceInfo[]>
  /**
   * 通过 ID 获取窗口实例
   * @param windowId 窗口 ID
   * @returns Promise<WindowInstanceInfo | null>
   */
  getById: (windowId: number) => Promise<WindowInstanceInfo | null>
  /**
   * 最小化窗口（操作当前窗口）
   */
  minimize: () => void
  /**
   * 最大化/还原窗口（操作当前窗口）
   */
  toggleMaximize: () => void
  /**
   * 获取当前窗口配置
   */
  getConfig: () => Promise<WindowConfig | null>
  /**
   * 获取窗口数据（操作当前窗口）
   */
  getData: <T = unknown>() => Promise<T | null>
  /**
   * 更新窗口数据（操作当前窗口）
   */
  updateData: (data: unknown) => void
}

/**
 * 窗口 API 接口
 * 动态类型，基于 WindowName 枚举生成每个窗口的属性
 */
export type WindowAPI = {
  /** 当前窗口实例（包含通用窗口操作方法） */
  current: WindowInstanceAPI
} & {
  /** 每个窗口的实例 API（动态生成） */
  [K in WindowName]: WindowInstanceAPI
}

// ==================== 消息相关类型 ====================

/**
 * 消息 API 接口
 */
export interface MessageAPI {
  /** 成功消息 */
  success: (content: string, duration?: number) => void
  /** 错误消息 */
  error: (content: string, duration?: number) => void
  /** 警告消息 */
  warning: (content: string, duration?: number) => void
  /** 信息消息 */
  info: (content: string, duration?: number) => void
  /** 加载消息 */
  loading: (content: string, duration?: number) => () => void
}

// ==================== 主题相关类型 ====================

/**
 * 主题 API 接口
 */
export interface ThemeAPI {
  /** 获取当前主题色 */
  getColor: () => string
  /** 获取产品配置 */
  getConfig: () => Record<string, unknown>
}

// ==================== 存储相关类型 ====================

/**
 * 存储 API 接口
 */
export interface StorageAPI {
  /** 获取存储值 */
  get: <T = unknown>(key: string) => Promise<T | null>
  /** 设置存储值 */
  set: (key: string, value: unknown) => Promise<void>
  /** 删除存储值 */
  remove: (key: string) => Promise<void>
  /** 清空存储 */
  clear: () => Promise<void>
}

// ==================== 日志相关类型 ====================

/**
 * 日志 API 接口
 */
export interface LoggerAPI {
  /** 普通日志 */
  log: (message: string, ...args: unknown[]) => void
  /** 调试日志（仅开发环境） */
  debug: (message: string, ...args: unknown[]) => void
  /** 信息日志 */
  info: (message: string, ...args: unknown[]) => void
  /** 警告日志 */
  warn: (message: string, ...args: unknown[]) => void
  /** 错误日志 */
  error: (message: string, error?: Error | unknown, ...args: unknown[]) => void
  /** 性能监控 */
  performance: (label: string, fn: () => void | Promise<void>) => Promise<void>
}

// ==================== 对话框相关类型 ====================

/**
 * 对话框 API 接口
 */
export interface DialogAPI {
  /** 确认对话框 */
  confirm: (options: ModalFuncProps) => Promise<boolean>
  /** 信息对话框 */
  info: (options: ModalFuncProps) => void
  /** 警告对话框 */
  warning: (options: ModalFuncProps) => void
  /** 错误对话框 */
  error: (options: ModalFuncProps) => void
  /** 成功对话框 */
  success: (options: ModalFuncProps) => void
}

// ==================== 通知相关类型 ====================

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  /** 通知消息 */
  message: string
  /** 通知描述 */
  description?: string
  /** 持续时间（秒），0 表示不自动关闭 */
  duration?: number
  /** 弹出位置 */
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  /** 图标 */
  icon?: VueNode | (() => VueNode)
  /** 点击事件 */
  onClick?: () => void
  /** 关闭事件 */
  onClose?: () => void
}

/**
 * 通知 API 接口
 */
export interface NotificationAPI {
  /** 成功通知 */
  success: (config: NotificationConfig) => void
  /** 错误通知 */
  error: (config: NotificationConfig) => void
  /** 警告通知 */
  warning: (config: NotificationConfig) => void
  /** 信息通知 */
  info: (config: NotificationConfig) => void
}

// ==================== 剪贴板相关类型 ====================

/**
 * 剪贴板 API 接口
 */
export interface ClipboardAPI {
  /** 复制文本到剪贴板 */
  writeText: (text: string) => Promise<void>
  /** 读取剪贴板文本 */
  readText: () => Promise<string>
  /** 复制文本并显示成功消息 */
  copy: (text: string, successMessage?: string) => Promise<void>
}

// ==================== 文件相关类型 ====================

export interface SelectFileOptions {
  /** 文件过滤器 */
  filters?: FileFilter[]
  /** 是否允许多选 */
  multiple?: boolean
  /** 对话框标题 */
  title?: string
  /** 使用预设的文件过滤器（'read' | 'write' | 'none'），默认 'read' */
  usePresetFilters?: 'read' | 'write' | 'none'
  /** 默认打开的目录路径 */
  defaultPath?: string
}

export interface SaveFileOptions {
  /** 默认文件路径 */
  defaultPath?: string
  /** 文件过滤器 */
  filters?: FileFilter[]
  /** 对话框标题 */
  title?: string
  /** 使用预设的文件过滤器，默认 true */
  usePresetFilters?: boolean
}

export interface FileFilter {
  name: string
  extensions: string[]
}

/**
 * 文件 API 接口
 */
export interface FileAPI {
  /** 选择文件 */
  selectFile: (options?: SelectFileOptions) => Promise<string[] | null>
  /** 选择文件夹 */
  selectFolder: () => Promise<string | null>
  /** 保存文件对话框 */
  saveFile: (options?: SaveFileOptions) => Promise<string | null>
  /** 读取文件内容 */
  readFile: (filePath: string, encoding?: BufferEncoding | null) => Promise<string>
  /** 读取二进制文件内容（返回 Base64 编码） */
  readFileBinary: (filePath: string) => Promise<string>
  /** 写入文件内容 */
  writeFile: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<void>
  /** 检查文件是否存在 */
  exists: (filePath: string) => Promise<boolean>
  /** 删除文件 */
  delete: (filePath: string) => Promise<void>
  /** 打开外部链接 */
  openExternal: (url: string) => Promise<void>
  /** 在文件管理器中显示文件 */
  showInFolder: (path: string) => Promise<void>
  /** 读取 dat 文件内容 */
  readDatFile: (filePath: string, customDir?: string) => Promise<string>
  /** 写入 dat 文件内容 */
  writeDatFile: (arg1: string | Record<string, unknown>, arg2?: Record<string, unknown>, arg3?: string) => Promise<{ code: number, message: string, filePath: string }>
  /** 读取多个方案数据 */
  readMultiSchemes: () => Promise<Array<{
    index: number
    fileName: string
    // 第1行：网格数
    radialGridCount: number
    axialGridCount: number
    // 第2行：主要参数
    angularVelocity: number
    rotorRadius: number
    rotorShoulderLength: number
    extractionChamberHeight: number
    rotorSidewallPressure: number
    gasDiffusionCoefficient: number
    // 第3-29行：其他参数
    depletedEndCapTemperature: number
    enrichedEndCapTemperature: number
    depletedMechanicalDriveAmount: number
    depletedExtractionArmRadius: number
    innerBoundaryMirrorPosition: number
    gridGenerationMethod: number
    enrichedBaffleHoleDistributionCircleDiameter: number
    enrichedBaffleHoleDiameter: number
    depletedExtractionPortInnerDiameter: number
    depletedExtractionPortOuterDiameter: number
    minAxialDistance: number
    feedBoxShockDiskHeight: number
    feedFlowRate: number
    splitRatio: number
    feedAngularDisturbance: number
    feedAxialDisturbance: number
    depletedBaffleInnerHoleOuterDiameter: number
    depletedBaffleOuterHoleInnerDiameter: number
    depletedBaffleOuterHoleOuterDiameter: number
    depletedBaffleAxialPosition: number
    bwgRadialProtrusionHeight: number
    bwgAxialHeight: number
    bwgAxialPosition: number
    radialGridRatio: number
    feedingMethod: number
    compensationCoefficient: number
    streamlineData: number
    // 结果
    sepPower: number | null
    sepFactor: number | null
  }>>
  /** 获取工作目录 */
  getWorkDir: () => Promise<string>
  createOutputDir: (baseDir: string) => Promise<string>
  /** 删除目录（递归删除） */
  deleteDir: (dirPath: string) => Promise<void>
  /** 复制文件 */
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>
  /** 查找 exe 文件路径 */
  findExe: (exeName: string) => Promise<string | null>
}

export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
}

/**
 * HTTP API 接口
 */
export interface HttpAPI {
  /** GET 请求 */
  get: <T = unknown>(url: string, params?: Record<string, unknown>) => Promise<T>
  /** POST 请求 */
  post: <T = unknown>(url: string, data?: unknown) => Promise<T>
  /** PUT 请求 */
  put: <T = unknown>(url: string, data?: unknown) => Promise<T>
  /** DELETE 请求 */
  delete: <T = unknown>(url: string) => Promise<T>
  /** 通用请求 */
  request: <T = unknown>(config: RequestConfig) => Promise<T>
  /** 设置基础 URL */
  setBaseURL: (url: string) => void
  /** 设置默认请求头 */
  setDefaultHeaders: (headers: Record<string, string>) => void
  /** Axios 实例（用于高级配置） */
  instance: AxiosInstance
}

// ==================== 系统相关类型 ====================

export interface AppInfo {
  /** 应用名称 */
  name: string
  /** 应用版本 */
  version: string
  /** 运行平台 */
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

export interface SystemInfo {
  /** 操作系统平台 */
  platform: string
  /** CPU 核心数 */
  cpuCount: number
  /** 总内存（字节） */
  totalMemory: number
  /** 可用内存（字节） */
  freeMemory: number
  /** 主机名 */
  hostname: string
  /** 系统版本 */
  osVersion: string
  /** 用户主目录 */
  homeDir: string
}

/**
 * 系统信息 API 接口
 */
export interface SystemAPI {
  /** 获取应用信息 */
  getAppInfo: () => Promise<AppInfo>
  /** 获取系统信息 */
  getSystemInfo: () => Promise<SystemInfo>
  /** 获取应用程序目录（exe 同级目录） */
  getAppDirectory: () => Promise<string>
  /** 重启应用 */
  restart: () => void
  /** 退出应用 */
  quit: () => void
}

// ==================== 事件总线相关类型 ====================

/**
 * 事件总线 API 接口
 */
export interface EventBusAPI {
  /** 订阅事件 */
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void
  /** 订阅一次性事件 */
  once: <T = unknown>(event: string, callback: (data: T) => void) => void
  /** 发布事件 */
  emit: <T = unknown>(event: string, data?: T) => void
  /** 取消订阅 */
  off: (event: string, callback?: (data: unknown) => void) => void
  /** 清除所有事件监听 */
  clear: () => void
}

// ==================== Debug 相关类型 ====================

export interface DevToolsOptions {
  /** 打开位置 */
  mode?: 'right' | 'bottom' | 'undocked' | 'detach'
  /** 激活 */
  activate?: boolean
}

export interface PerformanceInfo {
  /** FPS */
  fps: number
  /** CPU 使用率 */
  cpuUsage: number
  /** 渲染时间 */
  renderTime: number
  /** 脚本执行时间 */
  scriptTime: number
  /** 布局时间 */
  layoutTime: number
}

export interface MemoryUsage {
  /** 总内存（字节） */
  total: number
  /** 已使用内存（字节） */
  used: number
  /** JavaScript 堆大小 */
  jsHeapSize: number
  /** JavaScript 堆限制 */
  jsHeapSizeLimit: number
  /** 系统可用内存 */
  availableMemory: number
}

/**
 * Debug API 接口
 */
export interface DebugAPI {
  /** 打开开发者工具 */
  openDevTools: (options?: DevToolsOptions) => void
  /** 关闭开发者工具 */
  closeDevTools: () => void
  /** 重新加载窗口 */
  reload: () => void
  /** 强制重新加载（清除缓存） */
  forceReload: () => void
  /** 获取性能信息 */
  getPerformance: () => Promise<PerformanceInfo>
  /** 获取内存使用情况 */
  getMemoryUsage: () => Promise<MemoryUsage>
  /** 开启/关闭性能监控 */
  togglePerformanceMonitor: (enabled: boolean) => void
  /** 清除应用缓存 */
  clearCache: () => Promise<void>
  /** 清除本地存储 */
  clearStorage: () => Promise<void>
  /** 导出日志 */
  exportLogs: () => Promise<string | null>
  /** 打开日志目录 */
  openLogDirectory: () => Promise<void>
  /** 显示应用信息 */
  showAppInfo: () => Promise<void>
}

// ==================== 全局 App API 类型 ====================

/**
 * 全局 App 对象接口
 */
export interface AppAPI {
  /** 窗口控制 */
  window: WindowAPI
  /** 消息通知 */
  message: MessageAPI
  /** 存储 */
  storage: StorageAPI
  /** 日志系统 */
  logger: LoggerAPI
  /** 对话框 */
  dialog: DialogAPI
  /** 通知 */
  notification: NotificationAPI
  /** 剪贴板 */
  clipboard: ClipboardAPI
  /** 文件操作 */
  file: FileAPI
  /** HTTP 请求 */
  http: HttpAPI
  /** 系统信息 */
  system: SystemAPI
  /** 事件总线 */
  eventBus: EventBusAPI
  /** Debug 调试工具 */
  debug: DebugAPI
  /** 应用版本 */
  version: string
  /** 是否开发环境 */
  isDev: boolean
  /** 调用exe API */
  callExe: (exeName: string, workingDir?: string) => Promise<callExeRes>
  /** 产品配置 */
  productConfig: ProductConfig
}

export interface callExeRes {
  /** 状态 */
  status: 'started' | 'exited' | 'failed_to_start' | 'failed' | 'close'
  /** 原因 */
  reason: string
  /** 进程ID */
  pid?: number
  /** 启动时间（仅在 started 状态下） */
  startTime?: string
  /** 结束时间（仅在 exited 状态下） */
  endTime?: string
  /** 运行时长（毫秒） */
  runTime?: number
  /** 是否成功退出 */
  isSuccess?: boolean
  code?: string
}

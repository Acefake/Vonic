import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import { WindowName } from '@/shared/constants'

// 重新导出共享类型
export { WindowName }

/**
 * 窗口配置接口
 */
export interface WindowConfig {
  /** 窗口名称 */
  windowName: WindowName
  /** 窗口标题 */
  title?: string
  /** 窗口宽度 */
  width: number
  /** 窗口高度（建议不超过 620，适配小屏幕笔记本） */
  height: number
  /** 是否模态窗口 */
  modal: boolean
  /** 是否懒加载（按需加载和销毁窗口） */
  lazy?: boolean
  /** 是否允许调整大小 */
  resizable?: boolean
  /** 是否显示到屏幕中央 */
  moveCenter?: boolean
  /** 是否单例（只允许打开一个实例） */
  singleton?: boolean
  /** 最大实例数量（0 表示无限制） */
  maxInstances?: number
  /** 加载的 URL 或文件路径 */
  url?: string
  /**
   * 路由路径（可选，Vue Router 路径）
   * 如果不指定，将根据窗口名称自动推导：
   * - WindowName.MAIN -> '/'
   * - WindowName.SETTING -> '/setting'
   * - WindowName.ABOUT -> '/about'
   */
  route?: string
  /** 是否设置父窗口 */
  setParent?: boolean
  /** 是否不显示布局组件（用于独立窗口如设置、加载等） */
  noLayout?: boolean
  /** Electron BrowserWindow 选项 */
  options?: BrowserWindowConstructorOptions
  /**
   * 自定义操作
   * @param config 当前窗口配置
   * @param win 当前窗口
   * @param parent 父窗口
   */
  operation?: (config: WindowConfig, win: BrowserWindow, parent?: BrowserWindow) => void
}

/**
 * 窗口实例信息
 */
export interface WindowInstance<T = unknown> {
  /** 窗口名称 */
  windowName: WindowName
  /** BrowserWindow 实例 */
  window: Electron.BrowserWindow
  /** 创建时间 */
  createdAt: Date
  /** 窗口自定义数据 */
  data?: T
  /** 父窗口 ID */
  parentId?: number
  /** Promise resolver（用于窗口关闭时返回结果） */
  resolver?: (value: unknown) => void
  /** Promise rejecter（用于窗口异常关闭） */
  rejecter?: (reason?: unknown) => void
}

/**
 * 窗口创建选项
 */
export interface CreateWindowOptions<T = unknown> {
  /** 自定义配置（覆盖默认配置） */
  config?: Partial<WindowConfig>
  /** 窗口自定义数据（会传递给渲染进程） */
  data?: T
  /** 父窗口（用于模态窗口） */
  parent?: BrowserWindow
  /** 父窗口 ID */
  parentId?: number
}

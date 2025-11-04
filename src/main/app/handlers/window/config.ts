import type { BrowserWindowConstructorOptions } from 'electron'
import type { WindowConfig } from './types'
import { join } from 'node:path'
// import { is } from '@electron-toolkit/utils'

import { WindowName } from '@/shared/constants'

export { WindowName }

/**
 * 浏览器窗口默认选项（BrowserWindowConstructorOptions）
 * 注意：不包含 modal 和 resizable，这些由 WindowConfig 的属性控制
 */
const browserWindowDefaultOptions: BrowserWindowConstructorOptions = {
  autoHideMenuBar: true,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: join(__dirname, '../preload/index.js'),
    devTools: true,
    webSecurity: false,
  },
}

/**
 * 主窗口默认选项
 * 主窗口和子窗口使用相同的 Electron 选项，区别在于 WindowConfig 属性
 */
const mainWindowOptions: BrowserWindowConstructorOptions = browserWindowDefaultOptions

/**
 * 子窗口默认选项
 * 子窗口和主窗口使用相同的 Electron 选项，区别在于 WindowConfig 属性
 */
const subWindowOptions: BrowserWindowConstructorOptions = browserWindowDefaultOptions

/**
 * WindowConfig 默认值（应用层配置）
 */
const defaultWindowConfig: Partial<WindowConfig> = {
  lazy: true,
  resizable: false,
  moveCenter: true,
  setParent: false,
}

/**
 * 子窗口默认选项
 */
const subWindowDefaultConfig: Partial<WindowConfig> = {
  lazy: true,
  resizable: false,
  moveCenter: true,
  setParent: true,
  noLayout: true,
  options: subWindowOptions,
}

/**
 * 窗口池配置数组
 * 统一管理所有窗口的配置信息
 */
export const windowConfig: WindowConfig[] = [
  {
    windowName: WindowName.MAIN,
    title: '多物理场数值模拟仿真计算',
    width: 1600,
    height: 900,
    modal: false,
    lazy: false,
    resizable: true,
    moveCenter: true,
    singleton: true,
    maxInstances: 1,
    options: { ...mainWindowOptions, frame: false },
  },
  {
    windowName: WindowName.LOADING,
    title: '加载中...',
    width: 400,
    height: 200,
    modal: true,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions, frame: false },
  },
  {
    windowName: WindowName.SETTINGS,
    title: '设置',
    width: 800,
    height: 600,
    modal: true,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
  {
    windowName: WindowName.WINDOW_EXAMPLE,
    title: '窗口示例',
    width: 800,
    height: 600,
    modal: true,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
  {
    windowName: WindowName.EMBEDDED,
    title: '嵌入窗口',
    width: 600,
    height: 400,
    modal: true,
    lazy: false,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
  {
    windowName: WindowName.ADD_DESIGN_FACTOR,
    title: '添加设计因子',
    width: 300,
    height: 600,
    modal: true,
    route: '/AddDesignFactor',
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
]

/**
 * 为每个窗口配置应用默认值
 * 只设置未明确指定的属性
 */
windowConfig.forEach((item) => {
  // 应用 WindowConfig 默认值
  if (item.lazy === undefined) {
    item.lazy = defaultWindowConfig.lazy
  }
  if (item.resizable === undefined) {
    item.resizable = defaultWindowConfig.resizable
  }
  if (item.moveCenter === undefined) {
    item.moveCenter = defaultWindowConfig.moveCenter
  }
  if (item.setParent === undefined) {
    item.setParent = defaultWindowConfig.setParent
  }

  // 确保 options 存在
  if (!item.options) {
    item.options = subWindowOptions
  }
})

/**
 * 窗口配置映射表（用于快速查找）
 */
const windowConfigMap = new Map<WindowName, WindowConfig>()
windowConfig.forEach((config) => {
  windowConfigMap.set(config.windowName, config)
})

/**
 * 获取窗口配置
 * @param windowName 窗口名称
 * @returns 窗口配置
 */
export function getWindowConfig(windowName: WindowName): WindowConfig | undefined {
  return windowConfigMap.get(windowName)
}

/**
 * 添加窗口配置（动态添加）
 * @param config 窗口配置
 */
export function addWindowConfig(config: WindowConfig): void {
  if (!windowConfigMap.has(config.windowName)) {
    windowConfig.push(config)
    windowConfigMap.set(config.windowName, config)
  }
}

/**
 * 获取所有窗口配置
 */
export function getAllWindowConfigs(): WindowConfig[] {
  return [...windowConfig]
}

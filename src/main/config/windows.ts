import type { BrowserWindowConstructorOptions } from 'electron'
import type { WindowConfig } from '@/main/core/window'
import { join } from 'node:path'
import { getProductConfig } from '@/config/product.config'
import { WindowName } from '@/shared/constants'

const browserWindowDefaultOptions: BrowserWindowConstructorOptions = {
  autoHideMenuBar: true,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: join(__dirname, '../preload/index.js'),
    devTools: true,
    webSecurity: false,
    zoomFactor: 1,
    partition: `persist:${getProductConfig().id}`,
  },
}

const mainWindowOptions: BrowserWindowConstructorOptions = browserWindowDefaultOptions
const subWindowOptions: BrowserWindowConstructorOptions = browserWindowDefaultOptions

const subWindowDefaultConfig: Omit<WindowConfig, 'windowName' | 'width' | 'height'> = {
  lazy: true,
  resizable: false,
  moveCenter: true,
  setParent: true,
  noLayout: true,
  options: subWindowOptions,
  modal: true,
}

export const windowConfigs: WindowConfig[] = [
  {
    windowName: WindowName.MAIN,
    title: '多物理场数值模拟仿真计算',
    modal: false,
    lazy: false,
    resizable: true,
    moveCenter: true,
    singleton: true,
    maxInstances: 1,
    width: 1600,
    height: 900,
    options: {
      ...mainWindowOptions,
      frame: false,
      minHeight: 900,
      minWidth: 1600,
    },
  },
  {
    windowName: WindowName.LOADING,
    title: '加载中...',
    width: 400,
    height: 200,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions, frame: false },
  },
  {
    windowName: WindowName.SETTINGS,
    title: '设置',
    width: 800,
    height: 600,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
  {
    windowName: WindowName.WINDOW_EXAMPLE,
    title: '窗口示例',
    width: 800,
    height: 600,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
  {
    windowName: WindowName.EMBEDDED,
    title: '嵌入窗口',
    width: 600,
    height: 400,
    lazy: false,
    ...subWindowDefaultConfig,
    options: { ...mainWindowOptions },
  },
  {
    windowName: WindowName.DASHBOARD,
    title: '仿真仪表盘',
    width: 800,
    height: 600,
    lazy: true,
    resizable: true,
    ...subWindowDefaultConfig,
    options: {
      ...subWindowDefaultConfig.options,
      frame: true, // Standard frame for a dashboard
      transparent: false,
    },
  },
  {
    windowName: WindowName.TOOLBAR,
    title: '浮动工具栏',
    width: 300,
    height: 60,
    lazy: true,
    resizable: false,
    moveCenter: false,
    setParent: true,
    noLayout: true,
    modal: false,
    options: {
      ...subWindowOptions,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
    },
  },
]

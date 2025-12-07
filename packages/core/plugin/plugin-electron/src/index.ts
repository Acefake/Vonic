/**
 * Vonic 插件核心功能与开发 SDK
 */

export * from './types'
export { PluginAPIImpl } from './api'
export type { PluginAPIConfig } from './api'
export { PluginManager } from './manager'
export type { PluginManagerConfig } from './manager'

import type { Plugin } from './types'

/** 定义插件的辅助函数 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin
}

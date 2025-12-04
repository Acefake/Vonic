/**
 * 插件 API 模块
 * @example
 * const plugin = app.plugin.get('popup-plugin')
 * plugin.command('openEditor')
 * plugin.on('result', handler)
 */

import type { PluginAPI, PluginInstance } from '../types'

const ipc = window.electron?.ipcRenderer

const cache = new Map<string, PluginInstance>()

function createInstance(pluginId: string): PluginInstance {
  const ns = `plugin:${pluginId}:`
  // 存储回调映射，用于正确移除监听器
  const listenerMap = new Map<(...args: any[]) => void, (...args: any[]) => void>()

  return {
    id: pluginId,
    getPath: () => ipc.invoke('plugin:getPath', pluginId),
    isActive: async () => {
      const list = await ipc.invoke('plugin:list')
      const plugin = list.find((p: any) => p.id === pluginId)
      return plugin?.enabled ?? false
    },
    onStateChange: (callback: (enabled: boolean) => void): (() => void) => {
      const onActivate = (_: any, data: { pluginId: string }): void => {
        if (data.pluginId === pluginId)
          callback(true)
      }
      const onDispose = (_: any, data: { pluginId: string }): void => {
        if (data.pluginId === pluginId)
          callback(false)
      }
      ipc.on('plugin:activated', onActivate)
      ipc.on('plugin:dispose', onDispose)
      return () => {
        ipc.removeListener('plugin:activated', onActivate)
        ipc.removeListener('plugin:dispose', onDispose)
      }
    },
    command: (cmd, ...args) => ipc.invoke(`command:${pluginId}.${cmd}`, ...args),
    invoke: (ch, ...args) => ipc.invoke(`${ns}${ch}`, ...args),
    on: (ch, cb) => {
      const channel = `${ns}${ch}`
      console.log('[Plugin] 注册监听:', channel)
      const wrapper = (_: any, ...args: any[]): void => {
        console.log('[Plugin] 收到消息:', channel, args)
        cb(...args)
      }
      listenerMap.set(cb, wrapper)
      ipc.on(channel, wrapper)
    },
    off: (ch, cb) => {
      const channel = `${ns}${ch}`
      const wrapper = listenerMap.get(cb)
      if (wrapper) {
        ipc.removeListener(channel, wrapper)
        listenerMap.delete(cb)
      }
    },
    enable: () => ipc.invoke('plugin:enable', pluginId),
    disable: () => ipc.invoke('plugin:disable', pluginId),
  }
}

export const pluginAPI: PluginAPI = {
  get: (pluginId: string) => {
    if (!cache.has(pluginId)) {
      cache.set(pluginId, createInstance(pluginId))
    }
    return cache.get(pluginId)!
  },
  list: () => ipc.invoke('plugin:list'),
  install: () => ipc.invoke('plugin:install'),
  loadDev: () => ipc.invoke('plugin:load-dev'),
}

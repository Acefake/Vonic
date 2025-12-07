/**
 * 插件 API 模块
 * @example
 * const plugin = app.plugin.get('popup-plugin')
 * plugin.command('openEditor')
 * plugin.on('result', handler)
 */

import type { PluginAPI, PluginInstance } from '../types'
import { getIPCRenderer, isElectron } from '../platform'

const ipc = getIPCRenderer()

const cache = new Map<string, PluginInstance>()

function createInstance(pluginId: string): PluginInstance {
  const ns = `plugin:${pluginId}:`
  const listenerMap = new Map<(...args: any[]) => void, (...args: any[]) => void>()

  return {
    id: pluginId,
    getPath: () => ipc.invoke('plugin:getPath', pluginId) as Promise<string | null>,
    isActive: async () => {
      if (!isElectron) return false
      const list = await ipc.invoke('plugin:list') as any[]
      const plugin = list.find((p: any) => p.id === pluginId)
      return plugin?.enabled ?? false
    },
    onStateChange: (callback: (enabled: boolean) => void): (() => void) => {
      if (!isElectron) return () => {}
      const onActivate = (_: unknown, ...args: unknown[]): void => {
        const data = args[0] as { pluginId: string }
        if (data.pluginId === pluginId) callback(true)
      }
      const onDispose = (_: unknown, ...args: unknown[]): void => {
        const data = args[0] as { pluginId: string }
        if (data.pluginId === pluginId) callback(false)
      }
      ipc.on('plugin:activated', onActivate)
      ipc.on('plugin:dispose', onDispose)
      return () => {
        ipc.removeListener('plugin:activated', onActivate as any)
        ipc.removeListener('plugin:dispose', onDispose as any)
      }
    },
    command: (cmd, ...args) => ipc.invoke(`command:${pluginId}.${cmd}`, ...args),
    invoke: (ch, ...args) => ipc.invoke(`${ns}${ch}`, ...args),
    on: (ch, cb) => {
      const channel = `${ns}${ch}`
      console.log('[Plugin] 注册监听:', channel)
      const wrapper = (_: unknown, ...args: unknown[]): void => {
        console.log('[Plugin] 收到消息:', channel, args)
        cb(...args)
      }
      listenerMap.set(cb, wrapper as any)
      ipc.on(channel, wrapper)
    },
    off: (ch, cb) => {
      const channel = `${ns}${ch}`
      const wrapper = listenerMap.get(cb)
      if (wrapper) {
        ipc.removeListener(channel, wrapper as any)
        listenerMap.delete(cb)
      }
    },
    enable: () => ipc.invoke('plugin:enable', pluginId) as Promise<void>,
    disable: () => ipc.invoke('plugin:disable', pluginId) as Promise<void>,
  }
}

export const pluginAPI: PluginAPI = {
  get: (pluginId: string) => {
    if (!cache.has(pluginId)) {
      cache.set(pluginId, createInstance(pluginId))
    }
    return cache.get(pluginId)!
  },
  list: () => ipc.invoke('plugin:list') as Promise<any[]>,
  install: () => ipc.invoke('plugin:install') as Promise<void>,
  loadDev: () => ipc.invoke('plugin:load-dev') as Promise<void>,
}

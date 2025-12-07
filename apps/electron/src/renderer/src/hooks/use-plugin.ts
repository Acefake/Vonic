/**
 * 单个插件 composable
 * @example
 * const { isActive, command, on } = usePlugin('popup-plugin')
 * await command('openEditor')
 * on('result', (data) => { ... })
 */

import type { Ref } from 'vue'
import type { PluginInstance } from '../app/types'
import { onMounted, onUnmounted, ref } from 'vue'

interface UsePluginReturn {
  isActive: Ref<boolean>
  path: Ref<string | null>
  command: PluginInstance['command']
  invoke: PluginInstance['invoke']
  on: (channel: string, handler: (...args: any[]) => void) => void
  enable: PluginInstance['enable']
  disable: PluginInstance['disable']
  plugin: PluginInstance
}

export function usePlugin(pluginId: string): UsePluginReturn {
  const plugin = app.plugin.get(pluginId)
  const isActive = ref(false)
  const path = ref<string | null>(null)

  // 存储监听器，用于自动清理
  const listeners: Array<{ channel: string, handler: (...args: any[]) => void }> = []
  let unsubscribeState: (() => void) | null = null

  onMounted(async () => {
    path.value = await plugin.getPath()
    isActive.value = await plugin.isActive()
    unsubscribeState = plugin.onStateChange((enabled) => {
      isActive.value = enabled
    })
  })

  onUnmounted(() => {
    unsubscribeState?.()
    // 自动清理所有监听器
    listeners.forEach(({ channel, handler }) => plugin.off(channel, handler))
  })

  return {
    /** 插件是否激活 */
    isActive,
    /** 插件路径 */
    path,
    /** 执行命令 */
    command: plugin.command,
    /** 调用 IPC */
    invoke: plugin.invoke,
    /** 监听消息（自动在组件卸载时清理） */
    on: (channel: string, handler: (...args: any[]) => void) => {
      plugin.on(channel, handler)
      listeners.push({ channel, handler })
    },
    /** 启用插件 */
    enable: plugin.enable,
    /** 禁用插件 */
    disable: plugin.disable,
    /** 原始插件实例 */
    plugin,
  }
}

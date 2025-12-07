/**
 * 待办清单
 */

import type { Plugin, PluginAPI } from '@vonic/plugin-electron'

let api: PluginAPI | null = null

const plugin: Plugin = {
  id: 'todo-list',
  name: '待办清单',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('待办清单已激活')

    // ===== 注册命令 =====
    api.commands.register('hello', '打招呼', async () => {
      api?.ui.showMessage('success', 'Hello from 待办清单!')
    })

    // ===== 注册自定义面板 =====
    api.panels.register({
      type: 'component',
      title: '待办清单',
      componentPath: 'Panel.vue',
    })

    // ===== IPC 接口 =====
    api.ipc.handle('getData', () => {
      return { message: 'Hello from todo-list' }
    })

    api.ui.showMessage('success', '待办清单已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('待办清单已停用')
    api = null
  },
}

export default plugin

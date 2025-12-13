/**
 * GitHub 跳转插件
 * 功能：快速跳转到 GitHub 官网
 */

import type { Plugin, PluginAPI } from '@vonic/plugin-electron'

let api: PluginAPI | null = null

const plugin: Plugin = {
  id: 'github-jump',
  name: 'GitHub 跳转',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('GitHub 跳转插件已激活')

    // ===== 注册命令 =====
    api.commands.register('open-github', '打开 GitHub', async () => {
      try {
        await api?.ui.openExternal('https://github.com')
        api?.logger.info('已打开 GitHub 官网')
      } catch (error) {
        api?.logger.error('打开 GitHub 失败:', error)
        api?.ui.showMessage('error', '打开 GitHub 失败')
      }
    })

    api.commands.register('open-github-trending', '打开 GitHub Trending', async () => {
      try {
        await api?.ui.openExternal('https://github.com/trending')
        api?.logger.info('已打开 GitHub Trending')
      } catch (error) {
        api?.logger.error('打开 GitHub Trending 失败:', error)
        api?.ui.showMessage('error', '打开 GitHub Trending 失败')
      }
    })

    api.commands.register('open-github-issues', '打开 GitHub Issues', async () => {
      try {
        await api?.ui.openExternal('https://github.com/trending')
        api?.logger.info('已打开 GitHub Issues')
      } catch (error) {
        api?.logger.error('打开 GitHub Issues 失败:', error)
        api?.ui.showMessage('error', '打开 GitHub Issues 失败')
      }
    })

    // ===== 注册侧边栏菜单 =====
    api.menus.registerSidebar([
      {
        id: 'github-jump',
        label: 'GitHub 跳转',
        icon: 'github',
        command: 'github-jump.open-tool-menu'
      }
    ])

    // ===== 注册工具菜单栏 =====
    api.views.register('github-jump.tool-menu', {
      title: 'GitHub 跳转',
      icon: 'github',
      type: 'modal',
      window: {
        width: 400,
        height: 300,
        resizable: false,
        modal: true
      }
    })

    // ===== 面板配置 =====
    api.panels.register({
      type: 'component',
      title: 'GitHub 跳转',
      componentPath: 'Panel.vue'
    })

    // ===== IPC 接口 =====
    api.ipc.handle('open-github', async () => {
      try {
        await api?.ui.openExternal('https://github.com')
        return { success: true, message: '已打开 GitHub' }
      } catch (error) {
        return { success: false, message: `打开失败: ${error}` }
      }
    })

    api.ui.showMessage('success', 'GitHub 跳转插件已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('GitHub 跳转插件已停用')
    api = null
  },
}

export default plugin
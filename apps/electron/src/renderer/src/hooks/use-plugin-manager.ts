import type { Ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ref } from 'vue'
import { getIPCRenderer, isElectron } from '../app/platform'
import { WebPluginManager } from '@vonic/plugin-web'

const ipc = getIPCRenderer()

// Web 端插件管理器单例
let webPluginManager: WebPluginManager | null = null
function getWebPluginManager(): WebPluginManager {
  if (!webPluginManager) {
    webPluginManager = new WebPluginManager()
  }
  return webPluginManager
}

export interface PluginInfo {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  enabled: boolean
  loaded: boolean
  isExternal?: boolean
  isDev?: boolean
  pluginPath?: string
}

// 全局共享状态
const plugins = ref<PluginInfo[]>([])
const loading = ref(false)

interface UsePluginManagerReturn {
  plugins: Ref<PluginInfo[]>
  loading: Ref<boolean>
  loadPlugins: () => Promise<void>
  togglePlugin: (pluginId: string, pluginName: string, enabled: boolean) => Promise<void>
  installPlugin: () => Promise<PluginInfo | null>
  uninstallPlugin: (pluginId: string, pluginName: string) => Promise<boolean>
  openPluginsDir: () => Promise<void>
  loadDevPlugin: () => Promise<{ manifest: PluginInfo, pluginPath: string } | null>
  reloadDevPlugin: (pluginId: string, pluginName: string) => Promise<void>
  unloadDevPlugin: (pluginId: string, pluginName: string) => Promise<boolean>
  getPluginReadme: (pluginId: string) => Promise<string | null>
}

export function usePluginManager(): UsePluginManagerReturn {
  // 加载插件列表
  async function loadPlugins(): Promise<void> {
    try {
      loading.value = true
      if (!isElectron) {
        const mgr = getWebPluginManager()
        await mgr.loadStoredPlugins()
        plugins.value = mgr.getAllPlugins()
        return
      }
      const result = await ipc.invoke('plugin:list') as PluginInfo[] | null
      plugins.value = result || []
    }
    catch (error) {
      console.error('Failed to load plugins:', error)
      plugins.value = []
    }
    finally {
      loading.value = false
    }
  }

  // 启用/禁用插件
  async function togglePlugin(pluginId: string, pluginName: string, enabled: boolean): Promise<void> {
    try {
      if (!isElectron) {
        const mgr = getWebPluginManager()
        if (enabled) {
          await mgr.activatePlugin(pluginId)
        }
        else {
          await mgr.deactivatePlugin(pluginId)
        }
      }
      else if (enabled) {
        await ipc.invoke('plugin:enable', pluginId)
      }
      else {
        await ipc.invoke('plugin:disable', pluginId)
      }
      message.success(`插件 ${pluginName} 已${enabled ? '启用' : '禁用'}`)
      await loadPlugins()
    }
    catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      message.error(`操作失败: ${errMsg}`)
      await loadPlugins()
    }
  }

  // 安装插件（从文件）
  async function installPlugin(): Promise<PluginInfo | null> {
    try {
      let result: PluginInfo | null = null
      if (!isElectron) {
        const mgr = getWebPluginManager()
        const manifest = await mgr.selectAndInstall()
        if (manifest) {
          result = {
            id: manifest.id,
            name: manifest.name,
            version: manifest.version,
            enabled: true,
            loaded: false,
          }
        }
      }
      else {
        result = await ipc.invoke('plugin:install') as PluginInfo | null
      }
      if (result) {
        message.success(`插件 ${result.name} v${result.version} 安装成功`)
        await loadPlugins()
        return result
      }
    }
    catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      message.error(`安装失败: ${errMsg}`)
    }
    return null
  }

  // 卸载插件
  async function uninstallPlugin(pluginId: string, pluginName: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认卸载',
        content: `确定要卸载插件 "${pluginName}" 吗？`,
        okText: '卸载',
        okType: 'danger',
        cancelText: '取消',
        async onOk() {
          try {
            if (!isElectron) {
              const mgr = getWebPluginManager()
              await mgr.uninstallPlugin(pluginId)
            }
            else {
              await ipc.invoke('plugin:uninstall', pluginId)
            }
            message.success(`插件 ${pluginName} 已卸载`)
            await loadPlugins()
            resolve(true)
          }
          catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            message.error(`卸载失败: ${errMsg}`)
            resolve(false)
          }
        },
        onCancel() {
          resolve(false)
        },
      })
    })
  }

  // 打开插件目录
  async function openPluginsDir(): Promise<void> {
    if (!isElectron) {
      message.info('Web 模式下插件存储在浏览器 IndexedDB 中')
      return
    }
    try {
      const dir = await ipc.invoke('plugin:get-dir')
      await ipc.invoke('shell:show-in-folder', dir)
    }
    catch {
      // ignore error
    }
  }

  // ===== 开发模式功能 =====

  // 加载开发插件
  async function loadDevPlugin(): Promise<{ manifest: PluginInfo, pluginPath: string } | null> {
    try {
      let result: { manifest: PluginInfo, pluginPath: string } | null = null
      if (!isElectron) {
        const mgr = getWebPluginManager()
        const manifest = await mgr.loadDevPlugin()
        if (manifest) {
          result = {
            manifest: {
              id: manifest.id,
              name: manifest.name,
              version: manifest.version,
              enabled: true,
              loaded: false,
              isDev: true,
            },
            pluginPath: 'web://dev',
          }
        }
      }
      else {
        result = await ipc.invoke('plugin:load-dev') as { manifest: PluginInfo, pluginPath: string } | null
      }
      if (result) {
        message.success(`开发插件 ${result.manifest.name} 已加载`)
        await loadPlugins()
        return result
      }
    }
    catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      message.error(`加载失败: ${errMsg}`)
    }
    return null
  }

  // 重新加载开发插件
  async function reloadDevPlugin(pluginId: string, pluginName: string): Promise<void> {
    try {
      if (!isElectron) {
        const mgr = getWebPluginManager()
        await mgr.reloadDevPlugin(pluginId)
      }
      else {
        await ipc.invoke('plugin:reload-dev', pluginId)
      }
      message.success(`插件 ${pluginName} 已重新加载`)
      await loadPlugins()
    }
    catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      message.error(`重载失败: ${errMsg}`)
    }
  }

  // 卸载开发插件
  async function unloadDevPlugin(pluginId: string, pluginName: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认卸载',
        content: `确定要卸载开发插件 "${pluginName}" 吗？`,
        okText: '卸载',
        okType: 'danger',
        cancelText: '取消',
        async onOk() {
          try {
            if (!isElectron) {
              const mgr = getWebPluginManager()
              await mgr.unloadDevPlugin(pluginId)
            }
            else {
              await ipc.invoke('plugin:unload-dev', pluginId)
            }
            message.success(`开发插件 ${pluginName} 已卸载`)
            await loadPlugins()
            resolve(true)
          }
          catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            message.error(`卸载失败: ${errMsg}`)
            resolve(false)
          }
        },
        onCancel() {
          resolve(false)
        },
      })
    })
  }

  async function getPluginReadme(pluginId: string): Promise<string | null> {
    try {
      if (!isElectron) {
        return null
      }
      return await ipc.invoke('plugin:getReadme', pluginId) as string | null
    }
    catch (error) {
      console.error(`Failed to get readme for plugin ${pluginId}:`, error)
      return null
    }
  }

  return {
    plugins,
    loading,
    loadPlugins,
    togglePlugin,
    installPlugin,
    uninstallPlugin,
    openPluginsDir,
    loadDevPlugin,
    reloadDevPlugin,
    unloadDevPlugin,
    getPluginReadme,
  }
}

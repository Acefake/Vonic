import type { Ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ref } from 'vue'

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
}

export function usePluginManager(): UsePluginManagerReturn {
  // 加载插件列表
  async function loadPlugins(): Promise<void> {
    try {
      loading.value = true
      plugins.value = await window.electron.ipcRenderer.invoke('plugin:list')
    }
    catch (error) {
      console.error('Failed to load plugins:', error)
    }
    finally {
      loading.value = false
    }
  }

  // 启用/禁用插件
  async function togglePlugin(pluginId: string, pluginName: string, enabled: boolean): Promise<void> {
    console.log(`[togglePlugin] ${pluginId}, enabled=${enabled}`)
    try {
      if (enabled) {
        await window.electron.ipcRenderer.invoke('plugin:enable', pluginId)
        message.success(`插件 ${pluginName} 已启用`)
      }
      else {
        await window.electron.ipcRenderer.invoke('plugin:disable', pluginId)
        message.success(`插件 ${pluginName} 已禁用`)
      }
      await loadPlugins()
    }
    catch (error: any) {
      console.error(`[togglePlugin] error:`, error)
      message.error(`操作失败: ${error.message || error}`)
      await loadPlugins()
    }
  }

  // 安装插件（从 zip）
  async function installPlugin(): Promise<PluginInfo | null> {
    try {
      const result = await window.electron.ipcRenderer.invoke('plugin:install')
      if (result) {
        message.success(`插件 ${result.name} v${result.version} 安装成功`)
        await loadPlugins()
        return result
      }
    }
    catch (error: any) {
      message.error(`安装失败: ${error.message || error}`)
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
            await window.electron.ipcRenderer.invoke('plugin:uninstall', pluginId)
            message.success(`插件 ${pluginName} 已卸载`)
            await loadPlugins()
            resolve(true)
          }
          catch (error: any) {
            message.error(`卸载失败: ${error.message || error}`)
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
    try {
      const dir = await window.electron.ipcRenderer.invoke('plugin:get-dir')
      await window.electron.ipcRenderer.invoke('shell:show-in-folder', dir)
    }
    catch (error) {
      console.error('Failed to open plugins directory:', error)
    }
  }

  // ===== 开发模式功能 =====

  // 加载开发插件
  async function loadDevPlugin(): Promise<{ manifest: PluginInfo, pluginPath: string } | null> {
    try {
      const result = await window.electron.ipcRenderer.invoke('plugin:load-dev')
      if (result) {
        message.success(`开发插件 ${result.manifest.name} 已加载`)
        await loadPlugins()
        return result
      }
    }
    catch (error: any) {
      message.error(`加载失败: ${error.message || error}`)
    }
    return null
  }

  // 重新加载开发插件
  async function reloadDevPlugin(pluginId: string, pluginName: string): Promise<void> {
    try {
      await window.electron.ipcRenderer.invoke('plugin:reload-dev', pluginId)
      message.success(`插件 ${pluginName} 已重新加载`)
      await loadPlugins()
    }
    catch (error: any) {
      message.error(`重载失败: ${error.message || error}`)
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
            await window.electron.ipcRenderer.invoke('plugin:unload-dev', pluginId)
            message.success(`开发插件 ${pluginName} 已卸载`)
            await loadPlugins()
            resolve(true)
          }
          catch (error: any) {
            message.error(`卸载失败: ${error.message || error}`)
            resolve(false)
          }
        },
        onCancel() {
          resolve(false)
        },
      })
    })
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
  }
}

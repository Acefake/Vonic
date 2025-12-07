/**
 * Web 端插件管理器
 * 支持 IndexedDB 存储和本地文件安装
 */
import type {
  Plugin,
  PluginInfo,
  PluginManifest,
  PluginState,
} from './types'
import { WebPluginAPI } from './api'

const DB_NAME = 'vonic-plugins'
const STORE_NAME = 'plugins'
const DB_VERSION = 1

/** 插件存储结构 */
interface StoredPlugin {
  id: string
  manifest: PluginManifest
  code: string
  enabled: boolean
  installedAt: number
}

export interface WebPluginManagerConfig {
  onMessage?: (channel: string, ...args: unknown[]) => void
}

export class WebPluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private pluginAPIs: Map<string, WebPluginAPI> = new Map()
  private pluginStates: Map<string, PluginState> = new Map()
  private storedPlugins: Map<string, StoredPlugin> = new Map()
  private config: WebPluginManagerConfig
  private dbReady: Promise<IDBDatabase>

  constructor(config: WebPluginManagerConfig = {}) {
    this.config = config
    this.dbReady = this.openDB()
    this.loadPersistedStates()
  }

  /** 打开 IndexedDB */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  /** 从 IndexedDB 加载所有插件 */
  public async loadStoredPlugins(): Promise<void> {
    const db = await this.dbReady
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const plugins = request.result as StoredPlugin[]
        for (const p of plugins) {
          this.storedPlugins.set(p.id, p)
          this.pluginStates.set(p.id, { enabled: p.enabled, loaded: false })
        }
        resolve()
      }
    })
  }

  /** 从本地文件安装插件 */
  public async installFromFile(file: File): Promise<PluginManifest> {
    const text = await file.text()
    let manifest: PluginManifest
    let code = ''

    if (file.name.endsWith('.json')) {
      manifest = JSON.parse(text)
    }
    else if (file.name.endsWith('.js')) {
      const match = text.match(/\/\*\*\s*@manifest\s*([\s\S]*?)\*\//)
      if (match) {
        manifest = JSON.parse(match[1])
      }
      else {
        manifest = {
          id: file.name.replace('.js', ''),
          name: file.name.replace('.js', ''),
          version: '1.0.0',
          main: file.name,
        }
      }
      code = text
    }
    else {
      throw new Error('不支持的文件格式，请选择 .js 或 .json 文件')
    }

    const stored: StoredPlugin = {
      id: manifest.id,
      manifest,
      code,
      enabled: true,
      installedAt: Date.now(),
    }

    const db = await this.dbReady
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(stored)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })

    this.storedPlugins.set(manifest.id, stored)
    this.pluginStates.set(manifest.id, { enabled: true, loaded: false })
    return manifest
  }

  /** 卸载插件 */
  public async uninstallPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId)
    const db = await this.dbReady
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(pluginId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
    this.storedPlugins.delete(pluginId)
    this.plugins.delete(pluginId)
    this.pluginStates.delete(pluginId)
  }

  /** 选择并安装本地插件文件 */
  public selectAndInstall(): Promise<PluginManifest | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.js,.json,.vpkg'
      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          try {
            const result = await this.installFromFile(input.files[0])
            resolve(result)
          }
          catch (error) {
            console.error('安装失败:', error)
            resolve(null)
          }
        }
        else {
          resolve(null)
        }
      }
      input.oncancel = () => resolve(null)
      input.click()
    })
  }

  public async registerPlugin(plugin: Plugin): Promise<void> {
    this.plugins.set(plugin.id, plugin)
    if (!this.pluginStates.has(plugin.id)) {
      this.pluginStates.set(plugin.id, { enabled: false, loaded: false })
    }
  }

  public async activatePlugin(pluginId: string): Promise<void> {
    const state = this.pluginStates.get(pluginId)
    if (!state) throw new Error(`插件未找到: ${pluginId}`)
    if (state.loaded) return
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`插件未注册: ${pluginId}`)
    const api = new WebPluginAPI({
      pluginId,
      onMessage: this.config.onMessage,
    })
    this.pluginAPIs.set(pluginId, api)
    try {
      await plugin.activate(api)
      state.enabled = true
      state.loaded = true
      this.savePluginStates()
      window.dispatchEvent(new CustomEvent('plugin:activated', { detail: { pluginId } }))
    }
    catch (error) {
      api.dispose()
      this.pluginAPIs.delete(pluginId)
      throw error
    }
  }

  public async deactivatePlugin(pluginId: string): Promise<void> {
    const state = this.pluginStates.get(pluginId)
    if (!state?.enabled) return
    const plugin = this.plugins.get(pluginId)
    const api = this.pluginAPIs.get(pluginId)
    try {
      await plugin?.deactivate?.()
    }
    catch (error) {
      console.error(`Error deactivating plugin ${pluginId}:`, error)
    }
    api?.dispose()
    this.pluginAPIs.delete(pluginId)
    state.enabled = false
    state.loaded = false
    this.savePluginStates()
  }

  public getAllPlugins(): PluginInfo[] {
    const result: PluginInfo[] = []
    // 从存储的插件中获取
    for (const [id, stored] of this.storedPlugins.entries()) {
      const state = this.pluginStates.get(id)
      result.push({
        id: stored.manifest.id,
        name: stored.manifest.name,
        version: stored.manifest.version,
        author: stored.manifest.author,
        description: stored.manifest.description,
        enabled: state?.enabled ?? false,
        loaded: state?.loaded ?? false,
      })
    }
    // 从注册的插件中获取（开发插件）
    for (const [id, plugin] of this.plugins.entries()) {
      if (!this.storedPlugins.has(id)) {
        const state = this.pluginStates.get(id)
        result.push({
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          author: plugin.author,
          description: plugin.description,
          enabled: state?.enabled ?? false,
          loaded: state?.loaded ?? false,
          isDev: true,
        })
      }
    }
    return result
  }

  /** 加载开发插件（从文件选择） */
  public async loadDevPlugin(): Promise<PluginManifest | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.js'
      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          try {
            const file = input.files[0]
            const text = await file.text()
            const match = text.match(/\/\*\*\s*@manifest\s*([\s\S]*?)\*\//)
            let manifest: PluginManifest
            if (match) {
              manifest = JSON.parse(match[1])
            }
            else {
              manifest = {
                id: `dev-${file.name.replace('.js', '')}`,
                name: file.name.replace('.js', ''),
                version: '0.0.0-dev',
                main: file.name,
              }
            }
            // 存储开发插件代码到 sessionStorage（临时）
            sessionStorage.setItem(`dev-plugin:${manifest.id}`, text)
            this.pluginStates.set(manifest.id, { enabled: true, loaded: false })
            resolve(manifest)
          }
          catch (error) {
            console.error('加载开发插件失败:', error)
            resolve(null)
          }
        }
        else {
          resolve(null)
        }
      }
      input.oncancel = () => resolve(null)
      input.click()
    })
  }

  /** 重新加载开发插件 */
  public async reloadDevPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId)
    // 重新激活
    const code = sessionStorage.getItem(`dev-plugin:${pluginId}`)
    if (code) {
      console.log(`[Web] 重新加载开发插件: ${pluginId}`)
      // 这里可以重新执行插件代码
    }
  }

  /** 卸载开发插件 */
  public async unloadDevPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId)
    sessionStorage.removeItem(`dev-plugin:${pluginId}`)
    this.plugins.delete(pluginId)
    this.pluginStates.delete(pluginId)
  }

  public getPluginAPI(pluginId: string): WebPluginAPI | undefined {
    return this.pluginAPIs.get(pluginId)
  }

  public async loadPluginFromUrl(url: string): Promise<PluginManifest> {
    const response = await fetch(url)
    const manifest = await response.json() as PluginManifest
    return manifest
  }

  private loadPersistedStates(): void {
    try {
      const saved = localStorage.getItem('plugin_states')
      if (saved) {
        const states = JSON.parse(saved) as Record<string, { enabled: boolean }>
        for (const [id, state] of Object.entries(states)) {
          this.pluginStates.set(id, { enabled: state.enabled, loaded: false })
        }
      }
    }
    catch {
      console.error('Failed to load plugin states')
    }
  }

  private savePluginStates(): void {
    const states: Record<string, { enabled: boolean }> = {}
    for (const [id, state] of this.pluginStates.entries()) {
      states[id] = { enabled: state.enabled }
    }
    localStorage.setItem('plugin_states', JSON.stringify(states))
  }

  public handleMessage(channel: string, ...args: unknown[]): unknown {
    for (const api of this.pluginAPIs.values()) {
      const result = api.handleMessage(channel, ...args)
      if (result !== undefined) return result
    }
    return undefined
  }
}

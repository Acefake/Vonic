/**
 * 插件管理器
 */
import type {
  DevPluginEntry,
  ElectronDeps,
  ExternalPluginEntry,
  Logger,
  Plugin,
  PluginInfo,
  PluginManifest,
  PluginState,
  Storage,
} from './types'
import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import * as vm from 'node:vm'
import { transform } from 'sucrase'
import { Extract } from 'unzipper'
import { PluginAPIImpl } from './api'
import { PluginType } from './types'

const VPKG_MAGIC = Buffer.from([0x56, 0x50, 0x4B, 0x47, 0x00, 0x01])

export interface PluginManagerConfig {
  electron: ElectronDeps
  logger: Logger
  storage: Storage
  isDev: boolean
  rendererUrl?: string
  preloadPath?: string
  rendererHtmlPath?: string
  devPluginsDir?: string
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private pluginAPIs: Map<string, PluginAPIImpl> = new Map()
  private pluginStates: Map<string, PluginState> = new Map()
  private externalPlugins: Map<string, ExternalPluginEntry> = new Map()
  private devPlugins: Map<string, DevPluginEntry> = new Map()
  private pluginsDir: string = ''
  private config: PluginManagerConfig

  constructor(config: PluginManagerConfig) {
    this.config = config
    this.pluginsDir = path.join(config.electron.app.getPath('userData'), 'plugins')
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true })
    }
  }

  public initHandlers(): void {
    this.initIPCHandlers()
    this.loadPersistedStates()
    this.scanInstalledPlugins()
    if (this.config.isDev && this.config.devPluginsDir) {
      this.scanDevPlugins()
    }
  }

  private scanDevPlugins(): void {
    const devDir = this.config.devPluginsDir
    if (!devDir || !fs.existsSync(devDir)) return
    try {
      for (const dir of fs.readdirSync(devDir)) {
        const pluginPath = path.join(devDir, dir)
        if (!fs.statSync(pluginPath).isDirectory()) continue
        const manifestPath = path.join(pluginPath, 'manifest.json')
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
            this.devPlugins.set(manifest.id, { manifest, pluginPath })
            if (!this.pluginStates.has(manifest.id)) {
              this.pluginStates.set(manifest.id, { enabled: false, loaded: false })
            }
            this.config.logger.info(`Scanned dev plugin: ${manifest.id} from ${pluginPath}`)
          }
          catch {
            this.config.logger.error(`Failed to parse dev plugin manifest in ${dir}`)
          }
        }
      }
    }
    catch (error) {
      this.config.logger.error('Failed to scan dev plugins:', error)
    }
  }

  public async activateEnabledPlugins(): Promise<void> {
    for (const [pluginId, state] of this.pluginStates.entries()) {
      const isRegistered = this.devPlugins.has(pluginId) || this.externalPlugins.has(pluginId)
      if (state.enabled && !state.loaded && isRegistered) {
        try {
          await this.activatePlugin(pluginId)
        }
        catch (error) {
          this.config.logger.error(`Failed to auto-activate plugin ${pluginId}:`, error)
        }
      }
    }
  }

  public getPluginType(pluginId: string): PluginType | null {
    if (this.devPlugins.has(pluginId)) return PluginType.DEV
    if (this.externalPlugins.has(pluginId)) return PluginType.EXTERNAL
    if (this.plugins.has(pluginId)) return PluginType.BUILTIN
    return null
  }

  public async installPlugin(vpkgPath: string): Promise<PluginManifest> {
    this.config.logger.info(`Installing plugin from: ${vpkgPath}`)
    const tempDir = path.join(this.pluginsDir, `_temp_${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })
    try {
      const fileData = fs.readFileSync(vpkgPath)
      if (!vpkgPath.endsWith('.vpkg')) {
        throw new Error('不支持的文件格式，请使用 .vpkg 插件包')
      }
      if (fileData.length < VPKG_MAGIC.length) {
        throw new Error('无效的 .vpkg 文件：文件过小')
      }
      const magic = fileData.subarray(0, VPKG_MAGIC.length)
      if (!magic.equals(VPKG_MAGIC)) {
        throw new Error('无效的 .vpkg 文件：不是有效的 Vonic 插件包')
      }
      const zipData = fileData.subarray(VPKG_MAGIC.length)
      await new Promise<void>((resolve, reject) => {
        Readable.from(zipData).pipe(Extract({ path: tempDir })).on('close', resolve).on('error', reject)
      })
      const manifestPath = this.findManifest(tempDir)
      if (!manifestPath) throw new Error('插件包中未找到 manifest.json')
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
        throw new Error('manifest.json 缺少必要字段')
      }
      if (this.externalPlugins.has(manifest.id)) {
        await this.uninstallPlugin(manifest.id)
      }
      const pluginRoot = path.dirname(manifestPath)
      const targetDir = path.join(this.pluginsDir, manifest.id)
      if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true })
      fs.renameSync(pluginRoot, targetDir)
      this.externalPlugins.set(manifest.id, { manifest, pluginPath: targetDir })
      this.pluginStates.set(manifest.id, { enabled: false, loaded: false })
      this.config.logger.info(`Plugin installed: ${manifest.id} v${manifest.version}`)
      return manifest
    }
    finally {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }

  public async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.externalPlugins.get(pluginId)
    if (!plugin) throw new Error(`插件未找到: ${pluginId}`)
    await this.deactivatePlugin(pluginId)
    if (fs.existsSync(plugin.pluginPath)) {
      fs.rmSync(plugin.pluginPath, { recursive: true, force: true })
    }
    this.externalPlugins.delete(pluginId)
    this.plugins.delete(pluginId)
    this.pluginAPIs.delete(pluginId)
    this.pluginStates.delete(pluginId)
    this.savePluginStates()
    this.config.logger.info(`Plugin uninstalled: ${pluginId}`)
  }

  public async activatePlugin(pluginId: string): Promise<void> {
    const state = this.pluginStates.get(pluginId)
    if (!state) throw new Error(`插件未找到: ${pluginId}`)
    if (state.loaded) return
    // 清理可能残留的旧 API 实例
    const existingApi = this.pluginAPIs.get(pluginId)
    if (existingApi) {
      existingApi.dispose()
      this.pluginAPIs.delete(pluginId)
    }
    if (!this.plugins.has(pluginId)) {
      await this.loadPluginModule(pluginId)
    }
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`插件加载失败: ${pluginId}`)
    const api = new PluginAPIImpl({
      pluginId,
      electron: this.config.electron,
      logger: this.config.logger,
      storage: this.config.storage,
      isDev: this.config.isDev,
      rendererUrl: this.config.rendererUrl,
      preloadPath: this.config.preloadPath,
      rendererHtmlPath: this.config.rendererHtmlPath,
    })
    this.pluginAPIs.set(pluginId, api)
    try {
      await plugin.activate(api)
      state.enabled = true
      state.loaded = true
      this.savePluginStates()
      this.config.electron.BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send('plugin:activated', { pluginId })
      })
      this.config.logger.info(`Plugin activated: ${pluginId}`)
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
      this.config.logger.error(`Error deactivating plugin ${pluginId}:`, error)
    }
    api?.dispose()
    this.pluginAPIs.delete(pluginId)
    state.enabled = false
    state.loaded = false
    this.savePluginStates()
    this.config.logger.info(`Plugin deactivated: ${pluginId}`)
  }

  private async loadPluginModule(pluginId: string): Promise<void> {
    let pluginPath: string
    let manifest: PluginManifest
    const devPlugin = this.devPlugins.get(pluginId)
    const externalPlugin = this.externalPlugins.get(pluginId)
    if (devPlugin) {
      pluginPath = devPlugin.pluginPath
      manifest = devPlugin.manifest
    }
    else if (externalPlugin) {
      pluginPath = externalPlugin.pluginPath
      manifest = externalPlugin.manifest
    }
    else {
      throw new Error(`插件未注册: ${pluginId}`)
    }
    const mainPath = path.join(pluginPath, manifest.main)
    if (!fs.existsSync(mainPath)) throw new Error(`入口文件不存在: ${mainPath}`)
    let pluginModule: Record<string, unknown>
    if (mainPath.endsWith('.ts')) {
      const tsCode = fs.readFileSync(mainPath, 'utf-8')
      const result = transform(tsCode, { transforms: ['typescript', 'imports'], filePath: mainPath })
      const moduleExports = { exports: {} as Record<string, unknown> }
      const moduleRequire = (id: string): unknown => {
        if (id.startsWith('./') || id.startsWith('../')) {
          return require(path.resolve(path.dirname(mainPath), id))
        }
        return require(id)
      }
      const script = new vm.Script(result.code, { filename: mainPath })
      const context = vm.createContext({
        module: moduleExports, exports: moduleExports.exports, require: moduleRequire,
        __filename: mainPath, __dirname: path.dirname(mainPath),
        console, process, Buffer, setTimeout, setInterval, clearTimeout, clearInterval,
      })
      script.runInContext(context)
      pluginModule = moduleExports.exports
    }
    else {
      const jsCode = fs.readFileSync(mainPath, 'utf-8')
      const moduleExports = { exports: {} as Record<string, unknown> }
      const moduleRequire = (id: string): unknown => {
        if (id.startsWith('./') || id.startsWith('../')) {
          const resolvedPath = path.resolve(path.dirname(mainPath), id)
          delete require.cache[require.resolve(resolvedPath)]
          return require(resolvedPath)
        }
        return require(id)
      }
      const script = new vm.Script(jsCode, { filename: mainPath })
      const context = vm.createContext({
        module: moduleExports, exports: moduleExports.exports, require: moduleRequire,
        __filename: mainPath, __dirname: path.dirname(mainPath),
        console, process, Buffer, setTimeout, setInterval, clearTimeout, clearInterval,
      })
      script.runInContext(context)
      pluginModule = moduleExports.exports
    }
    const plugin = (pluginModule.default || pluginModule) as Plugin
    plugin.id = plugin.id || manifest.id
    plugin.name = plugin.name || manifest.name
    plugin.version = plugin.version || manifest.version
    this.plugins.set(pluginId, plugin)
    this.config.logger.info(`Plugin module loaded: ${pluginId}`)
  }

  public async loadDevPlugin(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) throw new Error('manifest.json 不存在')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
    if (this.devPlugins.has(manifest.id)) await this.unloadDevPlugin(manifest.id)
    this.devPlugins.set(manifest.id, { manifest, pluginPath })
    this.pluginStates.set(manifest.id, { enabled: false, loaded: false })
    this.config.logger.info(`Dev plugin loaded: ${manifest.id}`)
    return manifest
  }

  public async unloadDevPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId)
    this.devPlugins.delete(pluginId)
    this.plugins.delete(pluginId)
    this.pluginStates.delete(pluginId)
    this.config.logger.info(`Dev plugin unloaded: ${pluginId}`)
  }

  public async reloadDevPlugin(pluginId: string): Promise<void> {
    const devPlugin = this.devPlugins.get(pluginId)
    if (!devPlugin) throw new Error(`开发插件未找到: ${pluginId}`)
    const wasEnabled = this.pluginStates.get(pluginId)?.enabled
    await this.deactivatePlugin(pluginId)
    this.plugins.delete(pluginId)
    const manifestPath = path.join(devPlugin.pluginPath, 'manifest.json')
    devPlugin.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    if (wasEnabled) await this.activatePlugin(pluginId)
    this.config.logger.info(`Dev plugin reloaded: ${pluginId}`)
  }

  public getAllPlugins(): PluginInfo[] {
    const result: PluginInfo[] = []
    for (const [id, plugin] of this.plugins.entries()) {
      const state = this.pluginStates.get(id)!
      result.push({
        id: plugin.id, name: plugin.name, version: plugin.version, author: plugin.author, description: plugin.description,
        enabled: state.enabled, loaded: state.loaded, isExternal: this.externalPlugins.has(id), isDev: this.devPlugins.has(id),
      })
    }
    for (const [id, { manifest, pluginPath }] of this.externalPlugins.entries()) {
      if (!this.plugins.has(id)) {
        const state = this.pluginStates.get(id) || { enabled: false, loaded: false }
        result.push({
          id: manifest.id, name: manifest.name, version: manifest.version, author: manifest.author, description: manifest.description,
          enabled: state.enabled, loaded: state.loaded, isExternal: true, pluginPath,
        })
      }
    }
    for (const [id, { manifest, pluginPath }] of this.devPlugins.entries()) {
      if (!this.plugins.has(id)) {
        const state = this.pluginStates.get(id) || { enabled: false, loaded: false }
        result.push({
          id: manifest.id, name: manifest.name, version: manifest.version, author: manifest.author, description: manifest.description,
          enabled: state.enabled, loaded: state.loaded, isDev: true, pluginPath,
        })
      }
    }
    return result
  }

  public getPluginsDir(): string {
    return this.pluginsDir
  }

  private findManifest(dir: string): string | null {
    const rootManifest = path.join(dir, 'manifest.json')
    if (fs.existsSync(rootManifest)) return rootManifest
    for (const item of fs.readdirSync(dir)) {
      const itemPath = path.join(dir, item)
      if (fs.statSync(itemPath).isDirectory()) {
        const subManifest = path.join(itemPath, 'manifest.json')
        if (fs.existsSync(subManifest)) return subManifest
      }
    }
    return null
  }

  private scanInstalledPlugins(): void {
    try {
      for (const dir of fs.readdirSync(this.pluginsDir)) {
        if (dir.startsWith('_temp_')) continue
        const pluginPath = path.join(this.pluginsDir, dir)
        const manifestPath = path.join(pluginPath, 'manifest.json')
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
            this.externalPlugins.set(manifest.id, { manifest, pluginPath })
            if (!this.pluginStates.has(manifest.id)) {
              this.pluginStates.set(manifest.id, { enabled: false, loaded: false })
            }
            this.config.logger.info(`Scanned plugin: ${manifest.id}`)
          }
          catch {
            this.config.logger.error(`Failed to parse manifest in ${dir}`)
          }
        }
      }
    }
    catch (error) {
      this.config.logger.error('Failed to scan plugins:', error)
    }
  }

  private loadPersistedStates(): void {
    const saved = this.config.storage.get<Record<string, { enabled: boolean }>>('plugin_states', {})
    for (const [id, state] of Object.entries(saved)) {
      this.pluginStates.set(id, { enabled: state.enabled, loaded: false })
    }
  }

  private savePluginStates(): void {
    const states: Record<string, { enabled: boolean }> = {}
    for (const [id, state] of this.pluginStates.entries()) {
      states[id] = { enabled: state.enabled }
    }
    this.config.storage.set('plugin_states', states)
  }

  private initIPCHandlers(): void {
    const { ipcMain, dialog } = this.config.electron
    ipcMain.handle('plugin:list', () => this.getAllPlugins())
    ipcMain.handle('plugin:enable', async (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      await this.activatePlugin(pluginId)
    })
    ipcMain.handle('plugin:disable', async (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      await this.deactivatePlugin(pluginId)
    })
    ipcMain.handle('plugin:install', async () => {
      const result = await dialog.showOpenDialog({
        title: '选择插件包',
        filters: [{ name: 'Vonic 插件包', extensions: ['vpkg'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths.length) return null
      return await this.installPlugin(result.filePaths[0])
    })
    ipcMain.handle('plugin:uninstall', async (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      await this.uninstallPlugin(pluginId)
    })
    ipcMain.handle('plugin:get-dir', () => this.pluginsDir)
    ipcMain.handle('plugin:load-dev', async () => {
      const result = await dialog.showOpenDialog({ title: '选择插件目录', properties: ['openDirectory'] })
      if (result.canceled || !result.filePaths.length) return null
      const manifest = await this.loadDevPlugin(result.filePaths[0])
      return { manifest, pluginPath: result.filePaths[0] }
    })
    ipcMain.handle('plugin:unload-dev', async (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      await this.unloadDevPlugin(pluginId)
    })
    ipcMain.handle('plugin:reload-dev', async (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      await this.reloadDevPlugin(pluginId)
    })
    ipcMain.handle('plugin:readFile', async (_, ...args: unknown[]) => {
      const filePath = args[0] as string
      try {
        const normalizedPath = path.normalize(filePath)
        const isDevPlugin = Array.from(this.devPlugins.values()).some(p => normalizedPath.startsWith(path.normalize(p.pluginPath)))
        const isExternalPlugin = Array.from(this.externalPlugins.values()).some(p => normalizedPath.startsWith(path.normalize(p.pluginPath)))
        if (!isDevPlugin && !isExternalPlugin && !normalizedPath.startsWith(this.pluginsDir)) {
          throw new Error('不允许访问插件目录外的文件')
        }
        return fs.readFileSync(filePath, 'utf-8')
      }
      catch (e) {
        this.config.logger.error(`Failed to read plugin file: ${filePath}`, e)
        throw e
      }
    })
    ipcMain.handle('plugin:getPath', (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      const dev = this.devPlugins.get(pluginId)
      if (dev) return dev.pluginPath
      const ext = this.externalPlugins.get(pluginId)
      if (ext) return ext.pluginPath
      return null
    })
    ipcMain.handle('plugin:getReadme', (_, ...args: unknown[]) => {
      const pluginId = args[0] as string
      const dev = this.devPlugins.get(pluginId)
      const ext = this.externalPlugins.get(pluginId)
      const pluginPath = dev?.pluginPath ?? ext?.pluginPath
      if (!pluginPath) return null
      const readmeNames = ['README.md', 'readme.md', 'Readme.md', 'README.MD']
      for (const name of readmeNames) {
        const readmePath = path.join(pluginPath, name)
        if (fs.existsSync(readmePath)) {
          return fs.readFileSync(readmePath, 'utf-8')
        }
      }
      return null
    })
    ipcMain.handle('plugin:sync-ui', () => {
      const result: { menus: { pluginId: string, items: unknown[] }[], panels: { pluginId: string, panel: unknown }[] } = { menus: [], panels: [] }
      for (const [pluginId, api] of this.pluginAPIs.entries()) {
        const state = this.pluginStates.get(pluginId)
        if (!state?.enabled || !state?.loaded) continue
        const menus = api.getRegisteredMenus()
        if (menus.length > 0) result.menus.push({ pluginId, items: menus })
        const panel = api.getRegisteredPanel()
        if (panel) result.panels.push({ pluginId, panel })
      }
      this.config.logger.info(`Syncing UI state: ${result.menus.length} menus, ${result.panels.length} panels`)
      return result
    })
  }
}

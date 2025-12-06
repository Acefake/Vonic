import type {
  DevPluginEntry,
  ExternalPluginEntry,
  Plugin,
  PluginInfo,
  PluginManifest,
  PluginState,
} from './types'
import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import * as vm from 'node:vm'

// Vonic 插件包魔数头 (6 字节)
const VPKG_MAGIC = Buffer.from([0x56, 0x50, 0x4B, 0x47, 0x00, 0x01]) // 'VPKG' + version 1
/**
 * 插件管理器
 * 负责插件的安装、激活、停用、卸载
 */
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { transform } from 'sucrase'
import { Extract } from 'unzipper'
import { logger } from '../logger'
import store from '../store'
import { PluginAPI } from './api'
import { PluginType } from './types'

export class PluginManager {
  private static instance: PluginManager | null = null

  private plugins: Map<string, Plugin> = new Map()
  private pluginAPIs: Map<string, PluginAPI> = new Map()
  private pluginStates: Map<string, PluginState> = new Map()
  private externalPlugins: Map<string, ExternalPluginEntry> = new Map()
  private devPlugins: Map<string, DevPluginEntry> = new Map()
  private pluginsDir: string = ''

  private constructor() {
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins')
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true })
    }
  }

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager()
    }
    return PluginManager.instance
  }

  public async init(): Promise<void> {
    this.initIPCHandlers()
    this.loadPersistedStates()
    this.scanInstalledPlugins()
    await this.autoActivatePlugins()
    logger.info('PluginManager initialized')
  }

  public initHandlers(): void {
    this.initIPCHandlers()
    this.loadPersistedStates()
    this.scanInstalledPlugins()
  }

  public async activateEnabledPlugins(): Promise<void> {
    await this.autoActivatePlugins()
  }

  /** 自动激活已启用的插件 */
  private async autoActivatePlugins(): Promise<void> {
    for (const [pluginId, state] of this.pluginStates.entries()) {
      // 只激活已注册且启用的插件
      const isRegistered = this.devPlugins.has(pluginId) || this.externalPlugins.has(pluginId)
      if (state.enabled && !state.loaded && isRegistered) {
        try {
          await this.activatePlugin(pluginId)
        }
        catch (error) {
          logger.error(`Failed to auto-activate plugin ${pluginId}:`, error)
        }
      }
    }
  }

  public getPluginType(pluginId: string): PluginType | null {
    if (this.devPlugins.has(pluginId))
      return PluginType.DEV
    if (this.externalPlugins.has(pluginId))
      return PluginType.EXTERNAL
    if (this.plugins.has(pluginId))
      return PluginType.BUILTIN
    return null
  }

  public async installPlugin(vpkgPath: string): Promise<PluginManifest> {
    logger.info(`Installing plugin from: ${vpkgPath}`)
    const tempDir = path.join(this.pluginsDir, `_temp_${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    try {
      // 读取文件并验证魔数头
      const fileData = fs.readFileSync(vpkgPath)
      const isVpkg = vpkgPath.endsWith('.vpkg')
      let zipData: Buffer

      if (!isVpkg) {
        throw new Error('不支持的文件格式，请使用 .vpkg 插件包')
      }
      // 验证 .vpkg 魔数头
      if (fileData.length < VPKG_MAGIC.length) {
        throw new Error('无效的 .vpkg 文件：文件过小')
      }
      const magic = fileData.subarray(0, VPKG_MAGIC.length)
      if (!magic.equals(VPKG_MAGIC)) {
        throw new Error('无效的 .vpkg 文件：不是有效的 Vonic 插件包')
      }
      // 提取 ZIP 数据（跳过魔数头）
      zipData = fileData.subarray(VPKG_MAGIC.length)

      // 从内存中解压 ZIP 数据
      await new Promise<void>((resolve, reject) => {
        Readable.from(zipData)
          .pipe(Extract({ path: tempDir }))
          .on('close', resolve)
          .on('error', reject)
      })

      const manifestPath = this.findManifest(tempDir)
      if (!manifestPath)
        throw new Error('插件包中未找到 manifest.json')

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.main) {
        throw new Error('manifest.json 缺少必要字段')
      }

      if (this.externalPlugins.has(manifest.id)) {
        await this.uninstallPlugin(manifest.id)
      }

      const pluginRoot = path.dirname(manifestPath)
      const targetDir = path.join(this.pluginsDir, manifest.id)
      if (fs.existsSync(targetDir))
        fs.rmSync(targetDir, { recursive: true, force: true })
      fs.renameSync(pluginRoot, targetDir)

      this.externalPlugins.set(manifest.id, { manifest, pluginPath: targetDir })
      this.pluginStates.set(manifest.id, { enabled: false, loaded: false })

      logger.info(`Plugin installed: ${manifest.id} v${manifest.version}`)
      return manifest
    }
    finally {
      if (fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }

  public async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.externalPlugins.get(pluginId)
    if (!plugin)
      throw new Error(`插件未找到: ${pluginId}`)

    await this.deactivatePlugin(pluginId)
    if (fs.existsSync(plugin.pluginPath)) {
      fs.rmSync(plugin.pluginPath, { recursive: true, force: true })
    }

    this.externalPlugins.delete(pluginId)
    this.plugins.delete(pluginId)
    this.pluginAPIs.delete(pluginId)
    this.pluginStates.delete(pluginId)
    this.savePluginStates()
    logger.info(`Plugin uninstalled: ${pluginId}`)
  }

  public async activatePlugin(pluginId: string): Promise<void> {
    const state = this.pluginStates.get(pluginId)
    if (!state)
      throw new Error(`插件未找到: ${pluginId}`)
    // 如果已经加载过就不重复激活
    if (state.loaded)
      return

    // 加载插件模块
    if (!this.plugins.has(pluginId)) {
      await this.loadPluginModule(pluginId)
    }

    const plugin = this.plugins.get(pluginId)
    if (!plugin)
      throw new Error(`插件加载失败: ${pluginId}`)

    // 创建 API 并激活插件
    const api = new PluginAPI(pluginId)
    this.pluginAPIs.set(pluginId, api)

    try {
      await plugin.activate(api)
      state.enabled = true
      state.loaded = true
      this.savePluginStates()
      // 通知渲染进程插件已激活
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed())
          win.webContents.send('plugin:activated', { pluginId })
      })
      logger.info(`Plugin activated: ${pluginId}`)
    }
    catch (error) {
      api.dispose()
      this.pluginAPIs.delete(pluginId)
      throw error
    }
  }

  public async deactivatePlugin(pluginId: string): Promise<void> {
    const state = this.pluginStates.get(pluginId)
    if (!state?.enabled)
      return

    const plugin = this.plugins.get(pluginId)
    const api = this.pluginAPIs.get(pluginId)

    try {
      await plugin?.deactivate?.()
    }
    catch (error) {
      logger.error(`Error deactivating plugin ${pluginId}:`, error)
    }

    api?.dispose()
    this.pluginAPIs.delete(pluginId)
    state.enabled = false
    state.loaded = false
    this.savePluginStates()
    logger.info(`Plugin deactivated: ${pluginId}`)
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
    if (!fs.existsSync(mainPath))
      throw new Error(`入口文件不存在: ${mainPath}`)

    const timestamp = Date.now()
    let pluginModule: any

    // 支持 TypeScript 文件 - 使用 sucrase 运行时编译
    if (mainPath.endsWith('.ts')) {
      const tsCode = fs.readFileSync(mainPath, 'utf-8')
      const result = transform(tsCode, {
        transforms: ['typescript', 'imports'],
        filePath: mainPath,
      })
      // 使用 vm 执行编译后的代码
      const moduleExports = { exports: {} as any }
      const moduleRequire = (id: string): any => {
        // 处理相对路径导入
        if (id.startsWith('./') || id.startsWith('../')) {
          const resolvedPath = path.resolve(path.dirname(mainPath), id)
          return require(resolvedPath)
        }
        return require(id)
      }
      const script = new vm.Script(result.code, { filename: mainPath })
      const context = vm.createContext({
        module: moduleExports,
        exports: moduleExports.exports,
        require: moduleRequire,
        __filename: mainPath,
        __dirname: path.dirname(mainPath),
        console,
        process,
        Buffer,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
      })
      script.runInContext(context)
      pluginModule = moduleExports.exports
    }
    else {
      // 加载 CJS 格式的 JS 文件
      const jsCode = fs.readFileSync(mainPath, 'utf-8')
      const moduleExports = { exports: {} as any }
      const moduleRequire = (id: string): any => {
        if (id.startsWith('./') || id.startsWith('../')) {
          const resolvedPath = path.resolve(path.dirname(mainPath), id)
          // 清除缓存以支持热重载
          delete require.cache[require.resolve(resolvedPath)]
          return require(resolvedPath)
        }
        return require(id)
      }
      const script = new vm.Script(jsCode, { filename: mainPath })
      const context = vm.createContext({
        module: moduleExports,
        exports: moduleExports.exports,
        require: moduleRequire,
        __filename: mainPath,
        __dirname: path.dirname(mainPath),
        console,
        process,
        Buffer,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
      })
      script.runInContext(context)
      pluginModule = moduleExports.exports
    }

    // 支持 default 导出和直接导出
    const plugin: Plugin = pluginModule.default || pluginModule

    plugin.id = plugin.id || manifest.id
    plugin.name = plugin.name || manifest.name
    plugin.version = plugin.version || manifest.version

    this.plugins.set(pluginId, plugin)
    logger.info(`Plugin module loaded: ${pluginId}`)
  }

  public async loadDevPlugin(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'manifest.json')
    if (!fs.existsSync(manifestPath))
      throw new Error('manifest.json 不存在')

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
    if (this.devPlugins.has(manifest.id))
      await this.unloadDevPlugin(manifest.id)

    this.devPlugins.set(manifest.id, { manifest, pluginPath })
    this.pluginStates.set(manifest.id, { enabled: false, loaded: false })
    logger.info(`Dev plugin loaded: ${manifest.id}`)
    return manifest
  }

  public async unloadDevPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId)
    this.devPlugins.delete(pluginId)
    this.plugins.delete(pluginId)
    this.pluginStates.delete(pluginId)
    logger.info(`Dev plugin unloaded: ${pluginId}`)
  }

  public async reloadDevPlugin(pluginId: string): Promise<void> {
    const devPlugin = this.devPlugins.get(pluginId)
    if (!devPlugin)
      throw new Error(`开发插件未找到: ${pluginId}`)

    const wasEnabled = this.pluginStates.get(pluginId)?.enabled
    await this.deactivatePlugin(pluginId)
    this.plugins.delete(pluginId)

    // 重新读取 manifest
    const manifestPath = path.join(devPlugin.pluginPath, 'manifest.json')
    devPlugin.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    if (wasEnabled)
      await this.activatePlugin(pluginId)
    logger.info(`Dev plugin reloaded: ${pluginId}`)
  }

  public getAllPlugins(): PluginInfo[] {
    const result: PluginInfo[] = []

    for (const [id, plugin] of this.plugins.entries()) {
      const state = this.pluginStates.get(id)!
      result.push({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        author: plugin.author,
        description: plugin.description,
        enabled: state.enabled,
        loaded: state.loaded,
        isExternal: this.externalPlugins.has(id),
        isDev: this.devPlugins.has(id),
      })
    }

    for (const [id, { manifest, pluginPath }] of this.externalPlugins.entries()) {
      if (!this.plugins.has(id)) {
        const state = this.pluginStates.get(id) || { enabled: false, loaded: false }
        result.push({
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          author: manifest.author,
          description: manifest.description,
          enabled: state.enabled,
          loaded: state.loaded,
          isExternal: true,
          pluginPath,
        })
      }
    }

    for (const [id, { manifest, pluginPath }] of this.devPlugins.entries()) {
      if (!this.plugins.has(id)) {
        const state = this.pluginStates.get(id) || { enabled: false, loaded: false }
        result.push({
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          author: manifest.author,
          description: manifest.description,
          enabled: state.enabled,
          loaded: state.loaded,
          isDev: true,
          pluginPath,
        })
      }
    }

    return result
  }

  public getPluginsDir(): string {
    return this.pluginsDir
  }

  public async autoLoadPlugins(): Promise<void> {
    for (const [pluginId, state] of this.pluginStates.entries()) {
      if (state.enabled) {
        try {
          await this.activatePlugin(pluginId)
        }
        catch (error) {
          logger.error(`Failed to auto-activate plugin ${pluginId}:`, error)
        }
      }
    }
  }

  private findManifest(dir: string): string | null {
    const rootManifest = path.join(dir, 'manifest.json')
    if (fs.existsSync(rootManifest))
      return rootManifest

    for (const item of fs.readdirSync(dir)) {
      const itemPath = path.join(dir, item)
      if (fs.statSync(itemPath).isDirectory()) {
        const subManifest = path.join(itemPath, 'manifest.json')
        if (fs.existsSync(subManifest))
          return subManifest
      }
    }
    return null
  }

  private scanInstalledPlugins(): void {
    try {
      for (const dir of fs.readdirSync(this.pluginsDir)) {
        if (dir.startsWith('_temp_'))
          continue
        const pluginPath = path.join(this.pluginsDir, dir)
        const manifestPath = path.join(pluginPath, 'manifest.json')

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest
            this.externalPlugins.set(manifest.id, { manifest, pluginPath })
            if (!this.pluginStates.has(manifest.id)) {
              this.pluginStates.set(manifest.id, { enabled: false, loaded: false })
            }
            logger.info(`Scanned plugin: ${manifest.id}`)
          }
          catch {
            logger.error(`Failed to parse manifest in ${dir}`)
          }
        }
      }
    }
    catch (error) {
      logger.error('Failed to scan plugins:', error)
    }
  }

  private loadPersistedStates(): void {
    const saved = store.get('plugin_states', {}) as Record<string, { enabled: boolean }>
    for (const [id, state] of Object.entries(saved)) {
      this.pluginStates.set(id, { enabled: state.enabled, loaded: false })
    }
  }

  private savePluginStates(): void {
    const states: Record<string, { enabled: boolean }> = {}
    for (const [id, state] of this.pluginStates.entries()) {
      states[id] = { enabled: state.enabled }
    }
    store.set('plugin_states', states)
  }

  private initIPCHandlers(): void {
    ipcMain.handle('plugin:list', () => this.getAllPlugins())

    ipcMain.handle('plugin:enable', async (_, pluginId: string) => {
      await this.activatePlugin(pluginId)
    })

    ipcMain.handle('plugin:disable', async (_, pluginId: string) => {
      await this.deactivatePlugin(pluginId)
    })

    ipcMain.handle('plugin:install', async () => {
      const result = await dialog.showOpenDialog({
        title: '选择插件包',
        filters: [{ name: 'Vonic 插件包', extensions: ['vpkg'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths.length)
        return null
      return await this.installPlugin(result.filePaths[0])
    })

    ipcMain.handle('plugin:uninstall', async (_, pluginId: string) => {
      await this.uninstallPlugin(pluginId)
    })

    ipcMain.handle('plugin:get-dir', () => this.pluginsDir)

    ipcMain.handle('plugin:load-dev', async () => {
      const result = await dialog.showOpenDialog({
        title: '选择插件目录',
        properties: ['openDirectory'],
      })
      if (result.canceled || !result.filePaths.length)
        return null
      const manifest = await this.loadDevPlugin(result.filePaths[0])
      return { manifest, pluginPath: result.filePaths[0] }
    })

    ipcMain.handle('plugin:unload-dev', async (_, pluginId: string) => {
      await this.unloadDevPlugin(pluginId)
    })

    ipcMain.handle('plugin:reload-dev', async (_, pluginId: string) => {
      await this.reloadDevPlugin(pluginId)
    })

    // 读取插件文件 - 供渲染进程加载 Vue 组件
    ipcMain.handle('plugin:readFile', async (_, filePath: string) => {
      try {
        // 安全检查：只允许读取插件目录中的文件
        const normalizedPath = path.normalize(filePath)
        const isDevPlugin = Array.from(this.devPlugins.values()).some(
          p => normalizedPath.startsWith(path.normalize(p.pluginPath)),
        )
        const isExternalPlugin = Array.from(this.externalPlugins.values()).some(
          p => normalizedPath.startsWith(path.normalize(p.pluginPath)),
        )

        if (!isDevPlugin && !isExternalPlugin && !normalizedPath.startsWith(this.pluginsDir)) {
          throw new Error('不允许访问插件目录外的文件')
        }

        return fs.readFileSync(filePath, 'utf-8')
      }
      catch (e) {
        logger.error(`Failed to read plugin file: ${filePath}`, e)
        throw e
      }
    })

    // 获取插件路径
    ipcMain.handle('plugin:getPath', (_, pluginId: string) => {
      const dev = this.devPlugins.get(pluginId)
      if (dev)
        return dev.pluginPath

      const ext = this.externalPlugins.get(pluginId)
      if (ext)
        return ext.pluginPath

      return null
    })

    // 同步插件 UI 状态（菜单、面板）- 渲染进程启动时调用
    ipcMain.handle('plugin:sync-ui', () => {
      const result: {
        menus: { pluginId: string, items: any[] }[]
        panels: { pluginId: string, panel: any }[]
      } = { menus: [], panels: [] }

      for (const [pluginId, api] of this.pluginAPIs.entries()) {
        const state = this.pluginStates.get(pluginId)
        if (!state?.enabled || !state?.loaded)
          continue

        const menus = api.getRegisteredMenus()
        if (menus.length > 0) {
          result.menus.push({ pluginId, items: menus })
        }

        const panel = api.getRegisteredPanel()
        if (panel) {
          result.panels.push({ pluginId, panel })
        }
      }

      logger.info(`Syncing UI state: ${result.menus.length} menus, ${result.panels.length} panels`)
      return result
    })
  }
}

export default PluginManager.getInstance()

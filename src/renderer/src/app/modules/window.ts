import type { WindowAPI, WindowConfig, WindowInstanceAPI } from '../types'
import type { WindowName } from '@/shared/constants'
import type { WindowCreateOptions, WindowInstanceInfo } from '@/shared/types'
import { toRaw } from 'vue'
import { WindowName as WindowNameEnum } from '@/shared/constants'

/**
 * 序列化数据用于 IPC 通信
 * 将响应式对象转换为可序列化的普通对象
 * @param data 要序列化的数据（可能是响应式对象）
 * @returns 序列化后的数据
 *
 * @remarks
 * 此函数已在 close() 方法中自动调用，通常不需要手动使用。
 * 如需在其他场景使用，可以直接调用此函数。
 */
export function serializeForIPC<T = unknown>(data: T): unknown {
  try {
    // 处理 undefined 和 null
    if (data === undefined || data === null) {
      return data
    }

    // 处理原始类型（string, number, boolean）
    if (typeof data !== 'object') {
      return data
    }

    // 处理响应式对象：先使用 toRaw 去除 Vue 的响应式代理
    const rawData = toRaw(data)

    // 使用 JSON 序列化/反序列化确保完全去除响应式，并移除不可序列化的内容
    return JSON.parse(JSON.stringify(rawData))
  }
  catch (error) {
    console.error('数据序列化失败:', error)
    // 如果序列化失败，尝试返回 toRaw 的结果
    try {
      return toRaw(data)
    }
    catch {
      return null
    }
  }
}

/**
 * 窗口类
 * 每个窗口类型都有一个实例，包含窗口特定方法和通用窗口操作方法
 */
class Window implements WindowInstanceAPI {
  private readonly windowName: WindowName | null

  constructor(windowName: WindowName | null = null) {
    this.windowName = windowName
  }

  /**
   * 打开窗口
   * @param options 窗口选项（支持 config, data, waitForResult）
   * @param waitForResult 是否等待窗口关闭并返回结果（默认 true，如果 options 中已有 waitForResult 则优先使用 options 中的值）
   * @returns Promise，默认等待窗口关闭时返回结果。如果 waitForResult 为 false，则立即返回 Promise<void>
   */
  async open(options?: WindowCreateOptions & { waitForResult?: boolean }, waitForResult?: boolean): Promise<unknown> {
    if (this.windowName === null) {
      throw new Error('Cannot open window: window name is null (current window instance)')
    }

    // 优先使用 options 中的 waitForResult，否则使用参数，默认为 true（自动等待结果）
    const shouldWaitForResult = options?.waitForResult ?? waitForResult ?? true

    if (shouldWaitForResult) {
      const { waitForResult: _, ...restOptions } = options || {}
      return window.electron.ipcRenderer.invoke('window:create-async', this.windowName, restOptions)
    }
    // 如果明确指定不等待结果，使用 send 方式（立即返回）
    window.electron.ipcRenderer.send('window:create', this.windowName, options)
    return Promise.resolve()
  }

  /**
   * 关闭窗口
   * @param result 关闭时返回的结果值（用于传递给等待的 Promise）
   *                自动处理响应式对象的序列化，无需手动调用 toRaw 和 JSON.stringify
   * @param windowId 可选指定窗口 ID，不指定则关闭当前窗口或所有同名窗口
   */
  close(result?: unknown, windowId?: number): void {
    // 自动序列化结果数据，确保 IPC 通信可以正常传输
    const serializedResult = result !== undefined ? serializeForIPC(result) : undefined

    if (this.windowName === null) {
      // 当前窗口实例：关闭当前窗口
      window.electron.ipcRenderer.send('window:close', serializedResult)
    }
    else {
      // 特定窗口实例：关闭指定窗口或所有同名窗口
      window.electron.ipcRenderer.send('window:close', serializedResult, windowId, this.windowName)
    }
  }

  /**
   * 获取所有同名窗口实例列表
   * @returns Promise<WindowInstanceInfo[]>
   */
  async getAll(): Promise<WindowInstanceInfo[]> {
    if (this.windowName === null) {
      throw new Error('Cannot get all windows: window name is null (current window instance)')
    }
    return window.electron.ipcRenderer.invoke('window:get-all', this.windowName) as Promise<WindowInstanceInfo[]>
  }

  /**
   * 通过 ID 获取窗口实例
   * @param windowId 窗口 ID
   * @returns Promise<WindowInstanceInfo | null>
   */
  async getById(windowId: number): Promise<WindowInstanceInfo | null> {
    if (this.windowName === null) {
      throw new Error('Cannot get window by id: window name is null (current window instance)')
    }
    return window.electron.ipcRenderer.invoke('window:get-by-id', this.windowName, windowId) as Promise<WindowInstanceInfo | null>
  }

  /**
   * 最小化窗口（操作当前窗口）
   */
  minimize(): void {
    window.electron.ipcRenderer.send('window:minimize')
  }

  /**
   * 最大化/还原窗口（操作当前窗口）
   */
  toggleMaximize(): void {
    window.electron.ipcRenderer.send('window:toggle-maximize')
  }

  /**
   * 获取当前窗口配置
   * @returns Promise<WindowConfig | null> 窗口配置信息
   */
  async getConfig(): Promise<WindowConfig | null> {
    const result = await window.electron.ipcRenderer.invoke('window:get-config')
    return result as WindowConfig | null
  }

  /**
   * 获取窗口数据（操作当前窗口）
   * @returns Promise<T | null> 窗口数据
   */
  async getData<T = unknown>(): Promise<T | null> {
    const result = await window.electron.ipcRenderer.invoke('window:get-data')
    return result as T | null
  }

  /**
   * 更新窗口数据（操作当前窗口）
   * @param data 新的窗口数据（自动处理响应式对象的序列化）
   */
  updateData(data: unknown): void {
    // 自动序列化数据，确保 IPC 通信可以正常传输
    const serializedData = data !== undefined ? serializeForIPC(data) : undefined
    window.electron.ipcRenderer.send('window:update-data', serializedData)
  }
}

/**
 * 创建窗口实例
 * @param windowName 窗口名称，如果为 null 则表示当前窗口
 * @returns 窗口实例
 */
function createWindowInstance(windowName: WindowName | null = null): WindowInstanceAPI {
  return new Window(windowName)
}

// 创建缓存存储已创建的窗口实例（按需创建，用时才创建）
const windowInstanceCache = new Map<WindowName | 'current', WindowInstanceAPI>()

// 预先计算窗口名称集合，优化查找性能 O(1)
const WINDOW_NAMES = new Set(Object.values(WindowNameEnum))

// 使用 Proxy 实现延迟加载：只有访问时才创建窗口实例，避免启动时创建所有实例
const windowAPIProxyHandler: ProxyHandler<WindowAPI> = {
  get(target: WindowAPI, prop: string | symbol, receiver: any) {
    // 处理 current 属性
    if (prop === 'current') {
      if (windowInstanceCache.has('current')) {
        return windowInstanceCache.get('current')
      }
      const currentInstance = createWindowInstance(null)
      windowInstanceCache.set('current', currentInstance)
      return currentInstance
    }

    // 检查是否为有效的窗口名称（使用 Set 优化查找性能）
    if (typeof prop === 'string' && WINDOW_NAMES.has(prop as WindowName)) {
      // 检查缓存中是否已有该窗口实例
      if (windowInstanceCache.has(prop as WindowName)) {
        return windowInstanceCache.get(prop as WindowName)
      }

      // 按需创建新的窗口实例并缓存
      const windowInstance = createWindowInstance(prop as WindowName)
      windowInstanceCache.set(prop as WindowName, windowInstance)
      return windowInstance
    }

    // 其他属性按默认行为处理
    return Reflect.get(target, prop, receiver)
  },

  // 让 Object.keys() 和控制台能够枚举所有窗口名称
  ownKeys(_target: WindowAPI) {
    return ['current', ...Array.from(WINDOW_NAMES)]
  },

  // 让属性描述符检查通过，使枚举正常工作
  getOwnPropertyDescriptor(_target: WindowAPI, prop: string | symbol) {
    if (prop === 'current' || (typeof prop === 'string' && WINDOW_NAMES.has(prop as WindowName))) {
      return {
        enumerable: true,
        configurable: true,
      }
    }
    return undefined
  },
}

/**
 * 窗口 API 对象
 * 使用 Proxy 实现延迟加载，只有访问时才创建窗口实例，避免启动时的性能开销
 *
 * @example
 * // 只有真正访问时才会创建 settings 窗口实例
 * windowAPI.settings.open()
 */
export const windowAPI: WindowAPI = new Proxy({} as WindowAPI, windowAPIProxyHandler)

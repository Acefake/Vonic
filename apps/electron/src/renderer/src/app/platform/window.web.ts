/**
 * Web 端窗口 API 实现
 */
import type { WindowAPI, WindowConfig, WindowInstanceAPI } from '../types'
import type { WindowCreateOptions, WindowInstanceInfo } from '@/shared/types'

/** Web 端窗口实例 */
class WebWindow implements WindowInstanceAPI {
  private readonly windowName: string | null

  constructor(windowName: string | null = null) {
    this.windowName = windowName
  }

  async open(options?: WindowCreateOptions & { waitForResult?: boolean }): Promise<unknown> {
    if (this.windowName === null) {
      throw new Error('Cannot open window: window name is null')
    }
    const query = options?.data ? `?data=${encodeURIComponent(JSON.stringify(options.data))}` : ''
    const url = `/${this.windowName}${query}`
    if (options?.config?.modal) {
      window.open(url, this.windowName, `width=${options.config.width || 800},height=${options.config.height || 600}`)
    }
    else {
      window.location.hash = url
    }
    return Promise.resolve()
  }

  close(_result?: unknown, _windowId?: number): void {
    window.history.back()
  }

  async getAll(): Promise<WindowInstanceInfo[]> {
    return []
  }

  async getById(_windowId: number): Promise<WindowInstanceInfo | null> {
    return null
  }

  minimize(): void {
    console.warn('[Web] minimize not supported')
  }

  toggleMaximize(): void {
    console.warn('[Web] toggleMaximize not supported')
  }

  async getConfig(): Promise<WindowConfig | null> {
    return null
  }

  async getData<T = unknown>(): Promise<T | null> {
    const hash = window.location.hash
    const match = hash.match(/\?data=([^&]+)/)
    if (match) {
      try {
        return JSON.parse(decodeURIComponent(match[1])) as T
      }
      catch {
        return null
      }
    }
    return null
  }

  updateData(_data: unknown): void {
    console.warn('[Web] updateData not supported')
  }
}

/** 窗口实例缓存 */
const windowCache = new Map<string, WindowInstanceAPI>()

/** 创建 Web 窗口 API */
export function createWebWindowAPI(): WindowAPI {
  return new Proxy({} as WindowAPI, {
    get(_target, prop: string) {
      if (prop === 'current') {
        if (!windowCache.has('current')) {
          windowCache.set('current', new WebWindow(null))
        }
        return windowCache.get('current')
      }
      if (!windowCache.has(prop)) {
        windowCache.set(prop, new WebWindow(prop))
      }
      return windowCache.get(prop)
    },
    ownKeys() {
      return ['current']
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop === 'current' || typeof prop === 'string') {
        return { enumerable: true, configurable: true }
      }
      return undefined
    },
  })
}

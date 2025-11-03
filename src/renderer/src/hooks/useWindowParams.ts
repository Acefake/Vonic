import type { IpcRendererEvent } from 'electron'
import type { Ref } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useApp } from '@/renderer/app'

/**
 * 窗口参数 Hook 返回类型
 */
export interface UseWindowParamsReturn<T = unknown> {
  /** 窗口数据（通过 data 传递的数据） */
  data: Ref<T | null>
  /** 数据加载状态 */
  loading: Ref<boolean>
  /** 错误信息 */
  error: Ref<string | null>
  /** 手动刷新数据 */
  refresh: () => Promise<void>
}

/**
 * 使用窗口参数的 Hook
 *
 * 用于在任何窗口类型中自动获取并监听窗口数据更新。
 * 支持所有窗口类型（embedded、settings、loading 等），通过当前窗口实例获取数据。
 * 支持懒加载窗口的场景，当窗口重新打开时会自动更新数据。
 *
 * @template T 窗口数据的类型，默认为 unknown
 * @param options 配置选项
 * @param options.autoLoad 是否在挂载时自动加载数据，默认为 true
 * @param options.enableIpcListener 是否启用 IPC 监听器，默认为 true
 * @returns UseWindowParamsReturn<T> Hook 返回的对象
 *
 * @example
 * ```typescript
 * interface WindowData {
 *   userId: string
 *   userName: string
 * }
 *
 * // 在任何窗口类型中使用
 * const { data, loading, error, refresh } = useWindowParams<WindowData>()
 * ```
 */
export function useWindowParams<T = unknown>(options: {
  autoLoad?: boolean
  enableIpcListener?: boolean
} = {}): UseWindowParamsReturn<T> {
  const {
    autoLoad = true,
    enableIpcListener = true,
  } = options

  const $app = useApp()

  const currentWindow = $app.window.current

  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  /**
   * 更新窗口数据
   * @param newData 新的窗口数据
   */
  function updateWindowData(newData: T | null): void {
    data.value = newData
  }

  /**
   * 加载窗口数据（从主进程获取最新数据）
   */
  async function loadWindowData(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await currentWindow.getData<T>()
      updateWindowData(result)
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error.value = errorMessage
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 监听 window:data IPC 事件，当窗口数据更新时自动刷新
   * 这对于懒加载窗口特别重要：当窗口重新打开时，主进程会发送新的数据
   */
  function handleWindowData(_event: IpcRendererEvent, newData: T): void {
    updateWindowData(newData)
  }

  /**
   * 手动刷新数据
   */
  async function refresh(): Promise<void> {
    await loadWindowData()
  }

  onMounted(async () => {
    if (autoLoad) {
      await loadWindowData()
    }

    if (enableIpcListener) {
      window.electron.ipcRenderer.on('window:data', handleWindowData)
    }
  })

  onUnmounted(() => {
    if (enableIpcListener) {
      window.electron.ipcRenderer.removeListener('window:data', handleWindowData)
    }
  })

  return {
    data,
    loading,
    error,
    refresh,
  }
}

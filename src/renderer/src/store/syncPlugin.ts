import type { PiniaPluginContext } from 'pinia'
import { isRef, toRaw, unref } from 'vue'

// 全局监听器注册标记，避免重复注册
let isGlobalListenerRegistered = false

// 全局同步标记 Map，按 storeId 存储
const syncingStores = new Map<string, boolean>()

// 防抖定时器 Map，按 storeId 存储（用于 log store）
const debounceTimers = new Map<string, NodeJS.Timeout>()

/**
 * 日志条目接口（用于状态比较）
 */
interface LogEntry {
  id: number
  level: string
  message: string
  timestamp: string
  details?: string
}

/**
 * 深度解包 ref 和 reactive 对象
 */
function deepUnref(obj: unknown): unknown {
  // 处理 null 和 undefined
  if (obj === null || obj === undefined) {
    return obj
  }

  // 处理 ref
  if (isRef(obj)) {
    return deepUnref(unref(obj))
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => deepUnref(item))
  }

  // 处理普通对象
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = deepUnref((obj as Record<string, unknown>)[key])
      }
    }
    return result
  }

  // 处理原始类型
  return obj
}

/**
 * 序列化状态 - 将响应式对象转换为普通对象
 * Electron IPC 无法传输 Proxy 对象，需要先转换
 */
function serializeState(state: unknown): Record<string, unknown> {
  try {
    // 使用 toRaw 去除 Vue 的响应式代理
    const rawState = toRaw(state)
    // 通过 JSON 序列化/反序列化确保完全去除响应式
    return deepUnref(rawState) as Record<string, unknown>
  }
  catch (error) {
    console.error('状态序列化失败:', error)
    return {}
  }
}

/**
 * 比较日志状态是否相同（忽略时间戳，只比较内容）
 */
function compareLogStates(
  currentState: Record<string, unknown>,
  newState: Record<string, unknown>,
): boolean {
  const currentLogs = (currentState.logs as LogEntry[]) || []
  const newLogs = (newState.logs as LogEntry[]) || []

  // 比较数组长度
  if (currentLogs.length !== newLogs.length) {
    return false
  }

  // 比较每条日志的 id、level、message（忽略时间戳和 details）
  for (let i = 0; i < currentLogs.length; i++) {
    const current = currentLogs[i]
    const newLog = newLogs[i]

    if (!current || !newLog) {
      return false
    }

    if (
      current.id !== newLog.id
      || current.level !== newLog.level
      || current.message !== newLog.message
    ) {
      return false
    }
  }

  // 比较其他字段
  return (
    currentState.isPaused === newState.isPaused
    && currentState.filterLevel === newState.filterLevel
  )
}

/**
 * Pinia 多窗口同步插件
 * 自动将 store 的变化同步到主进程，并监听来自主进程的同步消息
 */
export function createSyncPlugin() {
  return (context: PiniaPluginContext) => {
    const { store, pinia } = context

    // 检查当前 store 是否正在同步
    const isSyncing = () => syncingStores.get(store.$id) || false
    const setSyncing = (value: boolean) => syncingStores.set(store.$id, value)

    // 订阅 store 变化，发送到主进程
    // 对于 log store，使用防抖避免快速连续更新导致的循环
    store.$subscribe((_mutation, _state) => {
      if (isSyncing()) {
        return // 如果正在同步，跳过
      }

      // 只同步 $state（不包含 computed 和 methods）
      const storeKey = `pinia:${store.$id}`
      const serializedState = serializeState(store.$state)

      // 对于 log store，使用防抖（100ms），避免快速连续更新
      if (store.$id === 'log') {
        const existingTimer = debounceTimers.get(store.$id)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        const timer = setTimeout(() => {
          // 在防抖回调中重新获取最新状态，确保发送的是最新的
          const latestState = serializeState(store.$state)
          window.electron.ipcRenderer.send('store:update', {
            key: storeKey,
            value: latestState,
          })
          debounceTimers.delete(store.$id)
        }, 100)

        debounceTimers.set(store.$id, timer)
      }
      else {
        // 其他 store 立即发送
        window.electron.ipcRenderer.send('store:update', {
          key: storeKey,
          value: serializedState,
        })
      }
    }, { flush: 'sync' })

    // 注册全局监听器（只注册一次）
    if (!isGlobalListenerRegistered) {
      isGlobalListenerRegistered = true
      window.electron.ipcRenderer.on('store:sync', (_event, payload: { key: string, value: unknown }) => {
        const { key, value } = payload
        // 解析 storeId (格式: pinia:storeId)
        const storeId = key.replace('pinia:', '')

        // 从 pinia 实例中获取对应的 store
        // @ts-expect-error - 访问 Pinia 内部 API
        const targetStore = pinia._s.get(storeId)

        if (targetStore && value) {
          // 检查状态是否真的改变了（避免循环更新）
          const currentState = serializeState(targetStore.$state)
          const newState = value as Record<string, unknown>

          // 对于 experimentalData store，使用时间戳判断是否接受同步
          if (storeId === 'experimentalData') {
            const currentTimestamp = (currentState.lastUpdateTime as number) || 0
            const newTimestamp = (newState.lastUpdateTime as number) || 0

            // 只接受更新的数据（时间戳更大）
            if (newTimestamp <= currentTimestamp) {
              // console.log(`[Store Sync] experimentalData 拒绝旧数据 - 当前时间戳: ${currentTimestamp}, 新时间戳: ${newTimestamp}`)
              return
            }

            // console.log(`[Store Sync] experimentalData 接受新数据 - 时间戳: ${newTimestamp}`)
          }

          let stateChanged = false

          // 对于 log store，使用精确比较（忽略时间戳）
          if (storeId === 'log') {
            stateChanged = !compareLogStates(currentState, newState)
          }
          else {
            // 其他 store 使用 JSON 比较
            stateChanged = JSON.stringify(currentState) !== JSON.stringify(newState)
          }

          if (!stateChanged) {
            return
          }

          // 检查目标 store 是否正在同步
          if (syncingStores.get(storeId)) {
            return
          }

          // 设置同步标记（直接操作 Map，因为这是全局回调）
          syncingStores.set(storeId, true)

          try {
            // 更新 store 的状态
            targetStore.$patch(value)
            console.log(`[Store Sync] 同步成功 - store: ${storeId}`)
          }
          finally {
            // 使用 setTimeout 延迟重置，给 $patch 更多时间完成
            // 对于 log store，需要更长的延迟，因为可能有防抖处理
            const delay = storeId === 'log' ? 200 : 0
            setTimeout(() => {
              syncingStores.set(storeId, false)
            }, delay)
          }
        }
        else {
          console.log(`[Store Sync] 未找到 store: ${storeId}`)
        }
      })
    }

    // 延迟执行，等待主进程完成初始化
    const storeKey = `pinia:${store.$id}`

    setTimeout(() => {
      window.electron.ipcRenderer
        .invoke('store:get', storeKey)
        .then((savedState) => {
          if (savedState) {
            // 检查当前状态是否已有数据（避免覆盖刚设置的数据）
            const currentState = serializeState(store.$state)

            // 对于 experimentalData store，检查是否已有表格数据
            if (store.$id === 'experimentalData') {
              const currentTableData = (currentState.tableData as unknown[]) || []
              if (currentTableData.length > 0) {
                console.log(`[Store Sync] experimentalData 已有数据，跳过初始化加载 - store: ${store.$id}`)
                return
              }
            }

            // 检查状态是否真的改变了（避免循环更新）
            const newState = savedState as Record<string, unknown>

            let stateChanged = false

            // 对于 log store，使用精确比较（忽略时间戳）
            if (store.$id === 'log') {
              stateChanged = !compareLogStates(currentState, newState)
            }
            else {
              // 其他 store 使用 JSON 比较
              stateChanged = JSON.stringify(currentState) !== JSON.stringify(newState)
            }

            if (!stateChanged) {
              return
            }

            setSyncing(true)
            try {
              store.$patch(savedState)
              console.log(`[Store Sync] 从主进程加载状态成功 - store: ${store.$id}`)
            }
            finally {
              // 使用 setTimeout 延迟重置，给 $patch 更多时间完成
              const delay = store.$id === 'log' ? 200 : 0
              setTimeout(() => {
                setSyncing(false)
              }, delay)
            }
          }
          else {
            console.log(`[Store Sync] 主进程无保存的状态 - store: ${store.$id}`)
          }
        })
    }, 200)
  }
}

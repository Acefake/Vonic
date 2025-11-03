import { defineStore } from 'pinia'

/**
 * 主 Store
 * 通过 syncPlugin 自动实现多窗口同步
 */
export const useStore = defineStore('main', {
  state: () => ({
    count: 0,
    message: 'Hello from Pinia!',
  }),

  getters: {
    doubleCount: state => state.count * 2,
  },

  actions: {
    increment() {
      this.count++
      // 不需要手动发送 IPC 消息，插件会自动同步
    },

    decrement() {
      this.count--
    },

    setCount(value: number) {
      this.count = value
    },

    setMessage(value: string) {
      this.message = value
    },
  },
})

// 导出设计相关的 store 和类型
export { useDesignStore } from './designStore'
export type {
  DesignScheme,
  DrivingParams,
  FeedingMethod,
  OperatingParams,
  OutputResults,
  SeparationComponents,
  TopLevelParams,
} from './designStore'

// 导出设置相关的 store
export { useSettingsStore } from './settingsStore'

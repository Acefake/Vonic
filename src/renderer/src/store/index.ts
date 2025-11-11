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

export type { DesignFormData, DesignScheme, FeedingMethod, OutputResults } from './designStore'

// 导出设计相关的 store 和类型
export { useDesignStore } from './designStore'

// 导出实验数据相关的 store
export { useExperimentalDataStore } from './experimentalDataStore'

// 导出设置相关的 store
export { useLogStore } from './logStore'
export type {
  PowerAnalysisDesignScheme,
  PowerAnalysisFormData,
  PowerAnalysisOutputResults,
} from './powerAnalysisDesignStore'
export { usePowerAnalysisDesignStore } from './powerAnalysisDesignStore'
export { useSchemeOptimizationStore } from './schemeOptimizationStore'
export { useSettingsStore } from './settingsStore'

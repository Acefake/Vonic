import type { AppAPI } from './types'
import { getCurrentInstance } from 'vue'

/**
 * 获取 App API 实例
 * @returns AppAPI 实例
 */
export function useApp(): AppAPI {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('useApp() 必须在 setup 函数中调用')
  }

  const app = instance.appContext.config.globalProperties.$app

  // 使用类型断言确保 TypeScript 能正确推断类型
  if (!app) {
    throw new Error('$app 未初始化，请检查 main.ts 中的配置')
  }

  return app as AppAPI
}

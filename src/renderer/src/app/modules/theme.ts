import type { ThemeAPI } from '../types'
import type { ProductConfig } from '@/config/product'
import { productConfig } from '@/config/product.config'

export const themeAPI: ThemeAPI = {
  /**
   * 获取当前主题色
   * @returns 主题颜色值
   */
  getColor(): string {
    return productConfig.themeColor
  },

  /**
   * 获取产品配置
   * @returns 产品配置对象
   */
  getConfig(): ProductConfig {
    return productConfig
  },
}

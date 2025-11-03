import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import { productConfig } from '../../../config/product.config'

/**
 * Ant Design Vue 主题配置
 * 使用 Design Token 系统
 * @see https://antdv.com/docs/vue/customize-theme-cn
 */
export function getThemeConfig(): ThemeConfig {
  return {
    token: {
      colorPrimary: productConfig.themeColor,
      borderRadius: 4,
      borderRadiusLG: 4,
      borderRadiusSM: 4,
      borderRadiusXS: 4,
    },

    components: {
      Button: {
        colorPrimary: productConfig.themeColor,
      },
    },
  }
}

/**
 * 暗色主题配置
 */
export function getDarkThemeConfig(): ThemeConfig {
  return {
    token: {
      colorPrimary: productConfig.themeColor,
      colorBgBase: '#141414',
      colorTextBase: '#ffffff',
    },
    algorithm: undefined, // 如果需要暗色主题，引入 theme.darkAlgorithm
  }
}

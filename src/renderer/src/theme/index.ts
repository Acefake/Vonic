import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

/**
 * Ant Design Vue 主题配置
 * 使用 Design Token 系统
 * @see https://antdv.com/docs/vue/customize-theme-cn
 */
export function getThemeConfig(): ThemeConfig {
  return {
    token: {
      colorPrimary: app.productConfig.themeColor,
      borderRadius: 0,
      borderRadiusLG: 0,
      borderRadiusSM: 0,
      borderRadiusXS: 0,
    },
    components: {
      Button: {
        colorPrimary: app.productConfig.themeColor,
      },
    },
  }
}

/**
 * 主题系统
 * 支持 VS Code 风格的主题切换
 */

// Ant Design Vue 主题配置
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import { useTheme } from './useTheme'

export * from './themes'
export * from './types'
export { useTheme } from './useTheme'

/**
 * 获取 Ant Design Vue 主题配置
 */
export function getAntdThemeConfig(): ThemeConfig {
  const { colors } = useTheme()
  const c = colors.value

  return {
    // 全局 Token
    token: {
      // 品牌色
      colorPrimary: c.primary,
      colorInfo: c.info,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorError: c.error,
      // 背景色
      colorBgBase: c.bgBase,
      colorBgContainer: c.bgContainer,
      colorBgElevated: c.bgElevated,
      colorBgLayout: c.bgLayout,
      colorBgSpotlight: c.bgSpotlight,
      // 文字色
      colorText: c.textPrimary,
      colorTextSecondary: c.textSecondary,
      colorTextTertiary: c.textTertiary,
      colorTextDisabled: c.textDisabled,
      // 边框色
      colorBorder: c.border,
      colorBorderSecondary: c.borderSecondary,
      // 圆角
      borderRadius: 4,
      borderRadiusLG: 6,
      borderRadiusSM: 2,
      // 阴影
      boxShadow: 'none',
      boxShadowSecondary: 'none',
    },
    // 组件级 Token
    components: {
      Button: {
        colorBgContainer: c.bgContainer,
        colorBorder: c.border,
      },
      Input: {
        colorBgContainer: c.bgContainer,
        colorBorder: c.border,
      },
      Select: {
        colorBgContainer: c.bgContainer,
        colorBorder: c.border,
      },
      Menu: {
        // // 紧凑布局
        // fontSize: 13,
        // itemMarginInline: 2,
        // // 颜色
        // colorItemBg: 'transparent',
        // colorSubItemBg: 'transparent',
        // colorItemBgHover: 'rgba(255, 255, 255, 0.1)',
        // colorItemBgSelected: 'transparent',
        // colorItemText: c.titleBarFg,
        // colorItemTextHover: c.titleBarFg,
        // colorItemTextSelected: c.titleBarFg,
        // // 下拉菜单
        // dropdownWidth: 120,
        // colorBgElevated: c.bgElevated,
      },
      Card: {
        colorBgContainer: c.bgContainer,
        colorBorderSecondary: c.border,
      },
      Modal: {
        colorBgElevated: c.bgElevated,
        colorBgMask: 'rgba(0, 0, 0, 0.45)',
      },
      Dropdown: {
        colorBgElevated: c.bgElevated,
        controlItemBgHover: c.hoverBg,
      },
      Switch: {
        colorPrimary: c.primary,
        colorPrimaryHover: c.primaryHover,
      },
      Tag: {
        borderRadiusSM: 2,
      },
      Table: {
        colorBgContainer: c.bgContainer,
      },
      Tabs: {
        colorBgContainer: 'transparent',
      },
    },
  }
}

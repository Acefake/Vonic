/**
 * 主题类型定义
 */

export type ThemeMode = 'light' | 'dark'

export interface ThemeColors {
  // 基础色
  primary: string
  primaryHover: string
  primaryActive: string

  // 背景色
  bgBase: string
  bgElevated: string
  bgContainer: string
  bgLayout: string
  bgSpotlight: string

  // 文字色
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  textPlaceholder: string

  // 边框色
  border: string
  borderSecondary: string

  // 活动栏
  activityBarBg: string
  activityBarFg: string
  activityBarFgActive: string
  activityBarIndicator: string

  // 侧边栏
  sidebarBg: string
  sidebarFg: string
  sidebarHeaderBg: string
  sidebarBorder: string

  // 标题栏
  titleBarBg: string
  titleBarFg: string
  titleBarBorder: string

  // 编辑区
  editorBg: string
  editorFg: string

  // 状态色
  success: string
  warning: string
  error: string
  info: string

  // 交互状态
  hoverBg: string
  activeBg: string
  selectedBg: string

  // 滚动条
  scrollbarBg: string
  scrollbarThumb: string
  scrollbarThumbHover: string

  // 阴影
  shadow: string
  shadowSecondary: string
}

export interface Theme {
  name: string
  mode: ThemeMode
  colors: ThemeColors
}

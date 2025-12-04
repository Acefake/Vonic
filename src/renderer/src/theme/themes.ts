/**
 * 预设主题定义
 * 参考 VS Code 的配色方案
 */

import type { Theme } from './types'

/** VS Code Dark+ 主题 */
export const darkTheme: Theme = {
  name: 'Dark+',
  mode: 'dark',
  colors: {
    // 基础色
    primary: '#0078d4',
    primaryHover: '#1a8cdb',
    primaryActive: '#005a9e',

    // 背景色
    bgBase: '#1e1e1e',
    bgElevated: '#252526',
    bgContainer: '#2d2d2d',
    bgLayout: '#181818',
    bgSpotlight: '#3c3c3c',

    // 文字色
    textPrimary: '#cccccc',
    textSecondary: '#9d9d9d',
    textTertiary: '#6e6e6e',
    textDisabled: '#5a5a5a',
    textPlaceholder: '#6e6e6e',

    // 边框色
    border: '#3c3c3c',
    borderSecondary: '#2d2d2d',

    // 活动栏
    activityBarBg: '#333333',
    activityBarFg: '#858585',
    activityBarFgActive: '#ffffff',
    activityBarIndicator: '#0078d4',

    // 侧边栏
    sidebarBg: '#252526',
    sidebarFg: '#cccccc',
    sidebarHeaderBg: '#252526',
    sidebarBorder: '#1e1e1e',

    // 标题栏
    titleBarBg: '#323233',
    titleBarFg: '#cccccc',
    titleBarBorder: '#252526',

    // 编辑区
    editorBg: '#1e1e1e',
    editorFg: '#d4d4d4',

    // 状态色
    success: '#4ec9b0',
    warning: '#dcdcaa',
    error: '#f14c4c',
    info: '#3794ff',

    // 交互状态
    hoverBg: '#2a2d2e',
    activeBg: '#37373d',
    selectedBg: '#094771',

    // 滚动条
    scrollbarBg: 'transparent',
    scrollbarThumb: '#5a5a5a4d',
    scrollbarThumbHover: '#5a5a5a80',

    // 阴影
    shadow: 'rgba(0, 0, 0, 0.36)',
    shadowSecondary: 'rgba(0, 0, 0, 0.2)',
  },
}

/** VS Code Light+ 主题 */
export const lightTheme: Theme = {
  name: 'Light+',
  mode: 'light',
  colors: {
    // 基础色
    primary: '#0066b8',
    primaryHover: '#0078d4',
    primaryActive: '#005a9e',

    // 背景色
    bgBase: '#ffffff',
    bgElevated: '#ffffff',
    bgContainer: '#f3f3f3',
    bgLayout: '#f8f8f8',
    bgSpotlight: '#e8e8e8',

    // 文字色
    textPrimary: '#333333',
    textSecondary: '#616161',
    textTertiary: '#8e8e8e',
    textDisabled: '#a5a5a5',
    textPlaceholder: '#a5a5a5',

    // 边框色
    border: '#e5e5e5',
    borderSecondary: '#f0f0f0',

    // 活动栏
    activityBarBg: '#2c2c2c',
    activityBarFg: '#858585',
    activityBarFgActive: '#ffffff',
    activityBarIndicator: '#0066b8',

    // 侧边栏
    sidebarBg: '#f3f3f3',
    sidebarFg: '#333333',
    sidebarHeaderBg: '#f3f3f3',
    sidebarBorder: '#e5e5e5',

    // 标题栏
    titleBarBg: '#dddddd',
    titleBarFg: '#333333',
    titleBarBorder: '#cccccc',

    // 编辑区
    editorBg: '#ffffff',
    editorFg: '#333333',

    // 状态色
    success: '#388a34',
    warning: '#bf8803',
    error: '#e51400',
    info: '#0066b8',

    // 交互状态
    hoverBg: '#e8e8e8',
    activeBg: '#d6ebff',
    selectedBg: '#0066b81a',

    // 滚动条
    scrollbarBg: 'transparent',
    scrollbarThumb: '#64646466',
    scrollbarThumbHover: '#646464aa',

    // 阴影
    shadow: 'rgba(0, 0, 0, 0.16)',
    shadowSecondary: 'rgba(0, 0, 0, 0.1)',
  },
}

/** 所有预设主题 */
export const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
}

/** 默认主题 */
export const defaultTheme = darkTheme

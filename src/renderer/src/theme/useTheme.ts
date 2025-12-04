/**
 * 主题管理 Hook
 */

import type { ComputedRef, Ref } from 'vue'
import type { Theme, ThemeColors, ThemeMode } from './types'
import { computed, ref, watch } from 'vue'
import { defaultTheme, themes } from './themes'

interface UseThemeReturn {
  currentTheme: ComputedRef<Theme>
  currentThemeId: Ref<string>
  themeMode: ComputedRef<ThemeMode>
  isDark: ComputedRef<boolean>
  colors: ComputedRef<ThemeColors>
  customColors: Ref<Partial<ThemeColors>>
  setTheme: (themeId: string) => void
  toggleMode: () => void
  setCustomColor: (key: keyof ThemeColors, value: string) => void
  resetCustomColors: () => void
  getAvailableThemes: () => Array<{ id: string, name: string, mode: ThemeMode }>
  loadThemeFromStorage: () => Promise<void>
}

// 全局主题状态
const currentThemeId = ref<string>('dark')
const customColors = ref<Partial<ThemeColors>>({})

/**
 * 将主题颜色应用到 CSS 变量
 */
function applyThemeToCSS(theme: Theme): void {
  const root = document.documentElement
  const colors = { ...theme.colors, ...customColors.value }

  // 设置 CSS 变量
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVar, value)
  })

  // 设置主题模式类
  root.classList.remove('theme-light', 'theme-dark')
  root.classList.add(`theme-${theme.mode}`)

  // 设置 color-scheme 以支持原生滚动条等
  root.style.colorScheme = theme.mode
}

/**
 * 从存储加载主题设置
 */
async function loadThemeFromStorage(): Promise<void> {
  try {
    const savedThemeId = await app.storage.get<string>('theme:id')
    const savedCustomColors = await app.storage.get<Partial<ThemeColors>>('theme:customColors')

    if (savedThemeId && themes[savedThemeId]) {
      currentThemeId.value = savedThemeId
    }
    if (savedCustomColors) {
      customColors.value = savedCustomColors
    }
  }
  catch (e) {
    console.error('Failed to load theme from storage:', e)
  }
}

/**
 * 保存主题设置到存储
 */
async function saveThemeToStorage(): Promise<void> {
  try {
    await app.storage.set('theme:id', currentThemeId.value)
    await app.storage.set('theme:customColors', customColors.value)
  }
  catch (e) {
    console.error('Failed to save theme to storage:', e)
  }
}

export function useTheme(): UseThemeReturn {
  // 当前主题
  const currentTheme = computed<Theme>(() => {
    return themes[currentThemeId.value] || defaultTheme
  })

  // 当前主题模式
  const themeMode = computed<ThemeMode>(() => currentTheme.value.mode)

  // 是否暗色模式
  const isDark = computed(() => themeMode.value === 'dark')

  // 合并后的颜色（主题色 + 自定义色）
  const colors = computed<ThemeColors>(() => {
    return { ...currentTheme.value.colors, ...customColors.value }
  })

  /**
   * 切换主题
   */
  function setTheme(themeId: string): void {
    if (themes[themeId]) {
      currentThemeId.value = themeId
    }
  }

  /**
   * 切换明暗模式
   */
  function toggleMode(): void {
    currentThemeId.value = isDark.value ? 'light' : 'dark'
  }

  /**
   * 设置自定义颜色
   */
  function setCustomColor(key: keyof ThemeColors, value: string): void {
    customColors.value = { ...customColors.value, [key]: value }
  }

  /**
   * 重置自定义颜色
   */
  function resetCustomColors(): void {
    customColors.value = {}
  }

  /**
   * 获取所有可用主题
   */
  function getAvailableThemes(): Array<{ id: string, name: string, mode: ThemeMode }> {
    return Object.entries(themes).map(([id, theme]) => ({
      id,
      name: theme.name,
      mode: theme.mode,
    }))
  }

  // 监听主题变化并应用
  watch(
    [currentTheme, customColors],
    ([theme]) => {
      applyThemeToCSS(theme)
      saveThemeToStorage()
    },
    { immediate: true, deep: true },
  )

  return {
    // 状态
    currentTheme,
    currentThemeId,
    themeMode,
    isDark,
    colors,
    customColors,

    // 方法
    setTheme,
    toggleMode,
    setCustomColor,
    resetCustomColors,
    getAvailableThemes,
    loadThemeFromStorage,
  }
}

// 初始化时加载主题
loadThemeFromStorage()

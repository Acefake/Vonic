import {
  defineConfig,
  presetAttributify,
  presetUno,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  transformers: [
    transformerDirectives(),
  ],
  shortcuts: {
    // 布局
    'flex-center': 'flex items-center justify-center',
    'flex-col': 'flex flex-col',
    'flex-between': 'flex items-center justify-between',
    'full': 'w-full h-full',
    'absolute-full': 'absolute inset-0',
    // 面板
    'panel': 'flex flex-col h-full',
    'panel-header': 'h-35px px-3 flex-between shrink-0',
    'panel-content': 'flex-1 overflow-hidden flex flex-col',
    'panel-footer': 'p-2 flex gap-1 flex-wrap border-t border-border',
  },
  theme: {
    colors: {
      // 主题色
      'primary': 'var(--primary)',
      'primary-hover': 'var(--primary-hover)',
      // 背景色
      'base': 'var(--bg-base)',
      'elevated': 'var(--bg-elevated)',
      'container': 'var(--bg-container)',
      // 文字色
      'text-1': 'var(--text-primary)',
      'text-2': 'var(--text-secondary)',
      'text-3': 'var(--text-tertiary)',
      // 标题栏
      'title-bar-bg': 'var(--title-bar-bg)',
      'title-bar-fg': 'var(--title-bar-fg)',
      'title-bar-border': 'var(--title-bar-border)',
      // 边框
      'border': 'var(--border)',
      // 交互
      'hover': 'var(--hover-bg)',
      'active': 'var(--active-bg)',
    },
  },
  rules: [
    // 自定义规则：transition
    ['transition-fast', { transition: 'var(--transition-fast)' }],
    ['transition-normal', { transition: 'var(--transition-normal)' }],
  ],
})

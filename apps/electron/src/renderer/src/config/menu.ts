/**
 * 顶部菜单配置
 */

import type { MenuProps } from 'ant-design-vue'

export interface MenuAction {
  /** 动作类型 */
  type: 'window' | 'command' | 'route' | 'external' | 'custom'
  /** 窗口名称（type: window） */
  window?: string
  /** 命令（type: command） */
  command?: string
  /** 路由路径（type: route） */
  route?: string
  /** 外部链接（type: external） */
  url?: string
  /** 自定义处理函数名（type: custom） */
  handler?: string
}

export interface MenuItemConfig {
  key: string
  label: string
  icon?: string
  action?: MenuAction
  children?: MenuItemConfig[]
  type?: 'divider' | 'group'
  disabled?: boolean
}

/**
 * 默认顶部菜单配置
 */
export const defaultMenuConfig: MenuItemConfig[] = [
  {
    key: 'file',
    label: '文件',
    children: [
      {
        key: 'file:settings',
        label: '设置',
        icon: 'SettingOutlined',
        action: { type: 'window', window: 'settings' },
      },
      { key: 'divider-1', type: 'divider', label: '' },
      {
        key: 'file:exit',
        label: '退出',
        icon: 'LogoutOutlined',
        action: { type: 'custom', handler: 'exit' },
      },
    ],
  },
  {
    key: 'view',
    label: '视图',
    children: [
      {
        key: 'view:reload',
        label: '刷新',
        icon: 'ReloadOutlined',
        action: { type: 'custom', handler: 'reload' },
      },
      {
        key: 'view:devtools',
        label: '开发者工具',
        icon: 'CodeOutlined',
        action: { type: 'custom', handler: 'devtools' },
      },
      { key: 'divider-2', type: 'divider', label: '' },
      {
        key: 'view:theme',
        label: '切换主题',
        icon: 'BgColorsOutlined',
        action: { type: 'custom', handler: 'toggleTheme' },
      },
    ],
  },
  {
    key: 'tools',
    label: '工具',
    children: [
      {
        key: 'tools:plugins',
        label: '插件管理',
        icon: 'AppstoreOutlined',
        action: { type: 'route', route: '/' },
      },
      {
        key: 'tools:logs',
        label: '日志目录',
        icon: 'FileTextOutlined',
        action: { type: 'custom', handler: 'openLogs' },
      },
    ],
  },
  {
    key: 'help',
    label: '帮助',
    children: [
      {
        key: 'help:docs',
        label: '文档',
        icon: 'ReadOutlined',
        action: { type: 'external', url: 'https://github.com' },
      },
      { key: 'divider-3', type: 'divider', label: '' },
      {
        key: 'help:about',
        label: '关于',
        icon: 'InfoCircleOutlined',
        action: { type: 'custom', handler: 'showAbout' },
      },
    ],
  },
]

/**
 * 将菜单配置转换为 Ant Design 格式
 */
export function toAntdMenuItems(config: MenuItemConfig[]): MenuProps['items'] {
  return config.map((item) => {
    if (item.type === 'divider') {
      return { type: 'divider', key: item.key }
    }

    const menuItem: any = {
      key: item.key,
      label: item.label,
      disabled: item.disabled,
    }

    if (item.children?.length) {
      menuItem.children = toAntdMenuItems(item.children)
    }

    return menuItem
  })
}

/**
 * 菜单动作处理器
 */
export const menuActionHandlers: Record<string, () => void> = {
  exit: () => app.window.current.close(),
  reload: () => app.debug.reload(),
  devtools: () => app.debug.openDevTools({ mode: 'right' }),
  openLogs: () => app.debug.openLogDirectory(),
  showAbout: () => app.debug.showAppInfo(),
  toggleTheme: () => {
    // 由组件注入
  },
}

/**
 * 执行菜单动作
 */
export function executeMenuAction(action: MenuAction | undefined, router?: any): void {
  if (!action)
    return

  switch (action.type) {
    case 'window':
      if (action.window) {
        (app.window as any)[action.window]?.open()
      }
      break
    case 'command':
      if (action.command) {
        window.electron.ipcRenderer.invoke(action.command)
      }
      break
    case 'route':
      if (action.route && router) {
        router.push(action.route)
      }
      break
    case 'external':
      if (action.url) {
        app.file.openExternal(action.url)
      }
      break
    case 'custom':
      if (action.handler && menuActionHandlers[action.handler]) {
        menuActionHandlers[action.handler]()
      }
      break
  }
}

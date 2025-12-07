/**
 * 活动栏（侧边导航）配置
 */

export interface ActivityItemConfig {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 图标名称（来自 @ant-design/icons-vue） */
  icon: string
  /** 提示文本 */
  tooltip?: string
  /** 面板类型 */
  panelType: 'builtin' | 'plugin'
  /** 内置面板组件名（panelType: builtin） */
  builtinPanel?: string
  /** 位置：top 顶部，bottom 底部 */
  position?: 'top' | 'bottom'
  /** 是否默认选中 */
  default?: boolean
}

/**
 * 默认活动栏配置
 */
export const defaultActivities: ActivityItemConfig[] = [
  {
    id: 'home',
    name: '首页',
    icon: 'HomeOutlined',
    tooltip: '首页',
    panelType: 'builtin',
    builtinPanel: 'HomeMenuPanel',
    position: 'top',
    default: true,
  },
  {
    id: 'plugins',
    name: '插件',
    icon: 'AppstoreOutlined',
    tooltip: '插件管理',
    panelType: 'builtin',
    builtinPanel: 'PluginManagerPanel',
    position: 'top',
  },
  {
    id: 'settings',
    name: '设置',
    icon: 'SettingOutlined',
    tooltip: '设置',
    panelType: 'builtin',
    builtinPanel: 'SettingsPanel',
    position: 'bottom',
  },
]

/**
 * 获取默认选中的活动项 ID
 */
export function getDefaultActivityId(): string {
  const defaultItem = defaultActivities.find(item => item.default)
  return defaultItem?.id || defaultActivities[0]?.id || ''
}

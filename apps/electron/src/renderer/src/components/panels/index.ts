import type { Component } from 'vue'
import { markRaw } from 'vue'
import HomeMenuPanel from './HomeMenuPanel.vue'
import PluginManagerPanel from './PluginManagerPanel.vue'
import PluginMenuPanel from './PluginMenuPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

// 内置面板组件映射
export const builtinPanels: Record<string, Component> = {
  HomeMenuPanel: markRaw(HomeMenuPanel),
  PluginManagerPanel: markRaw(PluginManagerPanel),
  PluginMenuPanel: markRaw(PluginMenuPanel),
  SettingsPanel: markRaw(SettingsPanel),
}

export { HomeMenuPanel, PluginManagerPanel, PluginMenuPanel, SettingsPanel }

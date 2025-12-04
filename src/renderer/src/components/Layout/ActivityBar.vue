<script setup lang="ts">
import type { Component } from 'vue'
import type { ActivityItemConfig } from '@/renderer/config'
import * as Icons from '@ant-design/icons-vue'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { builtinPanels, PluginMenuPanel } from '@/renderer/components/panels'
import { defaultActivities, getDefaultActivityId } from '@/renderer/config'
import { usePluginManager } from '@/renderer/hooks/usePluginManager'
import { panelComponents, panelConfigs } from '@/renderer/plugins/pluginUI'
import { loadPluginComponent } from '@/renderer/plugins/sfcLoader'

const { plugins, loadPlugins } = usePluginManager()

// 状态
const selectedActivity = ref<string>(getDefaultActivityId())
const panelWidth = ref(280)
const isResizing = ref(false)
const panelCollapsed = ref(false)
const currentPanelComponent = shallowRef<Component | null>(null)
const currentPanelProps = ref<Record<string, any>>({})

const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 500
const ICON_BAR_WIDTH = 48

// 所有活动项（内置 + 插件扩展）
const allActivities = computed<ActivityItemConfig[]>(() => {
  const items: ActivityItemConfig[] = [...defaultActivities]

  // 添加已启用插件的活动项
  plugins.value.forEach((plugin) => {
    if (plugin.enabled) {
      items.push({
        id: plugin.id,
        name: plugin.name,
        icon: 'AppstoreOutlined',
        panelType: 'plugin',
        position: 'top',
      })
    }
  })

  return items
})

// 顶部活动项
const topActivities = computed(() => allActivities.value.filter(a => a.position !== 'bottom'))
// 底部活动项
const bottomActivities = computed(() => allActivities.value.filter(a => a.position === 'bottom'))

// 当前选中的活动项
const currentActivity = computed(() => {
  return allActivities.value.find(a => a.id === selectedActivity.value)
})

// 当前面板标题
const panelTitle = computed(() => {
  return currentActivity.value?.name || '菜单'
})

// 加载面板组件
async function loadPanelComponent(activity: ActivityItemConfig): Promise<void> {
  if (activity.panelType === 'builtin' && activity.builtinPanel) {
    // 内置面板
    currentPanelComponent.value = builtinPanels[activity.builtinPanel] || null
    currentPanelProps.value = {}
  }
  else if (activity.panelType === 'plugin') {
    // 插件面板
    const panelConfig = panelConfigs.value.get(activity.id)

    if (panelConfig) {
      // 插件注册了自定义面板
      if (panelConfig.type === 'component' && panelConfig.componentPath) {
        // 加载插件自定义组件
        const cached = panelComponents.value.get(activity.id)
        if (cached) {
          currentPanelComponent.value = cached
        }
        else {
          try {
            const pluginPath = await window.electron.ipcRenderer.invoke('plugin:getPath', activity.id)
            if (pluginPath) {
              const comp = await loadPluginComponent(pluginPath, panelConfig.componentPath)
              if (comp) {
                panelComponents.value.set(activity.id, comp)
                currentPanelComponent.value = comp
              }
            }
          }
          catch (e) {
            console.error('Failed to load plugin panel component:', e)
            currentPanelComponent.value = PluginMenuPanel
            currentPanelProps.value = { pluginId: activity.id }
          }
        }
        currentPanelProps.value = panelConfig.menuItems ? { menuItems: panelConfig.menuItems } : {}
      }
      else if (panelConfig.type === 'builtin' && panelConfig.builtinComponent) {
        // 插件使用内置面板组件
        currentPanelComponent.value = builtinPanels[panelConfig.builtinComponent] || PluginMenuPanel
        currentPanelProps.value = { pluginId: activity.id }
      }
      else {
        // 默认使用菜单面板
        currentPanelComponent.value = PluginMenuPanel
        currentPanelProps.value = { pluginId: activity.id }
      }
    }
    else {
      // 插件未注册面板，使用默认菜单面板
      currentPanelComponent.value = PluginMenuPanel
      currentPanelProps.value = { pluginId: activity.id }
    }
  }
  else {
    currentPanelComponent.value = null
    currentPanelProps.value = {}
  }
}

// 监听活动项变化
watch(selectedActivity, async (newVal) => {
  if (newVal) {
    const activity = allActivities.value.find(a => a.id === newVal)
    if (activity) {
      await loadPanelComponent(activity)
    }
  }
  else {
    currentPanelComponent.value = null
    currentPanelProps.value = {}
  }
})

// 事件处理
function handleActivitySelect(activityId: string) {
  if (selectedActivity.value === activityId) {
    selectedActivity.value = ''
    panelCollapsed.value = true
  }
  else {
    selectedActivity.value = activityId
    if (panelCollapsed.value) {
      panelCollapsed.value = false
    }
  }
}

function togglePanel() {
  panelCollapsed.value = !panelCollapsed.value
}

function getIconComponent(iconName?: string): Component | undefined {
  if (!iconName)
    return undefined
  return (Icons as any)[iconName]
}

// 拖动调整宽度
function startResize(e: MouseEvent) {
  isResizing.value = true
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isResizing.value)
    return
  const newWidth = e.clientX - ICON_BAR_WIDTH
  if (newWidth >= MIN_PANEL_WIDTH && newWidth <= MAX_PANEL_WIDTH) {
    panelWidth.value = newWidth
  }
}

function onMouseUp() {
  isResizing.value = false
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  loadPlugins()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div class="flex h-full relative">
    <!-- 活动图标栏 -->
    <div class="activity-icon-bar">
      <div class="flex-1 flex-col items-center">
        <div
          v-for="item in topActivities"
          :key="item.id"
          class="activity-icon-item"
          :class="{ active: selectedActivity === item.id }"
          :title="item.tooltip || item.name"
          @click="handleActivitySelect(item.id)"
        >
          <component :is="getIconComponent(item.icon)" />
        </div>
      </div>
      <div class="flex-col items-center">
        <div
          v-for="item in bottomActivities"
          :key="item.id"
          class="activity-icon-item"
          :class="{ active: selectedActivity === item.id }"
          :title="item.tooltip || item.name"
          @click="handleActivitySelect(item.id)"
        >
          <component :is="getIconComponent(item.icon)" />
        </div>
      </div>
    </div>

    <!-- 面板区域 -->
    <div
      v-show="!panelCollapsed && selectedActivity"
      class="panel-container"
      :style="{ width: `${panelWidth}px` }"
    >
      <div class="h-35px px-5 pr-2 flex-between shrink-0">
        <span class="text-11px font-400 uppercase tracking-wide text-text-2">{{ panelTitle }}</span>
        <MenuFoldOutlined class="collapse-btn" @click="togglePanel" />
      </div>
      <div class="panel-content">
        <component :is="currentPanelComponent" v-if="currentPanelComponent" v-bind="currentPanelProps" />
        <a-empty v-else description="正在加载..." class="flex-1 flex-center" />
      </div>
      <div class="resize-handle" @mousedown="startResize" />
    </div>

    <!-- 折叠按钮 -->
    <div v-show="panelCollapsed && selectedActivity" class="collapsed-btn" @click="togglePanel">
      <MenuUnfoldOutlined />
    </div>
  </div>
</template>

<style scoped>
/* 活动图标栏 */
.activity-icon-bar {
  width: 48px;
  background: var(--activity-bar-bg);
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  flex-shrink: 0;
}

.activity-icon-item {
  width: 40px;
  height: 40px;
  margin: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--activity-bar-fg);
  cursor: pointer;
  border-radius: 6px;
  transition: all var(--transition-fast);
}
.activity-icon-item:hover {
  color: var(--activity-bar-fg-active);
  background: rgba(255, 255, 255, 0.1);
}
.activity-icon-item.active {
  color: var(--activity-bar-fg-active);
  background: rgba(255, 255, 255, 0.15);
}

/* 面板容器 */
.panel-container {
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width var(--transition-normal);
  flex-shrink: 0;
}

.collapse-btn {
  font-size: 14px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  transition: color var(--transition-fast);
}
.collapse-btn:hover { color: var(--text-primary); }

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 拖动手柄 */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  transition: background var(--transition-fast);
}
.resize-handle:hover { background: var(--primary); }

/* 折叠按钮 */
.collapsed-btn {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  cursor: pointer;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: color var(--transition-fast);
}
.collapsed-btn:hover { color: var(--text-primary); }
</style>

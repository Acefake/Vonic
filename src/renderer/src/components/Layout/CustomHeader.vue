<script setup lang="ts">
import { CloseOutlined, MinusOutlined } from '@ant-design/icons-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  defaultMenuConfig,
  executeMenuAction,
  menuActionHandlers,
  toAntdMenuItems,
} from '@/renderer/config'
import { useTheme } from '@/renderer/theme'

const router = useRouter()
const isMaximized = ref(false)
const productConfig = app.productConfig
const { toggleMode } = useTheme()

// 注册主题切换处理器
menuActionHandlers.toggleTheme = toggleMode

// 从配置生成菜单项
const menuItems = toAntdMenuItems(defaultMenuConfig)

// 查找菜单配置
function findMenuConfig(key: string, items = defaultMenuConfig): any {
  for (const item of items) {
    if (item.key === key)
      return item
    if (item.children) {
      const found = findMenuConfig(key, item.children)
      if (found)
        return found
    }
  }
  return null
}

/**
 * Handle menu click
 */
function handleMenuClick({ key }: { key: string | number }): void {
  const menuKey = String(key)
  const config = findMenuConfig(menuKey)
  if (config?.action) {
    executeMenuAction(config.action, router)
  }
}

/**
 * 最小化窗口
 */
function minimizeWindow() {
  app.window.current.minimize()
}

/**
 * 最大化/还原窗口
 */
function toggleMaximize() {
  app.window.current.toggleMaximize()
  isMaximized.value = !isMaximized.value
}

/**
 * 关闭窗口
 */
function closeWindow() {
  app.window.current.close()
}
</script>

<template>
  <div class="custom-header">
    <span class="text-13px text-title-bar-fg whitespace-nowrap">{{ productConfig.name }}</span>
    <div class="header-menu">
      <a-menu mode="horizontal" :items="menuItems" class="top-menu" @click="handleMenuClick" />
    </div>
    <div class="flex">
      <button class="window-control-btn" @click="minimizeWindow">
        <MinusOutlined />
      </button>
      <button class="window-control-btn" @click="toggleMaximize">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="2.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" />
          <rect x="0.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>
      <button class="window-control-btn close-btn" @click="closeWindow">
        <CloseOutlined />
      </button>
    </div>
  </div>
</template>

<style scoped>
.custom-header {
  display: flex;
  align-items: center;
  height: 36px;
  padding-left: 16px;
  background: var(--title-bar-bg);
  border-bottom: 1px solid var(--title-bar-border);
  -webkit-app-region: drag;
}

.header-menu {
  flex: 1;
  display: flex;
  margin-left: 8px;
  -webkit-app-region: no-drag;
}

.top-menu {
  background: transparent;
  border: none;
}

.window-control-btn {
  width: 46px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--title-bar-fg);
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background var(--transition-fast);
}
.window-control-btn:hover { background: var(--hover-bg); }
.window-control-btn:active { background: var(--active-bg); }
.close-btn:hover { background: #e81123 !important; }
.close-btn:active { background: #c10712 !important; }
</style>

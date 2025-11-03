<script setup lang="ts">
import {
  CloseOutlined,
  MinusOutlined,
} from '@ant-design/icons-vue'
import { ref } from 'vue'
import { useApp } from '@/renderer/app'

// 使用全局 app 对象，无需导入 app 本身
const $app = useApp()

const isMaximized = ref(false)
const productConfig = $app.theme.getConfig()

/**
 * 最小化窗口
 */
function minimizeWindow() {
  $app.window.current.minimize()
}

/**
 * 最大化/还原窗口
 */
function toggleMaximize() {
  $app.window.current.toggleMaximize()
  isMaximized.value = !isMaximized.value
}

/**
 * 关闭窗口
 */
function closeWindow() {
  $app.window.current.close()
}
</script>

<template>
  <div class="custom-header">
    <div class="header-left">
      <span class="app-title">{{ productConfig.name }}</span>
    </div>

    <div class="window-controls">
      <!-- 最小化 -->
      <button class="window-control-btn minimize-btn" @click="minimizeWindow">
        <MinusOutlined />
      </button>

      <!-- 最大化/还原 -->
      <button class="window-control-btn maximize-btn" @click="toggleMaximize">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="2.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" />
          <rect x="0.5" y="2.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>

      <!-- 关闭 -->
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
  justify-content: space-between;
  height: 40px;
  padding: 0 0 0 24px;
  background: v-bind('productConfig.themeColor');
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  -webkit-app-region: drag;
}

.header-left {
  flex: 1;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.window-controls {
  display: flex;
  height: 50px;
}

.window-control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 50px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  -webkit-app-region: no-drag;
}

.window-control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.window-control-btn:active {
  background: rgba(255, 255, 255, 0.15);
}

.minimize-btn {
  font-size: 14px;
}

.close-btn:hover {
  background: #e81123 !important;
}

.close-btn:active {
  background: #c10712 !important;
}
</style>

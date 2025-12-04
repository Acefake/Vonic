<script setup lang="ts">
import { CloseOutlined, DragOutlined, MinusOutlined, ToolOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'

const isMinimized = ref(false)

function minimize() {
  isMinimized.value = !isMinimized.value
  // Resize window via IPC if needed, or just change UI
  // For a real floating window, we might want to resize the BrowserWindow itself.
  // But for simplicity, let's just change the UI size and let the user drag it.
  // Actually, we should resize the window.
  if (isMinimized.value) {
    window.electron.ipcRenderer.send('window:resize', { width: 50, height: 50 })
  }
  else {
    window.electron.ipcRenderer.send('window:resize', { width: 80, height: 400 })
  }
}

onMounted(() => {
  console.log('Toolbar mounted')
})

function close() {
  window.electron.ipcRenderer.send('window:close')
}
</script>

<template>
  <div class="toolbar-container" :class="{ minimized: isMinimized }">
    <div class="drag-handle">
      <DragOutlined />
    </div>

    <div v-if="!isMinimized" class="tools">
      <a-tooltip title="工具 1" placement="left">
        <a-button type="text" shape="circle">
          <template #icon>
            <ToolOutlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="工具 2" placement="left">
        <a-button type="text" shape="circle">
          <template #icon>
            <ToolOutlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip title="工具 3" placement="left">
        <a-button type="text" shape="circle">
          <template #icon>
            <ToolOutlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <div class="actions">
      <a-button type="text" size="small" @click="minimize">
        <template #icon>
          <MinusOutlined />
        </template>
      </a-button>
      <a-button type="text" size="small" danger @click="close">
        <template #icon>
          <CloseOutlined />
        </template>
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-container {
  width: 100%;
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toolbar-container.minimized {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
}

.drag-handle {
  cursor: move;
  -webkit-app-region: drag;
  padding: 4px;
  color: #999;
}

.tools {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0;
  width: 100%;
  align-items: center;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.anticon) {
  font-size: 20px;
}

:deep(.ant-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

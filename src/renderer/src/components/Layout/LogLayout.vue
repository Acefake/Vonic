<script setup lang="ts">
import {
  ClearOutlined,
  DownloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons-vue'

import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useLogStore } from '@/renderer/store/logStore'

const logStore = useLogStore()
const { filteredLogs, isPaused } = storeToRefs(logStore)

// 日志容器引用
const logContainerRef = ref<HTMLElement>()

/**
 * 滚动到底部
 */
function scrollToBottom(): void {
  setTimeout(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
    }
  }, 0)
}

/**
 * 导出日志
 */
function exportLogs(): void {
  const content = logStore.exportLogsAsText()

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 处理过滤级别变化
 */
// function handleFilterLevelChange(value: string): void {
//   const newLevel = value as LogFilter
//   // 检查值是否真的改变了，避免不必要的更新
//   if (logStore.filterLevel !== newLevel) {
//     logStore.setFilterLevel(newLevel)
//   }
// }

// 监听日志变化，自动滚动到底部
watch(
  () => filteredLogs.value.length,
  () => {
    if (!isPaused.value) {
      scrollToBottom()
    }
  },
  { flush: 'post' }, // 在 DOM 更新后执行
)

// 暴露 Store 方法给父组件使用（兼容性）
defineExpose({
  addLog: logStore.addLog,
  clearLogs: logStore.clearLogs,
  // 额外暴露 Store 实例
  logStore,
})
</script>

<template>
  <div class="log-layout">
    <!-- 工具栏 -->
    <div class="log-toolbar">
      <div class="toolbar-left">
        <!-- <a-select
          :value="filterLevel"
          size="small"
          style="width: 100px"
          @change="handleFilterLevelChange"
        >
          <a-select-option value="all">
            全部
          </a-select-option>
          <a-select-option value="info">
            信息
          </a-select-option>
          <a-select-option value="success">
            成功
          </a-select-option>
          <a-select-option value="warning">
            警告
          </a-select-option>
          <a-select-option value="error">
            错误
          </a-select-option>
          <a-select-option value="debug">
            调试
          </a-select-option>
        </a-select> -->

        共 {{ filteredLogs.length }} 条
      </div>

      <div class="toolbar-right">
        <!-- 暂停/继续 -->
        <a-tooltip :title="isPaused ? '继续滚动' : '暂停滚动'">
          <a-button
            type="text"
            size="small"
            @click="logStore.togglePause"
          >
            <template #icon>
              <PauseCircleOutlined v-if="!isPaused" />
              <PlayCircleOutlined v-else />
            </template>
          </a-button>
        </a-tooltip>

        <!-- 导出日志 -->
        <a-tooltip title="导出日志">
          <a-button
            type="text"
            size="small"
            @click="exportLogs"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
          </a-button>
        </a-tooltip>

        <!-- 清空日志 -->
        <a-tooltip title="清空日志">
          <a-button
            type="text"
            size="small"
            danger
            @click="logStore.clearLogs"
          >
            <template #icon>
              <ClearOutlined />
            </template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 日志内容区域 -->
    <div ref="logContainerRef" class="log-container">
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        class="log-item"
        :class="`log-${log.level}`"
      >
        <span class="log-content">
          <span>[{{ log.level.toUpperCase() }}]</span>
          <span class="log-message">{{ log.message }}</span>
          <span v-if="log.details" class="log-details">{{ log.details }}</span>
        </span>

        <div class="log-timestamp">
          {{ log.timestamp }}
        </div>
      </div>

      <!-- 空状态 -->
      <a-empty
        v-if="filteredLogs.length === 0"
        description="暂无日志"
      />
    </div>
  </div>
</template>

<style scoped>
.log-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  width: 280px;
}

.log-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.log-item {
  margin-bottom: 4px;
  padding: 2px 0;
  word-break: break-all;
  white-space: pre-wrap;
}

.log-content {
  display: inline;
}

.log-level-prefix {
  font-weight: 500;
  margin-right: 4px;
}

.log-timestamp {
  color: #8c8c8c;
  font-size: 11px;
}

.log-message {
  margin-left: 4px;
}

.log-details {
  display: block;
  margin-left: 4px;
  font-size: 9px;
  opacity: 0.85;
}

/* 不同级别的颜色 */
.log-item.log-info .log-level-prefix {
  color: #1890ff;
}

.log-item.log-info .log-message {
  color: #262626;
}

.log-item.log-success .log-level-prefix {
  color: #52c41a;
}

.log-item.log-success .log-message {
  color: #262626;
}

.log-item.log-warning .log-level-prefix {
  color: #fa8c16;
}

.log-item.log-warning .log-message {
  color: #d46b08;
}

.log-item.log-error .log-level-prefix {
  color: #ff4d4f;
}

.log-item.log-error .log-message {
  color: #cf1322;
}

.log-item.log-debug .log-level-prefix {
  color: #8c8c8c;
}

.log-item.log-debug .log-message {
  color: #8c8c8c;
  opacity: 0.8;
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.log-container::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>

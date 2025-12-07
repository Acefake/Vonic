<script setup lang="ts">
import { ref } from 'vue'
import { usePlugin } from '@/renderer/hooks/use-plugin'

interface NoteItem {
  content: string
  createdAt: string
}

interface EditorResult {
  action: string
  timestamp: number
  count: number
  notes: NoteItem[]
}

// 使用插件 - 自动管理状态和监听器
const { isActive, command, on } = usePlugin('popup-plugin')

// 从插件接收的数据
const result = ref<EditorResult | null>(null)

// 监听插件消息（自动清理）
on('editorResult', (data: EditorResult) => {
  result.value = data
})

// 打开编辑器
const openEditor = () => command('openEditor')

// 清空结果
function clearResult() {
  result.value = null
}

// 格式化时间
const formatTime = (ts: number) => new Date(ts).toLocaleString()
</script>

<template>
  <div class="p-8 max-w-800px mx-auto">
    <h1 class="text-center mb-8 text-blue-500">
      📦 插件通信演示
    </h1>

    <!-- 操作按钮 -->
    <div class="flex gap-4 justify-center mb-8">
      <a-button v-if="isActive" type="primary" size="large" @click="openEditor">
        🪟 打开笔记编辑器
      </a-button>
      <a-button @click="clearResult">
        清空结果
      </a-button>
    </div>

    <!-- 接收到的数据 -->
    <div>
      <h2 class="mb-4 text-gray-800">
        📥 从插件窗口接收的数据
      </h2>
      <a-alert
        v-if="!result"
        message="暂无数据"
        description="点击上方按钮打开插件窗口，编辑后点击【确定并关闭】，数据将显示在这里"
        type="info"
        show-icon
      />

      <div v-else class="bg-white rounded-xl p-6 shadow-md">
        <div class="flex justify-between items-center mb-4">
          <a-tag color="green">
            {{ result.action }}
          </a-tag>
          <span class="text-gray-400 text-sm">{{ formatTime(result.timestamp) }}</span>
        </div>

        <a-statistic title="笔记数量" :value="result.count" class="mb-6" />

        <div>
          <h3 class="mb-3 text-sm text-gray-500">
            笔记列表：
          </h3>
          <a-list
            :data-source="result.notes"
            :locale="{ emptyText: '暂无笔记' }"
            bordered
            size="small"
          >
            <template #renderItem="{ item, index }">
              <a-list-item>
                <span class="text-blue-500 font-bold mr-2">{{ index + 1 }}.</span>
                <span class="flex-1">{{ item.content }}</span>
                <template #extra>
                  <span class="text-gray-400 text-xs">{{ item.createdAt }}</span>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </div>

        <div class="mt-6">
          <a-collapse>
            <a-collapse-panel header="查看原始 JSON 数据">
              <pre class="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto">{{ JSON.stringify(result, null, 2) }}</pre>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DeleteOutlined, EditOutlined, PlusOutlined, ImportOutlined, ExportOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
import { app } from '@/renderer/src/app'

interface ToDayFile {
  id: string
  name: string
  date: string
  filePath: string
  tags: string[]
  category: string
  status: 'pending' | 'completed' | 'archived'
  createdAt: Date
  updatedAt: Date
}

interface Statistics {
  total: number
  todayCount: number
  pendingCount: number
  completedCount: number
  byCategory: Record<string, number>
}

const files = ref<ToDayFile[]>([])
const todayFiles = ref<ToDayFile[]>([])
const statistics = ref<Statistics | null>(null)
const loading = ref(false)
const editingFile = ref<ToDayFile | null>(null)
const showForm = ref(false)
const newFileName = ref('')
const filterStatus = ref<'all' | 'pending' | 'completed' | 'archived'>('pending')

// 获取所有文件
const loadFiles = async (): Promise<void> => {
  loading.value = true
  try {
    const plugin = app.plugin.get('to-day-file')
    const response = await plugin.invoke('getAllFiles')
    files.value = response as ToDayFile[]
    
    const todayResponse = await plugin.invoke('getTodayFiles')
    todayFiles.value = todayResponse as ToDayFile[]

    const statsResponse = await plugin.invoke('getStatistics')
    statistics.value = statsResponse as Statistics
  }
  catch (error) {
    console.error('加载文件失败:', error)
  }
  finally {
    loading.value = false
  }
}

// 创建新文件
const createFile = async (): Promise<void> => {
  if (!newFileName.value.trim()) {
    await app.message.error('文件名不能为空')
    return
  }

  try {
    const plugin = app.plugin.get('to-day-file')
    await plugin.invoke('createFile', {
      name: newFileName.value,
      category: '默认',
      tags: [],
      status: 'pending'
    })
    
    newFileName.value = ''
    showForm.value = false
    await loadFiles()
    await app.message.success('文件创建成功')
  }
  catch (error) {
    console.error('创建文件失败:', error)
    await app.message.error('创建文件失败')
  }
}

// 更新文件状态
const updateFileStatus = async (file: ToDayFile, status: 'pending' | 'completed' | 'archived'): Promise<void> => {
  try {
    const plugin = app.plugin.get('to-day-file')
    await plugin.invoke('updateFile', file.id, { status })
    await loadFiles()
  }
  catch (error) {
    console.error('更新文件失败:', error)
  }
}

// 删除文件
const deleteFile = async (id: string): Promise<void> => {
  try {
    const plugin = app.plugin.get('to-day-file')
    await plugin.invoke('deleteFile', id)
    await loadFiles()
    await app.message.success('文件删除成功')
  }
  catch (error) {
    console.error('删除文件失败:', error)
    await app.message.error('删除文件失败')
  }
}

// 导出文件
const exportFiles = async (): Promise<void> => {
  try {
    const plugin = app.plugin.get('to-day-file')
    await plugin.invoke('exportFiles')
  }
  catch (error) {
    console.error('导出失败:', error)
  }
}

// 导入文件
const importFiles = async (): Promise<void> => {
  try {
    const plugin = app.plugin.get('to-day-file')
    const result = await plugin.invoke('importFiles')
    if (result && typeof result === 'object' && 'count' in result) {
      await app.message.success(`成功导入 ${(result as any).count} 个文件`)
      await loadFiles()
    }
  }
  catch (error) {
    console.error('导入失败:', error)
    await app.message.error('导入文件失败')
  }
}

// 过滤文件
const filteredFiles = computed(() => {
  return todayFiles.value.filter((file) => {
    if (filterStatus.value === 'all') return true
    return file.status === filterStatus.value
  })
})

// 获取状态图标
const getStatusIcon = (status: string) => {
  return status === 'completed' ? CheckCircleOutlined : ClockCircleOutlined
}

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-500'
    case 'pending':
      return 'text-orange-500'
    case 'archived':
      return 'text-gray-500'
    default:
      return 'text-blue-500'
  }
}

onMounted(() => {
  loadFiles()
})
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- 顶部统计信息 -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <div class="text-xs text-gray-500">总文件数</div>
          <div class="text-2xl font-bold text-blue-600">{{ statistics?.total || 0 }}</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <div class="text-xs text-gray-500">今日待办</div>
          <div class="text-2xl font-bold text-orange-600">{{ statistics?.todayCount || 0 }}</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <div class="text-xs text-gray-500">已完成</div>
          <div class="text-2xl font-bold text-green-600">{{ statistics?.completedCount || 0 }}</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow-sm">
          <div class="text-xs text-gray-500">待完成</div>
          <div class="text-2xl font-bold text-red-600">{{ statistics?.pendingCount || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex gap-2 p-3 border-b flex-wrap">
      <a-button type="primary" size="small" @click="showForm = !showForm">
        <template #icon><PlusOutlined /></template>
        新建文件
      </a-button>
      <a-button size="small" @click="exportFiles">
        <template #icon><ExportOutlined /></template>
        导出
      </a-button>
      <a-button size="small" @click="importFiles">
        <template #icon><ImportOutlined /></template>
        导入
      </a-button>
      <a-button size="small" @click="loadFiles" :loading="loading">
        刷新
      </a-button>

      <!-- 状态筛选 -->
      <div class="flex gap-1 ml-auto">
        <a-button
          v-for="status in ['all', 'pending', 'completed', 'archived']"
          :key="status"
          :type="filterStatus === status ? 'primary' : 'default'"
          size="small"
          @click="filterStatus = status as any"
        >
          {{ { all: '全部', pending: '待办', completed: '已完成', archived: '已归档' }[status] }}
        </a-button>
      </div>
    </div>

    <!-- 新建文件表单 -->
    <div v-if="showForm" class="bg-blue-50 p-3 border-b">
      <div class="flex gap-2">
        <a-input
          v-model:value="newFileName"
          placeholder="输入文件名..."
          size="small"
          @keyup.enter="createFile"
        />
        <a-button type="primary" size="small" @click="createFile">
          保存
        </a-button>
        <a-button size="small" @click="showForm = false">
          取消
        </a-button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="flex-1 overflow-y-auto">
      <a-spin :spinning="loading">
        <div v-if="filteredFiles.length === 0" class="p-8 text-center text-gray-400">
          <div class="text-4xl mb-2">📭</div>
          <p>暂无{{ filterStatus === 'all' ? '文件' : filterStatus === 'pending' ? '待办' : filterStatus === 'completed' ? '已完成' : '已归档' }}任务</p>
        </div>

        <div v-else class="divide-y">
          <div
            v-for="file in filteredFiles"
            :key="file.id"
            class="p-3 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <component :is="getStatusIcon(file.status)" :class="getStatusColor(file.status)" />
                  <span class="font-medium truncate">{{ file.name }}</span>
                  <a-tag color="blue" size="small" v-if="file.category">{{ file.category }}</a-tag>
                </div>
                <div class="text-xs text-gray-500">
                  <span>{{ file.date }}</span>
                  <span v-if="file.tags.length" class="ml-2">
                    标签: {{ file.tags.join(', ') }}
                  </span>
                </div>
              </div>

              <div class="flex gap-1 flex-shrink-0">
                <a-button
                  v-if="file.status === 'pending'"
                  type="text"
                  size="small"
                  @click="updateFileStatus(file, 'completed')"
                  title="标记完成"
                >
                  <template #icon><CheckCircleOutlined /></template>
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  danger
                  @click="deleteFile(file.id)"
                  title="删除"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-btn-primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

:deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
}
</style>

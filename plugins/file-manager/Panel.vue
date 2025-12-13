<script setup lang="ts">
import {
  DeleteOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FileOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { Button as AButton, List as AList, ListItem as AListItem, message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

const PLUGIN_ID = 'file-manager'
const files = ref<any[]>([])
const loading = ref(false)

// 计算统计
const imageCount = computed(() => files.value.filter(f => f.type === 'image').length)
const documentCount = computed(() => files.value.filter(f => f.type === 'document').length)
const otherCount = computed(() => files.value.filter(f => f.type === 'other').length)

// 调用插件 IPC
async function invokePlugin(channel: string, ...args: unknown[]) {
  const electron = (window as any).electron
  if (!electron?.ipcRenderer) {
    throw new Error('Electron IPC 不可用')
  }
  return await electron.ipcRenderer.invoke(`plugin:${PLUGIN_ID}:${channel}`, ...args)
}

// 加载文件列表
async function loadFiles() {
  try {
    loading.value = true
    const data = await invokePlugin('getAllFiles')
    files.value = data || []
  }
  catch (error) {
    console.error('加载文件失败:', error)
    message.error('加载文件失败')
  }
  finally {
    loading.value = false
  }
}

// 导入文件
async function importFiles() {
  try {
    console.log('开始导入文件...')
    // 尝试通过 IPC 调用 import-files
    const result = await invokePlugin('import-files')
    console.log('导入结果:', result)
    if (result?.success) {
      message.success(`成功导入 ${result.count} 个文件`)
    }
    // 重新加载文件列表
    await loadFiles()
  }
  catch (error) {
    console.error('导入文件失败:', error)
    message.error(`导入文件失败: ${(error as Error).message}`)
  }
}

// 导出文件列表
async function exportFiles() {
  try {
    console.log('开始导出文件...')
    const result = await invokePlugin('export-files')
    console.log('导出结果:', result)
    if (result?.success) {
      message.success('文件导出成功')
    }
    else if (result?.message) {
      message.info(result.message)
    }
  }
  catch (error) {
    console.error('导出文件失败:', error)
    message.error(`导出文件失败: ${(error as Error).message}`)
  }
}

// 清空文件
async function clearFiles() {
  try {
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: '确认清空',
        content: '确定要清空所有文件记录吗？此操作不可撤销。',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed)
      return
    await invokePlugin('clearFiles')
    await loadFiles()
    message.success('已清空')
  }
  catch (error) {
    console.error('清空失败:', error)
    message.error('清空失败')
  }
}

// 删除单个文件
async function removeFile(id: string) {
  try {
    await invokePlugin('removeFile', id)
    await loadFiles()
    message.success('文件已删除')
  }
  catch (error) {
    console.error('删除文件失败:', error)
    message.error('删除文件失败')
  }
}

// 在文件夹中显示
async function showInFolder(path: string) {
  try {
    await (window as any).app?.file?.showInFolder?.(path)
  }
  catch (error) {
    console.error('打开文件夹失败:', error)
    message.error('打开文件夹失败')
  }
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// 格式化日期
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

onMounted(() => {
  loadFiles()
})

/*
  Usage example: lightweight http helper

  // In renderer components you can import the helper like:
  import { get, post } from '@/app/utils/http'

  // Example GET
  const data = await get('/api/example')

  // Example POST
  const result = await post('/api/upload', { name: 'file' })

  Notes:
  - The helper returns `response.data` directly.
  - It normalizes axios errors to throw Error with `status` and `data` when available.
  - To configure a base URL for a specific area, use `createHttp(baseUrl)`.
*/
</script>

<template>
  <div class="plugin-panel">
    <div class="panel-header">
      <h3>文件管理</h3>
      <div class="header-actions">
        <AButton type="primary" size="small" @click="importFiles">
          <template #icon>
            <UploadOutlined />
          </template>
          导入文件
        </AButton>
        <AButton size="small" :disabled="files.length === 0" @click="exportFiles">
          <template #icon>
            <DownloadOutlined />
          </template>
          导出列表
        </AButton>
        <AButton danger size="small" :disabled="files.length === 0" @click="clearFiles">
          <template #icon>
            <DeleteOutlined />
          </template>
          清空
        </AButton>
      </div>
    </div>

    <div class="panel-content">
      <!-- 统计信息 -->
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">
            总文件数
          </div>
          <div class="stat-value">
            {{ files.length }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            图片
          </div>
          <div class="stat-value">
            {{ imageCount }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            文档
          </div>
          <div class="stat-value">
            {{ documentCount }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            其他
          </div>
          <div class="stat-value">
            {{ otherCount }}
          </div>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="file-list">
        <div v-if="files.length === 0" class="empty-state">
          <div class="empty-icon">
            📁
          </div>
          <p>暂无文件，点击“导入文件”添加</p>
        </div>
        <div v-else class="list-container">
          <AList :data-source="files" :loading="loading">
            <template #renderItem="{ item }">
              <AListItem class="file-item">
                <div class="file-icon">
                  <FileImageOutlined v-if="item.type === 'image'" />
                  <FileTextOutlined v-else-if="item.type === 'document'" />
                  <FileOutlined v-else />
                </div>
                <div class="file-info">
                  <div class="file-name">
                    {{ item.name }}
                  </div>
                  <div class="file-meta">
                    <span class="file-path">{{ item.path }}</span>
                    <span class="file-size">{{ formatSize(item.size) }}</span>
                    <span class="file-date">{{ formatDate(item.importedAt) }}</span>
                  </div>
                </div>
                <div class="file-actions">
                  <AButton type="text" size="small" title="在文件夹中显示" @click="showInFolder(item.path)">
                    <FolderOpenOutlined />
                  </AButton>
                  <AButton type="text" danger size="small" title="删除" @click="removeFile(item.id)">
                    <DeleteOutlined />
                  </AButton>
                </div>
              </AListItem>
            </template>
          </AList>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #343a40;
}

.file-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #6c757d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.list-container {
  max-height: 400px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.file-item:hover {
  background-color: #f8f9fa;
}

.file-icon {
  font-size: 20px;
  margin-right: 12px;
  color: #1890ff;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6c757d;
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  gap: 4px;
}
</style>

<script setup>
import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { Button as AButton, message, Modal } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

const notes = ref([])

// 插件 IPC 通道前缀
const PLUGIN_ID = 'popup-plugin'

// 调用插件命令
async function executeCommand(commandId) {
  try {
    await window.electron.ipcRenderer.invoke(`command:${PLUGIN_ID}.${commandId}`)
  }
  catch (e) {
    console.error('Command failed:', e)
  }
}

// 调用插件 IPC
async function invokePlugin(channel, ...args) {
  return await window.electron.ipcRenderer.invoke(`plugin:${PLUGIN_ID}:${channel}`, ...args)
}

// 加载笔记
async function loadNotes() {
  try {
    notes.value = await invokePlugin('getNotes')
  }
  catch (e) {
    console.error('Failed to load notes:', e)
  }
}

// 添加笔记
async function addNote() {
  await executeCommand('addNote')
  // 重新加载笔记
  setTimeout(loadNotes, 300)
}

// 删除笔记
async function deleteNote(id) {
  try {
    await invokePlugin('deleteNote', id)
    notes.value = notes.value.filter(n => n.id !== id)
    message.success('笔记已删除')
  }
  catch {
    message.error('删除失败')
  }
}

// 清空笔记
async function clearNotes() {
  Modal.confirm({
    title: '确认清空',
    content: `确定要清空全部 ${notes.value.length} 条笔记吗？`,
    okType: 'danger',
    onOk: async () => {
      await executeCommand('clearNotes')
      notes.value = []
    },
  })
}

// 打开编辑器
function openEditor() {
  executeCommand('openEditor')
}

// 打开设置
function openSettings() {
  executeCommand('openSettings')
}

onMounted(loadNotes)
</script>

<template>
  <div class="notes-panel">
    <!-- 工具栏 -->
    <div class="panel-toolbar">
      <AButton type="primary" size="small" @click="addNote">
        <template #icon>
          <PlusOutlined />
        </template>
        添加笔记1111111
      </AButton>
      <AButton size="small" @click="openEditor">
        <template #icon>
          <EditOutlined />
        </template>
        编辑器
      </AButton>
    </div>

    <!-- 笔记列表 -->
    <div class="notes-list">
      <div v-if="notes.length === 0" class="empty-state">
        <FileTextOutlined class="empty-icon" />
        <p>暂无笔记</p>
        <AButton type="primary" size="small" @click="addNote">
          添加第一条笔记
        </AButton>
      </div>

      <div
        v-for="note in notes"
        :key="note.id"
        class="note-item"
      >
        <div class="note-content">
          {{ note.content }}
        </div>
        <div class="note-footer">
          <span class="note-time">{{ note.createdAt }}</span>
          <AButton type="text" danger size="small" @click="deleteNote(note.id)">
            <template #icon>
              <DeleteOutlined />
            </template>
          </AButton>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="panel-footer">
      <AButton size="small" @click="openSettings">
        <template #icon>
          <SettingOutlined />
        </template>
        设置
      </AButton>
      <AButton size="small" danger :disabled="notes.length === 0" @click="clearNotes">
        <template #icon>
          <ClearOutlined />
        </template>
        清空
      </AButton>
    </div>
  </div>
</template>

<style scoped>
.notes-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.panel-toolbar {
  padding: 8px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  gap: 8px;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #d9d9d9;
}

.note-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.2s;
}

.note-item:hover {
  background: #f0f0f0;
}

.note-content {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  word-break: break-word;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.note-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.panel-footer {
  padding: 8px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  gap: 8px;
}
</style>

<script setup>
import { onMounted, ref, toRaw } from 'vue'

// 插件 ID
const pluginId = 'popup-plugin'

// 响应式数据
const notes = ref([])
const newNote = ref('')
const loading = ref(false)

// IPC 调用封装
const ipc = {
  invoke: (channel, ...args) =>
    window.electron.ipcRenderer.invoke(`plugin:${pluginId}:${channel}`, ...args),
}

// 加载笔记
async function loadNotes() {
  loading.value = true
  try {
    notes.value = await ipc.invoke('getNotes')
  }
  catch (e) {
    console.error('Failed to load notes:', e)
  }
  finally {
    loading.value = false
  }
}

// 添加笔记
async function addNote() {
  if (!newNote.value.trim())
    return
  try {
    await ipc.invoke('addNote', newNote.value)
    newNote.value = ''
    await loadNotes()
  }
  catch (e) {
    console.error('Failed to add note:', e)
  }
}

// 删除笔记
async function deleteNote(id) {
  try {
    await ipc.invoke('deleteNote', id)
    await loadNotes()
  }
  catch (e) {
    console.error('Failed to delete note:', e)
  }
}

// 确定并关闭 - 传递数据给主窗口
async function confirmAndClose() {
  // 使用 toRaw 获取原始数据，然后序列化（IPC 无法传递 Proxy）
  const data = JSON.parse(JSON.stringify({
    action: 'confirm',
    notes: toRaw(notes.value),
    count: notes.value.length,
    timestamp: Date.now(),
  }))

  await ipc.invoke('onEditorConfirm', data)
  window.close()
}

// 取消关闭
function closeWindow() {
  window.close()
}

// 初始化
onMounted(loadNotes)
</script>

<template>
  <div class="editor-container">
    <h2>笔记编辑器</h2>

    <div class="add-section">
      <input
        v-model="newNote"
        placeholder="输入新笔记..."
        class="note-input"
        @keyup.enter="addNote"
      >
      <button class="add-btn" @click="addNote">
        添加
      </button>
    </div>

    <div class="note-list">
      <div v-if="loading" class="loading">
        加载中...
      </div>
      <div v-else-if="notes.length === 0" class="empty">
        暂无笔记
      </div>
      <div v-for="note in notes" :key="note.id" class="note-item">
        <div class="note-content">
          {{ note.content }}
        </div>
        <div class="note-footer">
          <span class="note-time">{{ note.createdAt }}</span>
          <button class="delete-btn" @click="deleteNote(note.id)">
            删除
          </button>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="confirm-btn" @click="confirmAndClose">
        确定并关闭
      </button>
      <button class="cancel-btn" @click="closeWindow">
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  padding: 24px;
  max-width: 500px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
}

.add-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.note-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.note-input:focus {
  border-color: #1890ff;
}

.add-btn {
  padding: 10px 20px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn:hover {
  background: #40a9ff;
}

.note-list {
  min-height: 200px;
}

.loading, .empty {
  text-align: center;
  color: #999;
  padding: 40px;
}

.note-item {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 12px;
}

.note-content {
  font-size: 15px;
  color: #333;
  margin-bottom: 8px;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-time {
  color: #999;
  font-size: 12px;
}

.delete-btn {
  padding: 4px 12px;
  background: transparent;
  color: #ff4d4f;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.delete-btn:hover {
  background: #ff4d4f;
  color: white;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.confirm-btn {
  flex: 1;
  padding: 12px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.confirm-btn:hover {
  background: #73d13d;
}

.cancel-btn {
  padding: 12px 24px;
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}
</style>

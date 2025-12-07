<script>
export default {
  data() {
    return {
      settings: {
        theme: 'light',
        autoSave: true,
        maxNotes: 50,
      },
      message: '',
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const saved = await window.electron.ipcRenderer.invoke('plugin:popup-plugin:getSettings')
        if (saved) {
          this.settings = { ...this.settings, ...saved }
        }
      }
      catch (e) {
        console.error('Failed to load settings:', e)
      }
    },
    async save() {
      try {
        await window.electron.ipcRenderer.invoke('plugin:popup-plugin:saveSettings', this.settings)
        this.message = '设置已保存！'
        setTimeout(() => {
          this.message = ''
        }, 2000)
      }
      catch {
        this.message = '保存失败'
      }
    },
    reset() {
      this.settings = { theme: 'light', autoSave: true, maxNotes: 50 }
      this.message = '已重置为默认值'
      setTimeout(() => {
        this.message = ''
      }, 2000)
    },
  },
}
</script>

<template>
  <div class="settings-container">
    <h2>⚙️ 插件设置</h2>

    <div class="setting-item">
      <label>主题颜色</label>
      <select v-model="settings.theme">
        <option value="light">
          浅色
        </option>
        <option value="dark">
          深色
        </option>
      </select>
    </div>

    <div class="setting-item">
      <label>自动保存</label>
      <input v-model="settings.autoSave" type="checkbox">
    </div>

    <div class="setting-item">
      <label>笔记数量上限</label>
      <input v-model="settings.maxNotes" type="number" min="1" max="100">
    </div>

    <div class="actions">
      <button class="save-btn" @click="save">
        保存设置
      </button>
      <button class="reset-btn" @click="reset">
        重置
      </button>
    </div>

    <p v-if="message" class="message">
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
.settings-container {
  padding: 24px;
  max-width: 400px;
  margin: 0 auto;
  font-family: system-ui;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 24px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 12px;
}

.setting-item label {
  font-weight: 500;
}

.setting-item select,
.setting-item input[type="number"] {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.setting-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.save-btn {
  flex: 1;
  padding: 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.reset-btn {
  padding: 12px 20px;
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
}

.message {
  text-align: center;
  color: #52c41a;
  margin-top: 16px;
}
</style>

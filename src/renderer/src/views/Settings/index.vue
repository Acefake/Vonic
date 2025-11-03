<script setup lang="ts">
import type { FieldLabelMode } from '../../utils/field-labels'
import { SettingOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useApp } from '../../app'
import { useStore } from '../../store'

import { useSettingsStore } from '../../store/settingsStore'

const $app = useApp()
const store = useStore()
const settingsStore = useSettingsStore()

const { increment } = store

const { fieldLabelMode } = storeToRefs(settingsStore)

// 设置项
const theme = ref<'light' | 'dark'>('light')
const language = ref<'zh-CN' | 'en-US'>('zh-CN')
const autoStart = ref(false)
const enableNotification = ref(true)

/**
 * 保存设置
 */
async function saveSettings(): Promise<void> {
  $app.message.success('设置已保存')
  increment()
  await $app.window.settings.close().then(() => {
    $app.message.success('设置已保存')
  }).catch(() => {
    $app.message.error('设置保存失败')
  })
}

/**
 * 重置设置
 */
function resetSettings(): void {
  theme.value = 'light'
  language.value = 'zh-CN'
  autoStart.value = false
  enableNotification.value = true
  settingsStore.setFieldLabelMode('zh-CN')
  $app.message.info('设置已重置为默认值')
}

/**
 * 打开内嵌窗口
 */
async function openEmbeddedWindow(): Promise<void> {
  // loading 窗口不需要等待结果
  $app.window.loading.open(
    {
      data: {
        message: 'Hello, world!',
      },
      waitForResult: false,
    },
  )
  setTimeout(() => {
    $app.window.loading.close()
  }, 2000)
}
/**
 * 切换字段标签显示模式
 */
function handleFieldLabelModeChange(mode: FieldLabelMode): void {
  settingsStore.setFieldLabelMode(mode)
}
</script>

<template>
  <div class="settings-container">
    <a-card :bordered="false">
      <template #title>
        <a-space>
          <SettingOutlined />
        </a-space>
      </template>

      <a-form
        :model="{ theme, language, autoStart, enableNotification }"
        layout="vertical"
        style="max-width: 600px"
      >
        <a-form-item label="字段标签显示模式">
          <a-radio-group
            :value="fieldLabelMode"
            @update:value="handleFieldLabelModeChange"
          >
            <a-radio value="zh-CN">
              中文
            </a-radio>
            <a-radio value="en-US">
              英文（大写）
            </a-radio>
          </a-radio-group>
          <div style="margin-top: 8px; color: #8c8c8c; font-size: 12px">
            切换后界面字段名将在中文和英文大写之间切换，适用于涉密场景
          </div>
        </a-form-item>

        <a-space>
          <a-button type="primary" @click="openEmbeddedWindow">
            内嵌窗口
          </a-button>
        </a-space>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="saveSettings">
              保存设置
            </a-button>
            <a-button @click="resetSettings">
              重置
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.settings-container {
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

:deep(.ant-card) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 800px;
}

:deep(.ant-card-body) {
  padding: 24px;
}
</style>

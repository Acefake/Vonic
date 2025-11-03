<script setup lang="ts">
import { computed, ref } from 'vue'
import { useApp } from '@/renderer/app'
import { useWindowParams } from '../../hooks/useWindowParams'

interface WindowData {
  userId?: string
  userName?: string
  operation?: string
  config?: {
    theme?: string
    language?: string
    autoSave?: boolean
  }
  items?: Array<{ id: number, name: string, status: string }>
  metadata?: {
    version?: string
    timestamp?: number
    source?: string
  }
}

const $app = useApp()
const { embedded } = $app.window

// 使用 hook 获取窗口参数
const { data: receivedData } = useWindowParams<WindowData>()

// 用户输入的返回数据
const returnMessage = ref('操作成功完成')
const returnData = ref({ result: 'success', data: { processed: true } })

// 处理返回数据的 JSON 字符串
const returnDataJson = computed({
  get() {
    return JSON.stringify(returnData.value, null, 2)
  },
  set(value: string) {
    try {
      returnData.value = JSON.parse(value)
    }
    catch (error) {
      console.error('JSON 解析失败:', error)
    }
  },
})

/**
 * 关闭窗口并返回数据
 * 注意：底层 close() 方法已自动处理响应式对象的序列化，无需手动调用 toRaw 和 JSON.stringify
 */
function closeWindow(): void {
  try {
    // 直接传递响应式对象，底层会自动序列化
    const result = {
      message: returnMessage.value,
      data: returnData.value, // 可以直接使用响应式对象
      timestamp: Date.now(),
    }

    embedded.close(result)
    $app.logger.info('窗口已关闭，返回结果:', result)
  }
  catch (error) {
    $app.logger.error('关闭窗口失败:', error)
    $app.message.error('关闭窗口失败')
  }
}

/**
 * 仅关闭窗口，不返回数据
 */
async function closeWindowWithoutResult(): Promise<void> {
  await embedded.close()
  $app.logger.info('窗口已关闭（无返回结果）')
}

// Hook 已自动处理窗口参数的获取和更新逻辑
</script>

<template>
  <div class="embedded-container">
    <a-card title="嵌入窗口参数接收示例" :bordered="false">
      <a-space direction="vertical" :size="24" style="width: 100%">
        <!-- 接收到的数据参数 -->
        <a-card size="small" title="📦 接收到的 data 参数">
          <pre v-if="receivedData">{{ JSON.stringify(receivedData, null, 2) }}</pre>
          <a-typography-text v-else type="secondary">
            未接收到数据参数
          </a-typography-text>
        </a-card>

        <!-- 返回数据设置 -->
        <a-card size="small" title="📤 返回给主窗口的数据">
          <a-space direction="vertical" :size="12" style="width: 100%">
            <a-form-item label="返回消息">
              <a-input v-model:value="returnMessage" placeholder="输入返回消息" />
            </a-form-item>
            <a-form-item label="返回数据 (JSON)">
              <a-textarea
                v-model:value="returnDataJson"
                :rows="4"
                placeholder="{&quot;result&quot;: &quot;success&quot;, &quot;data&quot;: {...}}"
              />
            </a-form-item>
          </a-space>
        </a-card>

        <!-- 操作按钮 -->
        <a-space>
          <a-button type="primary" @click="closeWindow">
            关闭并返回数据
          </a-button>
          <a-button @click="closeWindowWithoutResult">
            关闭窗口（无返回）
          </a-button>
        </a-space>
      </a-space>
    </a-card>
  </div>
</template>

<style scoped>
.embedded-container {
  height: 100vh;
  overflow-y: auto;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.embedded-container :deep(.ant-card) {
  height: auto;
}

pre {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}
</style>

<script setup lang="ts">
import { LoadingOutlined } from '@ant-design/icons-vue'
import { useWindowParams } from '@/renderer/hooks/useWindowParams'

const { data } = useWindowParams<{ title: string }>()

function close() {
  app.eventBus.emit('loading:close')
  app.window.current.close({ cancelled: true })
}
</script>

<template>
  <div class="loading-container">
    <LoadingOutlined class="loading-icon" />
    <span class="loading-title">{{ data?.title ?? '加载中...' }}</span>
    <a-button @click="close">
      取消
    </a-button>
  </div>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  height: 100vh;
  width: 100%;
}
.loading-icon {
  font-size: 40px;
}
.loading-title {
  margin-top: 10px;
  font-size: 16px;
  font-weight: bold;
}
</style>

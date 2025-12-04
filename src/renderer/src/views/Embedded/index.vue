<script setup lang="ts">
import { ref } from 'vue'
import { useWindowParams } from '@/renderer/hooks/useWindowParams'

const { data } = useWindowParams<any>()
const result = ref('')

function submit() {
  app.window.current.close(result.value)
}

function cancel() {
  app.window.current.close()
}
</script>

<template>
  <div class="embedded-container">
    <h2>嵌入窗口</h2>
    <div class="content">
      <p>接收到的参数：</p>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>

      <a-form-item label="返回结果">
        <a-input v-model:value="result" placeholder="请输入返回结果" />
      </a-form-item>
    </div>
    <div class="footer">
      <a-space>
        <a-button @click="cancel">
          取消
        </a-button>
        <a-button type="primary" @click="submit">
          确定
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<style scoped>
.embedded-container {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  overflow-y: auto;
}
.footer {
  margin-top: 20px;
  text-align: right;
}
</style>

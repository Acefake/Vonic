<script setup>
import { Button as AButton, message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

const PLUGIN_ID = 'todo-list'
const msg = ref('欢迎使用 待办清单')

// 调用插件 IPC
async function invokePlugin(channel, ...args) {
  return await window.electron.ipcRenderer.invoke(`plugin:${PLUGIN_ID}:${channel}`, ...args)
}

async function sayHello() {
  const data = await invokePlugin('getData')
  message.success(data.message)
}

onMounted(async () => {
  const data = await invokePlugin('getData')
  msg.value = data.message
})
</script>

<template>
  <div class="plugin-panel">
    <div class="panel-header">
      <h3>待办清单</h3>
    </div>

    <div class="panel-content">
      <p>{{ message }}</p>
      <AButton type="primary" @click="sayHello">
        打招呼
      </AButton>
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

.panel-header h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
}

.panel-content {
  flex: 1;
}
</style>

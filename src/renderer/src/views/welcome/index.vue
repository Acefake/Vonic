<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const productConfig = app.productConfig
const appVersion = ref('')
const electronVersion = ref('')

onMounted(async () => {
  const appInfo = await app.system.getAppInfo()
  appVersion.value = appInfo.version
  electronVersion.value = appInfo.electronVersion
})

function goToPlugins() {
  router.push('/')
}
</script>

<template>
  <div class="welcome-page">
    <div class="welcome-content">
      <h1 class="welcome-title">
        {{ productConfig.name }}
      </h1>
      <p class="welcome-subtitle">
        {{ productConfig.description }}
      </p>

      <div class="quick-actions">
        <a-card title="快速开始" class="action-card">
          <p>选择左侧菜单开始使用应用功能</p>
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="goToPlugins">
              插件管理
            </a-button>
          </a-space>
        </a-card>

        <a-card title="关于" class="action-card">
          <p>版本: {{ appVersion }}</p>
          <p>Electron: {{ electronVersion }}</p>
        </a-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
}

.welcome-content {
  max-width: 800px;
  width: 100%;
}

.welcome-title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
  text-align: center;
}

.welcome-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 48px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.action-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.action-card :deep(.ant-card-head) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.action-card :deep(.ant-card-body) {
  padding: 20px;
}
</style>

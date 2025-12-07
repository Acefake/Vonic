<script setup lang="ts">
import { AreaChartOutlined, CheckCircleOutlined, CloudServerOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import { onMounted, onUnmounted, ref } from 'vue'

const systemStatus = ref({
  cpu: 0,
  memory: 0,
  simulationProgress: 0,
  status: 'idle',
})

let timer: NodeJS.Timeout | null = null

onMounted(() => {
  // Simulate real-time data updates
  timer = setInterval(() => {
    systemStatus.value.cpu = Math.floor(Math.random() * 30) + 20
    systemStatus.value.memory = Math.floor(Math.random() * 20) + 40

    if (systemStatus.value.status === 'running') {
      systemStatus.value.simulationProgress += 1
      if (systemStatus.value.simulationProgress >= 100) {
        systemStatus.value.simulationProgress = 0
        systemStatus.value.status = 'idle'
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

function startSimulation() {
  systemStatus.value.status = 'running'
  systemStatus.value.simulationProgress = 0
}

function stopSimulation() {
  systemStatus.value.status = 'idle'
  systemStatus.value.simulationProgress = 0
}
</script>

<template>
  <div class="dashboard-container">
    <div class="header">
      <h1><AreaChartOutlined /> 仿真监控仪表盘</h1>
      <div class="status-badge" :class="systemStatus.status">
        {{ systemStatus.status === 'running' ? '运行中' : '空闲' }}
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="icon">
          <ThunderboltOutlined />
        </div>
        <div class="label">
          CPU 使用率
        </div>
        <div class="value">
          {{ systemStatus.cpu }}%
        </div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: `${systemStatus.cpu}%` }" />
        </div>
      </div>

      <div class="metric-card">
        <div class="icon">
          <CloudServerOutlined />
        </div>
        <div class="label">
          内存占用
        </div>
        <div class="value">
          {{ systemStatus.memory }}%
        </div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: `${systemStatus.memory}%` }" />
        </div>
      </div>

      <div class="metric-card">
        <div class="icon">
          <CheckCircleOutlined />
        </div>
        <div class="label">
          仿真进度
        </div>
        <div class="value">
          {{ systemStatus.simulationProgress }}%
        </div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: `${systemStatus.simulationProgress}%` }" />
        </div>
      </div>
    </div>

    <div class="actions">
      <a-button type="primary" size="large" :disabled="systemStatus.status === 'running'" @click="startSimulation">
        开始仿真任务
      </a-button>
      <a-button size="large" danger :disabled="systemStatus.status === 'idle'" @click="stopSimulation">
        停止任务
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 24px;
  height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.header h1 {
  margin: 0;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1f1f1f;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.idle {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge.running {
  background: #f6ffed;
  color: #52c41a;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.metric-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.metric-card .icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 8px;
}

.metric-card .label {
  color: #8c8c8c;
  font-size: 14px;
}

.metric-card .value {
  font-size: 36px;
  font-weight: bold;
  color: #262626;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}

.progress {
  height: 100%;
  background: #1890ff;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: auto;
  padding: 24px;
  background: white;
  border-radius: 8px;
}
</style>

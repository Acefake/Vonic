<script setup lang="ts">
import {
  AppstoreOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const productConfig = app.productConfig
const appVersion = ref('')
const recentProjects = ref<{ name: string, path: string }[]>([])

onMounted(async () => {
  const appInfo = await app.system.getAppInfo()
  appVersion.value = appInfo.version
  // 模拟最近项目数据
  recentProjects.value = [
    { name: 'Vonic', path: '...0228\\OneDrive\\桌面\\项目' },
    { name: 'subject-simu-tool', path: '...0228\\OneDrive\\桌面\\项目' },
    { name: 'tianjin-subject-simu-tool', path: '...228\\OneDrive\\桌面\\tianjin' },
  ]
})

function openFolder(): void {
  app.dialog.showOpenDialog({ properties: ['openDirectory'] })
}

function goToPlugins(): void {
  router.push('/settings/plugins')
}

function goToSettings(): void {
  router.push('/settings')
}

function openProject(project: { name: string, path: string }): void {
  app.message.info(`打开项目: ${project.name}`)
}
</script>

<template>
  <div class="welcome-page">
    <div class="welcome-content">
      <!-- 标题 -->
      <h1 class="app-title">{{ productConfig.name }}</h1>

      <!-- 主要内容区 -->
      <div class="main-content">
        <!-- 左侧：开始操作 -->
        <div class="start-section">
          <h2 class="section-title">Start</h2>

          <div class="action-item primary" @click="openFolder">
            <FolderOpenOutlined class="action-icon" />
            <span>Open Folder</span>
          </div>

          <div class="action-item" @click="goToPlugins">
            <PlusOutlined class="action-icon" />
            <span>Generate a New Project</span>
          </div>

          <div class="action-item" @click="goToSettings">
            <GithubOutlined class="action-icon" />
            <span>Clone Repository</span>
          </div>

          <div class="action-item" @click="goToSettings">
            <SettingOutlined class="action-icon" />
            <span>Connect via SSH</span>
          </div>
        </div>

        <!-- 右侧：最近项目 -->
        <div class="recent-section">
          <h2 class="section-title">Recent Projects</h2>

          <div class="recent-list">
            <div
              v-for="project in recentProjects"
              :key="project.name"
              class="recent-item"
              @click="openProject(project)"
            >
              <span class="project-name">{{ project.name }}</span>
              <span class="project-path">{{ project.path }}</span>
            </div>

            <div class="show-more">
              Show More...
            </div>
          </div>
        </div>
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
  background: var(--bg-base);
  padding: 60px 40px;
}

.welcome-content {
  max-width: 700px;
  width: 100%;
}

.app-title {
  font-size: 42px;
  font-weight: 300;
  color: var(--text-primary);
  margin: 0 0 60px 0;
  text-align: center;
  letter-spacing: -0.5px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
}

.section-title {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-tertiary);
  margin: 0 0 20px 0;
  text-transform: capitalize;
}

/* 开始操作区 */
.start-section {
  display: flex;
  flex-direction: column;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin: 0 -14px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-normal);
}

.action-item:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.action-item.primary {
  background: var(--primary);
  color: #fff;
  margin-bottom: 8px;
}

.action-item.primary:hover {
  background: var(--primary-hover);
  color: #fff;
}

.action-icon {
  font-size: 14px;
  opacity: 0.8;
}

.action-item.primary .action-icon {
  opacity: 1;
}

/* 最近项目区 */
.recent-section {
  display: flex;
  flex-direction: column;
}

.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  margin: 0 -14px;
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-normal);
}

.recent-item:hover {
  background: var(--hover-bg);
}

.project-name {
  font-size: 13px;
  color: var(--text-primary);
}

.project-path {
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.show-more {
  padding: 10px 14px;
  margin: 0 -14px;
  font-size: 13px;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-normal);
}

.show-more:hover {
  background: var(--hover-bg);
  color: var(--text-secondary);
}
</style>

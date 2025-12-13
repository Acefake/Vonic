<template>
  <div class="github-jump-panel">
    <h3 class="panel-title">GitHub 跳转</h3>
    <p class="panel-description">
      快速访问 GitHub 相关页面
    </p>

    <div class="button-group">
      <button
        class="action-button primary"
        @click="openGitHub"
      >
        <span class="button-icon">🌐</span>
        <span class="button-text">打开 GitHub</span>
      </button>

      <button
        class="action-button"
        @click="openGitHubTrending"
      >
        <span class="button-icon">📈</span>
        <span class="button-text">打开 Trending</span>
      </button>

      <button
        class="action-button"
        @click="openGitHubIssues"
      >
        <span class="button-icon">📝</span>
        <span class="button-text">打开 Issues</span>
      </button>
    </div>

    <div class="link-group">
      <button
        class="link-button"
        @click="openGitHubDocs"
      >
        📚 GitHub Docs
      </button>
      <button
        class="link-button"
        @click="openGitHubActions"
      >
        ⚡️ GitHub Actions
      </button>
    </div>

    <div class="footer">
      <small>插件版本: {{ version }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const version = ref('1.0.0')

const openGitHub = () => {
  window.app.plugin.get('github-jump').command('open-github')
}

const openGitHubTrending = () => {
  window.app.plugin.get('github-jump').command('open-github-trending')
}

const openGitHubIssues = () => {
  window.app.plugin.get('github-jump').command('open-github-issues')
}

const openGitHubDocs = () => {
  // 直接使用 shell.openExternal
  if (window.electron) {
    window.electron.shell.openExternal('https://docs.github.com')
  } else {
    window.open('https://docs.github.com', '_blank')
  }
}

const openGitHubActions = () => {
  if (window.electron) {
    window.electron.shell.openExternal('https://github.com/features/actions')
  } else {
    window.open('https://github.com/features/actions', '_blank')
  }
}
</script>

<style scoped>
.github-jump-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.panel-description {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  text-align: left;
}

.action-button:hover {
  background: #e9e9e9;
  border-color: #ccc;
}

.action-button.primary {
  background: #24292e;
  border-color: #24292e;
  color: white;
}

.action-button.primary:hover {
  background: #1c2126;
  border-color: #1c2126;
}

.button-icon {
  font-size: 16px;
}

.button-text {
  flex: 1;
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.link-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #0366d6;
  text-align: left;
  transition: background 0.2s;
}

.link-button:hover {
  background: rgba(3, 102, 214, 0.1);
}

.footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #eee;
  text-align: center;
  color: #999;
}
</style>
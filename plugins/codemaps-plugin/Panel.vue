<script setup>
import {
  ApiOutlined,
  CodeOutlined,
  ReloadOutlined,
  RocketOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons-vue'
import { Input as AInput } from 'ant-design-vue'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'

const PLUGIN_ID = 'codemaps-plugin'

// 状态
const searchQuery = ref('')
const newCodemapInput = ref('')
const codemaps = ref([])
const suggestions = ref([])
const showStarredOnly = ref(false)
const loading = ref(false)

// 图标映射
const iconMap = {
  rocket: RocketOutlined,
  api: ApiOutlined,
  code: CodeOutlined,
}

// 计算属性：过滤后的 codemaps
const filteredCodemaps = computed(() => {
  let result = codemaps.value
  if (showStarredOnly.value) {
    result = result.filter(c => c.starred)
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.title.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))
    )
  }
  return result
})

// IPC 调用
async function invokePlugin(channel, ...args) {
  return await window.electron.ipcRenderer.invoke(`plugin:${PLUGIN_ID}:${channel}`, ...args)
}

async function executeCommand(commandId, ...args) {
  return await window.electron.ipcRenderer.invoke(`command:${PLUGIN_ID}.${commandId}`, ...args)
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const [codemapsData, suggestionsData] = await Promise.all([
      invokePlugin('getCodemaps'),
      invokePlugin('getSuggestions'),
    ])
    codemaps.value = codemapsData || []
    suggestions.value = suggestionsData || []
  }
  catch (e) {
    console.error('Failed to load data:', e)
  }
  finally {
    loading.value = false
  }
}

// 创建新的 codemap
async function createCodemap() {
  if (!newCodemapInput.value.trim()) return
  await executeCommand('create', newCodemapInput.value.trim())
  newCodemapInput.value = ''
}

// 从建议创建
async function createFromSuggestion(suggestion) {
  await executeCommand('createFromSuggestion', suggestion.id)
}

// 切换收藏
async function toggleStar(codemap) {
  await executeCommand('toggleStar', codemap.id)
}

// 刷新建议
async function refreshSuggestions() {
  await executeCommand('refreshSuggestions')
}

// 切换显示模式
function toggleShowStarred() {
  showStarredOnly.value = !showStarredOnly.value
}

// 监听更新事件
function onCodemapsUpdated(_, data) {
  codemaps.value = data || []
}

function onSuggestionsUpdated(_, data) {
  suggestions.value = data || []
}

onMounted(() => {
  loadData()
  window.electron.ipcRenderer.on(`plugin:${PLUGIN_ID}:codemapsUpdated`, onCodemapsUpdated)
  window.electron.ipcRenderer.on(`plugin:${PLUGIN_ID}:suggestionsUpdated`, onSuggestionsUpdated)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener(`plugin:${PLUGIN_ID}:codemapsUpdated`, onCodemapsUpdated)
  window.electron.ipcRenderer.removeListener(`plugin:${PLUGIN_ID}:suggestionsUpdated`, onSuggestionsUpdated)
})
</script>

<template>
  <div class="codemaps-panel">
    <!-- 标题 -->
    <div class="panel-header">
      <span class="panel-title">Codemaps</span>
    </div>

    <!-- 输入框 -->
    <div class="input-section">
      <AInput
        v-model:value="newCodemapInput"
        placeholder="Enter a starting point for a new codemap (Ctrl+Shift+M)"
        class="codemap-input"
        @pressEnter="createCodemap"
      />
    </div>

    <!-- 建议区域 -->
    <div class="suggestions-section">
      <div class="section-header">
        <span class="section-title">Suggestions</span>
        <span class="section-subtitle">from recent activity</span>
        <button class="refresh-btn" @click="refreshSuggestions">
          <ReloadOutlined />
        </button>
      </div>

      <div class="suggestions-list">
        <div
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          class="suggestion-item"
          @click="createFromSuggestion(suggestion)"
        >
          <div class="suggestion-icon">
            <component :is="iconMap[suggestion.icon] || CodeOutlined" />
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">{{ suggestion.title }}</div>
            <div class="suggestion-desc">{{ suggestion.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Your Codemaps 区域 -->
    <div class="codemaps-section">
      <div class="section-header">
        <span class="section-title">Your Codemaps</span>
        <div class="section-actions">
          <AInput
            v-model:value="searchQuery"
            placeholder="Search"
            class="search-input"
            size="small"
          >
            <template #prefix>
              <SearchOutlined class="search-icon" />
            </template>
          </AInput>
          <button
            class="action-btn"
            :class="{ active: showStarredOnly }"
            title="Show starred only"
            @click="toggleShowStarred"
          >
            <StarFilled v-if="showStarredOnly" />
            <StarOutlined v-else />
          </button>
          <button class="action-btn" title="Filter">
            <CodeOutlined />
          </button>
        </div>
      </div>

      <!-- Codemaps 列表 -->
      <div class="codemaps-list">
        <template v-if="filteredCodemaps.length > 0">
          <div
            v-for="codemap in filteredCodemaps"
            :key="codemap.id"
            class="codemap-item"
          >
            <div class="codemap-content">
              <div class="codemap-title">{{ codemap.title }}</div>
              <div v-if="codemap.description" class="codemap-desc">
                {{ codemap.description }}
              </div>
            </div>
            <button
              class="star-btn"
              :class="{ starred: codemap.starred }"
              @click.stop="toggleStar(codemap)"
            >
              <StarFilled v-if="codemap.starred" />
              <StarOutlined v-else />
            </button>
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 120 120" class="empty-svg">
              <path
                d="M60 20 L60 60 M60 60 L90 80 M60 60 L30 80"
                stroke="currentColor"
                stroke-width="2"
                stroke-dasharray="4 4"
                fill="none"
                opacity="0.3"
              />
              <circle cx="60" cy="100" r="8" fill="currentColor" opacity="0.2" />
              <text x="60" y="65" text-anchor="middle" font-size="16" opacity="0.4">&lt;/&gt;</text>
            </svg>
          </div>
          <p class="empty-text">
            {{ showStarredOnly ? 'No starred codemaps found for this repository.' : 'No codemaps yet. Create one above!' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.codemaps-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #cccccc;
  font-size: 13px;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.panel-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
}

.input-section {
  padding: 12px 16px;
}

.codemap-input {
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #ccc;
}

.codemap-input:hover,
.codemap-input:focus {
  border-color: #007acc;
}

.codemap-input::placeholder {
  color: #666;
}

.suggestions-section {
  padding: 0 16px 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 12px;
  color: #ccc;
}

.section-subtitle {
  font-size: 12px;
  color: #666;
}

.refresh-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.refresh-btn:hover {
  color: #ccc;
  background: #333;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  background: #2a2a2a;
  border-color: #404040;
}

.suggestion-icon {
  color: #888;
  font-size: 16px;
  margin-top: 2px;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-title {
  font-size: 13px;
  color: #e0e0e0;
  margin-bottom: 4px;
}

.suggestion-desc {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.codemaps-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 16px 16px;
  min-height: 0;
}

.codemaps-section .section-header {
  flex-wrap: wrap;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.search-input {
  width: 120px;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 4px;
}

.search-input :deep(.ant-input) {
  background: transparent;
  color: #ccc;
  font-size: 12px;
}

.search-icon {
  color: #666;
  font-size: 12px;
}

.action-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  color: #ccc;
  background: #333;
}

.action-btn.active {
  color: #f5c518;
}

.codemaps-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 12px;
}

.codemap-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.codemap-item:hover {
  background: #2a2a2a;
  border-color: #404040;
}

.codemap-content {
  flex: 1;
  min-width: 0;
}

.codemap-title {
  font-size: 13px;
  color: #e0e0e0;
}

.codemap-desc {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.star-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.star-btn:hover {
  color: #f5c518;
}

.star-btn.starred {
  color: #f5c518;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.empty-svg {
  width: 100%;
  height: 100%;
  color: #444;
}

.empty-text {
  font-size: 13px;
  text-align: center;
  color: #666;
  margin: 0;
}
</style>

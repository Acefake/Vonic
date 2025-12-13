<script setup>
import { AppstoreOutlined, EditOutlined, PlusOutlined, FolderOutlined } from '@ant-design/icons-vue'
import { Button as AButton, message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

const PLUGIN_ID = 'sysml-editor'

// 状态
const models = ref([])
const metaModel = ref(null)
const currentModelId = ref(null)

// SysML v2 分类颜色
const categoryColors = {
  structure: { primary: '#3B82F6', light: '#1E3A5F', border: '#60A5FA' },
  interface: { primary: '#10B981', light: '#1A3D32', border: '#34D399' },
  data: { primary: '#F59E0B', light: '#3D2E1A', border: '#FBBF24' },
  requirement: { primary: '#EC4899', light: '#3D1A2E', border: '#F472B6' },
  constraint: { primary: '#8B5CF6', light: '#2D1F4A', border: '#A78BFA' },
  behavior: { primary: '#06B6D4', light: '#1A3D4A', border: '#22D3EE' },
}

// Stereotype 映射
const stereotypeMap = {
  PartDefinition: '«block»',
  PartUsage: '«part»',
  PortDefinition: '«port def»',
  PortUsage: '«port»',
  ItemDefinition: '«item»',
  AttributeDefinition: '«attribute»',
  RequirementDefinition: '«requirement»',
  ConstraintDefinition: '«constraint»',
  ActionDefinition: '«action»',
  StateDefinition: '«state»',
}

// 按分类分组的元素
const groupedElements = computed(() => {
  if (!metaModel.value) return {}
  const groups = {}
  for (const element of metaModel.value.elements) {
    if (!groups[element.category]) {
      groups[element.category] = []
    }
    groups[element.category].push(element)
  }
  return groups
})

// IPC 调用
const invokePlugin = async (channel, ...args) => {
  return await window.electron.ipcRenderer.invoke(`plugin:${PLUGIN_ID}:${channel}`, ...args)
}

// 执行命令
const executeCommand = async (commandId) => {
  return await window.electron.ipcRenderer.invoke(`command:${PLUGIN_ID}.${commandId}`)
}

// 加载数据
const loadData = async () => {
  try {
    const [modelsData, metaModelData] = await Promise.all([
      invokePlugin('getModels'),
      invokePlugin('getMetaModel'),
    ])
    models.value = modelsData || []
    metaModel.value = metaModelData
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

// 创建模型
const handleCreateModel = async () => {
  await executeCommand('newModel')
  await loadData()
}

// 打开编辑器
const handleOpenEditor = () => {
  executeCommand('openEditor')
}

// 拖拽开始
const handleDragStart = (event, elementDef) => {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/json', JSON.stringify(elementDef))
  event.dataTransfer.effectAllowed = 'copy'
}

onMounted(loadData)
</script>

<template>
  <div class="sysml-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-title">
        <span class="title-badge">SysML v2</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="panel-actions">
      <AButton type="primary" block size="small" @click="handleOpenEditor">
        <template #icon><EditOutlined /></template>
        打开画布
      </AButton>
      <AButton block size="small" @click="handleCreateModel" class="mt-2">
        <template #icon><PlusOutlined /></template>
        新建模型
      </AButton>
    </div>

    <!-- 模型列表 -->
    <div class="section">
      <div class="section-header">
        <FolderOutlined />
        <span>模型</span>
        <span class="section-count">{{ models.length }}</span>
      </div>
      <div class="model-list">
        <div 
          v-for="model in models" 
          :key="model.id" 
          class="model-item"
          :class="{ active: currentModelId === model.id }"
          @click="currentModelId = model.id"
        >
          <span class="model-icon">📄</span>
          <span class="model-name">{{ model.name }}</span>
        </div>
        <div v-if="models.length === 0" class="empty-hint">
          <span>暂无模型</span>
        </div>
      </div>
    </div>

    <!-- 元素工具箱 -->
    <div class="section flex-1">
      <div class="section-header">
        <AppstoreOutlined />
        <span>元素工具箱</span>
      </div>
      <div class="element-list">
        <template v-for="(elements, category) in groupedElements" :key="category">
          <div class="category-group">
            <div class="category-title" :style="{ color: categoryColors[category]?.primary }">
              {{ metaModel?.categories?.find(c => c.id === category)?.label || category }}
            </div>
            <div class="category-elements">
              <div
                v-for="element in elements"
                :key="element.type"
                class="element-item"
                draggable="true"
                :style="{ 
                  borderLeftColor: categoryColors[element.category]?.border,
                  background: categoryColors[element.category]?.light
                }"
                @dragstart="handleDragStart($event, element)"
              >
                <span class="element-stereotype">{{ stereotypeMap[element.type] || '' }}</span>
                <span class="element-label">{{ element.label }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="panel-footer">
      <div class="footer-tip">拖拽元素到画布创建</div>
    </div>
  </div>
</template>

<style scoped>
.sysml-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #ccc;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 头部 */
.panel-header {
  padding: 12px;
  background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
  border-bottom: 1px solid #1a1a1a;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-badge {
  padding: 3px 10px;
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 操作按钮 */
.panel-actions {
  padding: 12px;
  border-bottom: 1px solid #333;
}
.mt-2 {
  margin-top: 8px;
}

/* 区块 */
.section {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #333;
}
.section.flex-1 {
  flex: 1;
  min-height: 0;
  border-bottom: none;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
  background: #252526;
}
.section-count {
  margin-left: auto;
  padding: 1px 6px;
  background: #333;
  border-radius: 10px;
  font-size: 10px;
  color: #888;
}

/* 模型列表 */
.model-list {
  max-height: 140px;
  overflow-y: auto;
}
.model-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.model-item:hover {
  background: #2a2a2a;
}
.model-item.active {
  background: linear-gradient(90deg, #1E3A5F 0%, #252526 100%);
  border-left: 2px solid #3B82F6;
}
.model-icon {
  font-size: 14px;
}
.model-name {
  font-size: 12px;
  color: #ccc;
}

/* 元素列表 */
.element-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}
.category-group {
  margin-bottom: 14px;
}
.category-title {
  font-size: 10px;
  font-weight: 600;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.category-elements {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.element-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid #333;
  border-left-width: 3px;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.15s;
}
.element-item:hover {
  border-color: #444;
  transform: translateX(2px);
}
.element-item:active {
  cursor: grabbing;
  opacity: 0.8;
}
.element-stereotype {
  font-size: 9px;
  font-family: monospace;
  color: #888;
}
.element-label {
  font-size: 12px;
  color: #ddd;
  font-weight: 500;
}

/* 空状态 */
.empty-hint {
  padding: 16px 12px;
  text-align: center;
  color: #555;
  font-size: 11px;
}

/* 底部 */
.panel-footer {
  padding: 10px 12px;
  background: #252526;
  border-top: 1px solid #333;
}
.footer-tip {
  text-align: center;
  color: #555;
  font-size: 10px;
}

/* Ant Design 覆盖 */
:deep(.ant-btn-primary) {
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  border: none;
}
:deep(.ant-btn-default) {
  background: #2d2d2d;
  border-color: #404040;
  color: #ccc;
}
:deep(.ant-btn-default:hover) {
  background: #333;
  border-color: #555;
  color: #fff;
}
</style>

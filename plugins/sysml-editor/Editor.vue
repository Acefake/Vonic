<script setup>
import { 
  ClearOutlined,
  DeleteOutlined, 
  FullscreenExitOutlined, 
  FullscreenOutlined,
  RedoOutlined, 
  SaveOutlined, 
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
} from '@ant-design/icons-vue'
import { Graph } from '@antv/x6'
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { History } from '@antv/x6-plugin-history'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Selection } from '@antv/x6-plugin-selection'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Button as AButton, Input as AInput, message, Tooltip as ATooltip } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const PLUGIN_ID = 'sysml-editor'

// ===== SysML v2 配置（内联） =====
const SYSML_COLORS = {
  structure: { primary: '#3B82F6', light: '#1E3A5F', border: '#60A5FA' },
  interface: { primary: '#10B981', light: '#1A3D32', border: '#34D399' },
  data: { primary: '#F59E0B', light: '#3D2E1A', border: '#FBBF24' },
  requirement: { primary: '#EC4899', light: '#3D1A2E', border: '#F472B6' },
  constraint: { primary: '#8B5CF6', light: '#2D1F4A', border: '#A78BFA' },
  behavior: { primary: '#06B6D4', light: '#1A3D4A', border: '#22D3EE' },
  background: '#1E1E1E',
  surface: '#252526',
  surfaceLight: '#2D2D2D',
  border: '#3C3C3C',
  text: '#CCCCCC',
  textMuted: '#808080',
  textLight: '#FFFFFF',
}

const STEREOTYPE_MAP = {
  PartDefinition: '«block»',
  PartUsage: '«part»',
  PortDefinition: '«port def»',
  PortUsage: '«port»',
  ItemDefinition: '«item»',
  AttributeDefinition: '«attribute def»',
  RequirementDefinition: '«requirement»',
  ConstraintDefinition: '«constraint»',
  ActionDefinition: '«action»',
  StateDefinition: '«state»',
  Package: '«package»',
  InterfaceDefinition: '«interface»',
}

const getShapeByType = (type) => {
  const shapeMap = {
    PartDefinition: 'sysml-block',
    PartUsage: 'sysml-block',
    PortDefinition: 'sysml-port',
    PortUsage: 'sysml-port',
    ItemDefinition: 'sysml-block',
    AttributeDefinition: 'sysml-block',
    RequirementDefinition: 'sysml-requirement',
    ConstraintDefinition: 'sysml-block',
    ActionDefinition: 'sysml-action',
    StateDefinition: 'sysml-action',
    Package: 'sysml-block',
    InterfaceDefinition: 'sysml-block',
  }
  return shapeMap[type] || 'sysml-block'
}

const getColorByCategory = (category) => SYSML_COLORS[category] || SYSML_COLORS.structure

// 注册 SysML 自定义节点
const registerSysMLShapes = (G) => {
  // Block 节点
  G.registerNode('sysml-block', {
    inherit: 'rect',
    width: 180,
    height: 100,
    attrs: {
      body: { fill: SYSML_COLORS.structure.light, stroke: SYSML_COLORS.structure.border, strokeWidth: 2, rx: 4, ry: 4 },
      stereotype: { ref: 'body', refX: '50%', refY: 12, textAnchor: 'middle', fontSize: 10, fontFamily: 'monospace', fill: SYSML_COLORS.structure.primary },
      label: { ref: 'body', refX: '50%', refY: 30, textAnchor: 'middle', fontSize: 13, fontWeight: 600, fill: SYSML_COLORS.textLight },
      attributes: { ref: 'body', refX: 8, refY: 52, fontSize: 11, fontFamily: 'monospace', fill: SYSML_COLORS.text },
    },
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'stereotype' },
      { tagName: 'text', selector: 'label' },
      { tagName: 'text', selector: 'attributes' },
    ],
    ports: {
      groups: {
        left: { position: 'left', attrs: { circle: { r: 6, magnet: true, stroke: SYSML_COLORS.structure.border, strokeWidth: 2, fill: SYSML_COLORS.surface } } },
        right: { position: 'right', attrs: { circle: { r: 6, magnet: true, stroke: SYSML_COLORS.structure.border, strokeWidth: 2, fill: SYSML_COLORS.surface } } },
      },
    },
  }, true)

  // Port 节点
  G.registerNode('sysml-port', {
    inherit: 'rect',
    width: 16,
    height: 16,
    attrs: { body: { fill: SYSML_COLORS.interface.light, stroke: SYSML_COLORS.interface.border, strokeWidth: 2, rx: 2, ry: 2 } },
  }, true)

  // Requirement 节点
  G.registerNode('sysml-requirement', {
    inherit: 'rect',
    width: 200,
    height: 100,
    attrs: {
      body: { fill: SYSML_COLORS.requirement.light, stroke: SYSML_COLORS.requirement.border, strokeWidth: 2, rx: 4, ry: 4 },
      stereotype: { ref: 'body', refX: '50%', refY: 12, textAnchor: 'middle', fontSize: 10, fontFamily: 'monospace', fill: SYSML_COLORS.requirement.primary },
      label: { ref: 'body', refX: '50%', refY: 30, textAnchor: 'middle', fontSize: 13, fontWeight: 600, fill: SYSML_COLORS.textLight },
      attributes: { ref: 'body', refX: 8, refY: 52, fontSize: 11, fill: SYSML_COLORS.text },
    },
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'stereotype' },
      { tagName: 'text', selector: 'label' },
      { tagName: 'text', selector: 'attributes' },
    ],
  }, true)

  // Action/State 节点
  G.registerNode('sysml-action', {
    inherit: 'rect',
    width: 160,
    height: 60,
    attrs: {
      body: { fill: SYSML_COLORS.behavior.light, stroke: SYSML_COLORS.behavior.border, strokeWidth: 2, rx: 20, ry: 20 },
      stereotype: { ref: 'body', refX: '50%', refY: 14, textAnchor: 'middle', fontSize: 10, fontFamily: 'monospace', fill: SYSML_COLORS.behavior.primary },
      label: { ref: 'body', refX: '50%', refY: 34, textAnchor: 'middle', fontSize: 13, fontWeight: 600, fill: SYSML_COLORS.textLight },
    },
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'stereotype' },
      { tagName: 'text', selector: 'label' },
    ],
    ports: {
      groups: {
        left: { position: 'left', attrs: { circle: { r: 5, magnet: true, stroke: SYSML_COLORS.behavior.border, fill: SYSML_COLORS.surface } } },
        right: { position: 'right', attrs: { circle: { r: 5, magnet: true, stroke: SYSML_COLORS.behavior.border, fill: SYSML_COLORS.surface } } },
      },
    },
  }, true)
}

// 状态
const graphContainer = ref(null)
const currentModel = ref(null)
const models = ref([])
const selectedElement = ref(null)
const selectedNode = ref(null)
const metaModel = ref(null)
const zoom = ref(100)
const isFullscreen = ref(false)
const canUndo = ref(false)
const canRedo = ref(false)

// X6 图形实例
let graph = null

// IPC 调用
const invokePlugin = async (channel, ...args) => {
  return await window.electron.ipcRenderer.invoke(`plugin:${PLUGIN_ID}:${channel}`, ...args)
}

// 初始化图形编辑器
const initGraph = () => {
  if (!graphContainer.value) return

  // 注册 SysML v2 自定义形状
  registerSysMLShapes(Graph)

  graph = new Graph({
    container: graphContainer.value,
    autoResize: true,
    background: { color: SYSML_COLORS.background },
    grid: {
      visible: true,
      type: 'doubleMesh',
      args: [
        { color: '#2a2a2a', thickness: 1 },
        { color: '#333333', thickness: 1, factor: 4 },
      ],
    },
    panning: { enabled: true, modifiers: ['ctrl', 'meta'] },
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'], minScale: 0.1, maxScale: 4 },
    connecting: {
      router: 'manhattan',
      connector: { name: 'rounded', args: { radius: 6 } },
      allowBlank: false,
      allowLoop: false,
      allowNode: true,
      allowEdge: false,
      snap: { radius: 20 },
      createEdge() {
        return graph.createEdge({
          shape: 'edge',
          attrs: {
            line: {
              stroke: SYSML_COLORS.structure.border,
              strokeWidth: 2,
              strokeDasharray: '',
              targetMarker: { name: 'block', width: 10, height: 6 },
            },
          },
          labels: [{
            attrs: { 
              label: { text: '', fill: SYSML_COLORS.text, fontSize: 10 },
              rect: { fill: SYSML_COLORS.surface }
            },
            position: 0.5,
          }],
        })
      },
    },
    highlighting: {
      magnetAvailable: {
        name: 'stroke',
        args: { padding: 4, attrs: { stroke: SYSML_COLORS.structure.primary, strokeWidth: 2 } },
      },
      magnetAdsorbed: {
        name: 'stroke',
        args: { padding: 4, attrs: { stroke: SYSML_COLORS.interface.primary, strokeWidth: 3 } },
      },
    },
  })

  graph.use(new Selection({ enabled: true, multiple: true, rubberband: true, movable: true, showNodeSelectionBox: true }))
  graph.use(new Snapline({ enabled: true }))
  graph.use(new Keyboard({ enabled: true }))
  graph.use(new Clipboard({ enabled: true }))
  graph.use(new History({ enabled: true }))

  // 快捷键
  graph.bindKey(['meta+z', 'ctrl+z'], () => { if (graph.canUndo()) graph.undo(); return false })
  graph.bindKey(['meta+shift+z', 'ctrl+y'], () => { if (graph.canRedo()) graph.redo(); return false })
  graph.bindKey(['delete', 'backspace'], () => { handleDelete(); return false })
  graph.bindKey(['meta+c', 'ctrl+c'], () => { graph.copy(graph.getSelectedCells()); return false })
  graph.bindKey(['meta+v', 'ctrl+v'], () => { graph.paste({ offset: 32 }); return false })
  graph.bindKey(['meta+s', 'ctrl+s'], () => { handleSaveModel(); return false })

  // 事件监听
  graph.on('scale', ({ sx }) => { zoom.value = Math.round(sx * 100) })
  
  graph.on('node:selected', ({ node }) => { 
    selectedNode.value = node
    selectedElement.value = node.getData() 
  })
  
  graph.on('node:unselected', () => { 
    selectedNode.value = null
    selectedElement.value = null 
  })
  
  graph.on('blank:click', () => { 
    selectedNode.value = null
    selectedElement.value = null 
  })

  graph.on('history:change', () => {
    canUndo.value = graph.canUndo()
    canRedo.value = graph.canRedo()
  })

  // 节点双击编辑
  graph.on('node:dblclick', ({ node }) => {
    const data = node.getData()
    if (data) {
      // 触发编辑模式（后续可以添加内联编辑）
      selectedNode.value = node
      selectedElement.value = data
    }
  })
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
    if (models.value.length > 0) {
      await loadModel(models.value[0].id)
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

// 加载模型
const loadModel = async (modelId) => {
  const model = await invokePlugin('getModel', modelId)
  if (!model || !graph) return
  currentModel.value = model
  graph.clearCells()
  for (const element of model.elements) {
    addNodeToGraph(element)
  }
  for (const relation of model.relations) {
    addEdgeToGraph(relation)
  }
  graph.centerContent()
}

// 添加节点
const addNodeToGraph = (element) => {
  if (!graph || !metaModel.value) return
  
  const elementDef = metaModel.value.elements.find(e => e.type === element.type)
  const category = elementDef?.category || 'structure'
  const colors = getColorByCategory(category)
  const shape = getShapeByType(element.type)
  const stereotype = STEREOTYPE_MAP[element.type] || ''
  
  // 构建属性文本
  const attrText = element.attributes 
    ? Object.entries(element.attributes).map(([k, v]) => `${k}: ${v}`).join('\n')
    : ''

  const nodeConfig = {
    id: element.id,
    shape: shape,
    x: element.position.x,
    y: element.position.y,
    width: element.size?.width || elementDef?.defaultSize?.width || 180,
    height: element.size?.height || elementDef?.defaultSize?.height || 100,
    data: element,
    attrs: {
      body: { 
        fill: colors.light, 
        stroke: colors.border, 
      },
      stereotype: { text: stereotype },
      label: { text: element.name },
      attributes: { text: attrText },
    },
  }

  // 添加端口
  if (shape === 'sysml-block' || shape === 'sysml-action') {
    nodeConfig.ports = {
      items: [
        { id: `${element.id}-left`, group: 'left' },
        { id: `${element.id}-right`, group: 'right' },
      ],
    }
  }

  graph.addNode(nodeConfig)
}

// 关系类型样式映射
const RELATION_STYLES = {
  composition: { stroke: SYSML_COLORS.structure.border, strokeDasharray: '', sourceMarker: { name: 'diamond', fill: SYSML_COLORS.structure.border } },
  reference: { stroke: SYSML_COLORS.structure.border, strokeDasharray: '5,3', targetMarker: { name: 'classic' } },
  generalization: { stroke: SYSML_COLORS.structure.border, strokeDasharray: '', targetMarker: { name: 'block', open: true } },
  dependency: { stroke: SYSML_COLORS.textMuted, strokeDasharray: '5,3', targetMarker: { name: 'classic' } },
  satisfy: { stroke: SYSML_COLORS.requirement.border, strokeDasharray: '5,3', targetMarker: { name: 'classic' } },
  verify: { stroke: SYSML_COLORS.interface.border, strokeDasharray: '5,3', targetMarker: { name: 'classic' } },
}

// 添加边
const addEdgeToGraph = (relation) => {
  if (!graph) return
  
  const style = RELATION_STYLES[relation.type] || RELATION_STYLES.reference
  
  graph.addEdge({
    id: relation.id,
    source: { cell: relation.sourceId, port: `${relation.sourceId}-right` },
    target: { cell: relation.targetId, port: `${relation.targetId}-left` },
    data: relation,
    attrs: {
      line: {
        stroke: style.stroke,
        strokeWidth: 2,
        strokeDasharray: style.strokeDasharray || '',
        sourceMarker: style.sourceMarker || null,
        targetMarker: style.targetMarker || { name: 'block', width: 10, height: 6 },
      },
    },
    labels: relation.label ? [{
      attrs: { 
        label: { text: relation.label, fill: SYSML_COLORS.text, fontSize: 10 },
        rect: { fill: SYSML_COLORS.surface, rx: 3, ry: 3 }
      },
      position: 0.5,
    }] : [],
  })
}

// 保存模型
const handleSaveModel = async () => {
  if (!currentModel.value || !graph) return
  const nodes = graph.getNodes()
  for (const node of nodes) {
    const pos = node.getPosition()
    const size = node.getSize()
    const element = currentModel.value.elements.find(e => e.id === node.id)
    if (element) {
      element.position = pos
      element.size = size
    }
  }
  await invokePlugin('saveModel', currentModel.value)
  message.success('模型已保存')
}

// 拖放处理
const handleDrop = async (event) => {
  event.preventDefault()
  if (!event.dataTransfer || !graph) return
  
  const data = event.dataTransfer.getData('application/json')
  if (!data) return

  // 如果没有当前模型，先创建一个
  if (!currentModel.value) {
    const newModel = await invokePlugin('createModel', '新建模型')
    if (newModel) {
      currentModel.value = newModel
      models.value.push(newModel)
    } else {
      message.error('创建模型失败')
      return
    }
  }

  const elementDef = JSON.parse(data)
  const rect = graphContainer.value?.getBoundingClientRect()
  if (!rect) return

  const point = graph.clientToLocal({ x: event.clientX - rect.left, y: event.clientY - rect.top })

  const newElement = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: elementDef.type,
    name: `${elementDef.label} 1`,
    attributes: {},
    position: { x: point.x, y: point.y },
    size: elementDef.defaultSize || { width: 180, height: 100 },
  }

  await invokePlugin('addElement', currentModel.value.id, newElement)
  addNodeToGraph(newElement)
  currentModel.value.elements.push(newElement)
  message.success(`已创建 ${elementDef.label}`)
}

const handleDragOver = (event) => {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

// 操作
const handleZoomIn = () => graph?.zoom(0.1)
const handleZoomOut = () => graph?.zoom(-0.1)
const handleZoomReset = () => { graph?.zoomTo(1); graph?.centerContent() }
const handleUndo = () => graph?.undo()
const handleRedo = () => graph?.redo()
const handleDelete = () => {
  if (!graph || !currentModel.value) return
  const cells = graph.getSelectedCells()
  cells.forEach(cell => {
    if (cell.isNode()) {
      const idx = currentModel.value.elements.findIndex(e => e.id === cell.id)
      if (idx !== -1) currentModel.value.elements.splice(idx, 1)
    }
  })
  graph.removeCells(cells)
}
const handleToggleFullscreen = () => { isFullscreen.value = !isFullscreen.value }
const handleClearCanvas = () => { 
  if (graph && confirm('确定要清空画布吗？')) {
    graph.clearCells()
    if (currentModel.value) {
      currentModel.value.elements = []
      currentModel.value.relations = []
    }
  }
}

// 更新选中元素的名称
const handleUpdateElementName = (newName) => {
  if (!selectedElement.value || !selectedNode.value) return
  selectedElement.value.name = newName
  selectedNode.value.attr('label/text', newName)
}

// 更新选中元素的属性
const handleUpdateAttribute = (key, value) => {
  if (!selectedElement.value || !selectedNode.value) return
  if (!selectedElement.value.attributes) {
    selectedElement.value.attributes = {}
  }
  selectedElement.value.attributes[key] = value
  
  // 更新节点上的属性显示
  const attrText = Object.entries(selectedElement.value.attributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  selectedNode.value.attr('attributes/text', attrText)
}

onMounted(() => {
  initGraph()
  loadData()
})

onUnmounted(() => {
  if (graph) {
    graph.dispose()
    graph = null
  }
})
</script>

<template>
  <div class="sysml-canvas" :class="{ fullscreen: isFullscreen }">
    <!-- 工具栏 -->
    <div class="canvas-toolbar">
      <div class="toolbar-group">
        <ATooltip title="保存 (Ctrl+S)">
          <AButton type="text" size="small" @click="handleSaveModel">
            <SaveOutlined />
          </AButton>
        </ATooltip>
        <div class="toolbar-divider" />
        <ATooltip title="撤销 (Ctrl+Z)">
          <AButton type="text" size="small" :disabled="!canUndo" @click="handleUndo">
            <UndoOutlined />
          </AButton>
        </ATooltip>
        <ATooltip title="重做 (Ctrl+Y)">
          <AButton type="text" size="small" :disabled="!canRedo" @click="handleRedo">
            <RedoOutlined />
          </AButton>
        </ATooltip>
        <div class="toolbar-divider" />
        <ATooltip title="删除选中">
          <AButton type="text" size="small" @click="handleDelete">
            <DeleteOutlined />
          </AButton>
        </ATooltip>
        <ATooltip title="清空画布">
          <AButton type="text" size="small" @click="handleClearCanvas">
            <ClearOutlined />
          </AButton>
        </ATooltip>
      </div>
      
      <div class="toolbar-title">
        <span class="model-badge">SysML v2</span>
        <span class="model-name">{{ currentModel?.name || '未选择模型' }}</span>
      </div>
      
      <div class="toolbar-group">
        <ATooltip title="缩小">
          <AButton type="text" size="small" @click="handleZoomOut">
            <ZoomOutOutlined />
          </AButton>
        </ATooltip>
        <span class="zoom-level">{{ zoom }}%</span>
        <ATooltip title="放大">
          <AButton type="text" size="small" @click="handleZoomIn">
            <ZoomInOutlined />
          </AButton>
        </ATooltip>
        <ATooltip title="适应画布">
          <AButton type="text" size="small" @click="handleZoomReset">
            <AimOutlined />
          </AButton>
        </ATooltip>
        <div class="toolbar-divider" />
        <ATooltip :title="isFullscreen ? '退出全屏' : '全屏'">
          <AButton type="text" size="small" @click="handleToggleFullscreen">
            <FullscreenExitOutlined v-if="isFullscreen" />
            <FullscreenOutlined v-else />
          </AButton>
        </ATooltip>
      </div>
    </div>

    <!-- 画布 + 属性面板 -->
    <div class="canvas-body">
      <div 
        ref="graphContainer" 
        class="graph-area"
        @drop="handleDrop"
        @dragover="handleDragOver"
      />
      
      <!-- 属性面板 -->
      <div class="property-sidebar">
        <div class="sidebar-header">
          <span>属性</span>
          <span v-if="selectedElement" class="element-type">{{ selectedElement.type }}</span>
        </div>
        
        <div class="sidebar-content">
          <template v-if="selectedElement">
            <!-- 基础信息 -->
            <div class="prop-section">
              <div class="prop-section-title">基础信息</div>
              <div class="prop-item">
                <label>名称</label>
                <AInput 
                  :value="selectedElement.name" 
                  size="small"
                  @change="e => handleUpdateElementName(e.target.value)"
                />
              </div>
              <div class="prop-item">
                <label>类型</label>
                <div class="prop-value type-badge">{{ STEREOTYPE_MAP[selectedElement.type] || selectedElement.type }}</div>
              </div>
            </div>

            <!-- 位置与尺寸 -->
            <div class="prop-section">
              <div class="prop-section-title">位置与尺寸</div>
              <div class="prop-row">
                <div class="prop-item half">
                  <label>X</label>
                  <span class="prop-value">{{ Math.round(selectedElement.position?.x || 0) }}</span>
                </div>
                <div class="prop-item half">
                  <label>Y</label>
                  <span class="prop-value">{{ Math.round(selectedElement.position?.y || 0) }}</span>
                </div>
              </div>
              <div class="prop-row">
                <div class="prop-item half">
                  <label>宽</label>
                  <span class="prop-value">{{ selectedElement.size?.width || '-' }}</span>
                </div>
                <div class="prop-item half">
                  <label>高</label>
                  <span class="prop-value">{{ selectedElement.size?.height || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- 自定义属性 -->
            <div class="prop-section">
              <div class="prop-section-title">
                属性
                <AButton type="link" size="small" class="add-btn">+ 添加</AButton>
              </div>
              <template v-if="selectedElement.attributes && Object.keys(selectedElement.attributes).length">
                <div v-for="(value, key) in selectedElement.attributes" :key="key" class="prop-item">
                  <label>{{ key }}</label>
                  <AInput 
                    :value="value" 
                    size="small"
                    @change="e => handleUpdateAttribute(key, e.target.value)"
                  />
                </div>
              </template>
              <div v-else class="empty-hint small">暂无属性</div>
            </div>
          </template>
          
          <div v-else class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-text">选择画布上的元素<br/>查看和编辑属性</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sysml-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #1a1a1a;
  color: #ccc;
}
.sysml-canvas.fullscreen {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
}
.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #252526;
  border-bottom: 1px solid #333;
  min-height: 44px;
}
.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.toolbar-center {
  font-weight: 500;
  color: #e0e0e0;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #444;
  margin: 0 6px;
}
.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 12px;
  color: #888;
}
.model-name {
  font-size: 14px;
}
.canvas-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.graph-area {
  flex: 1;
  min-width: 0;
  background: #1a1a1a;
}
.property-sidebar {
  width: 220px;
  background: #252526;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 10px 12px;
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
}
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.prop-item {
  margin-bottom: 12px;
}
.prop-item label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}
.prop-input {
  width: 100%;
  padding: 6px 8px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #ccc;
  font-size: 13px;
}
.prop-input:focus {
  outline: none;
  border-color: #007acc;
}
.prop-value {
  font-size: 13px;
  color: #aaa;
}
.empty-hint {
  color: #666;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}
:deep(.ant-btn-text) {
  color: #888;
}
:deep(.ant-btn-text:hover) {
  color: #fff;
  background: #333;
}
</style>

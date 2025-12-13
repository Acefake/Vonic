/**
 * SysML v2 图形编辑器与元模型管理插件
 */

import type { Plugin, PluginAPI } from '@vonic/plugin-electron'

let api: PluginAPI | null = null

// 模型存储
interface SysMLModel {
  id: string
  name: string
  elements: SysMLElement[]
  relations: SysMLRelation[]
  createdAt: number
  updatedAt: number
}

interface SysMLElement {
  id: string
  type: SysMLElementType
  name: string
  attributes: Record<string, unknown>
  position: { x: number; y: number }
  size: { width: number; height: number }
}

interface SysMLRelation {
  id: string
  type: SysMLRelationType
  sourceId: string
  targetId: string
  label?: string
}

type SysMLElementType =
  | 'PartDefinition'
  | 'PartUsage'
  | 'PortDefinition'
  | 'PortUsage'
  | 'ItemDefinition'
  | 'AttributeDefinition'
  | 'RequirementDefinition'
  | 'ConstraintDefinition'
  | 'ActionDefinition'
  | 'StateDefinition'

type SysMLRelationType =
  | 'composition'
  | 'reference'
  | 'generalization'
  | 'dependency'
  | 'connection'
  | 'allocation'
  | 'satisfy'
  | 'verify'

// 内存存储（后续可持久化）
const models: Map<string, SysMLModel> = new Map()

const plugin: Plugin = {
  id: 'sysml-editor',
  name: 'SysML v2 编辑器',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('SysML v2 编辑器已激活')

    // ===== 注册命令 =====
    api.commands.register('newModel', '新建模型', async () => {
      const model = createNewModel('未命名模型')
      api?.ui.showMessage('success', `模型 "${model.name}" 已创建`)
      return model
    })

    api.commands.register('openEditor', '打开编辑器', async () => {
      api?.ui.showMessage('info', '正在打开 SysML 编辑器...')
    })

    // ===== 注册面板 =====
    api.panels.register({
      type: 'component',
      title: 'SysML v2 编辑器',
      componentPath: 'Panel.vue',
    })

    // ===== IPC 接口 =====

    // 获取所有模型
    api.ipc.handle('getModels', () => {
      return Array.from(models.values())
    })

    // 获取单个模型
    api.ipc.handle('getModel', (...args: unknown[]) => {
      const modelId = args[0] as string
      return models.get(modelId) || null
    })

    // 创建模型
    api.ipc.handle('createModel', (...args: unknown[]) => {
      const name = args[0] as string
      return createNewModel(name)
    })

    // 保存模型
    api.ipc.handle('saveModel', (...args: unknown[]) => {
      const model = args[0] as SysMLModel
      model.updatedAt = Date.now()
      models.set(model.id, model)
      return model
    })

    // 删除模型
    api.ipc.handle('deleteModel', (...args: unknown[]) => {
      const modelId = args[0] as string
      return models.delete(modelId)
    })

    // 添加元素
    api.ipc.handle('addElement', (...args: unknown[]) => {
      const modelId = args[0] as string
      const element = args[1] as SysMLElement
      const model = models.get(modelId)
      if (!model) return null

      model.elements.push(element)
      model.updatedAt = Date.now()
      return element
    })

    // 更新元素
    api.ipc.handle('updateElement', (...args: unknown[]) => {
      const modelId = args[0] as string
      const elementId = args[1] as string
      const updates = args[2] as Partial<SysMLElement>
      const model = models.get(modelId)
      if (!model) return null

      const element = model.elements.find(e => e.id === elementId)
      if (!element) return null

      Object.assign(element, updates)
      model.updatedAt = Date.now()
      return element
    })

    // 删除元素
    api.ipc.handle('deleteElement', (...args: unknown[]) => {
      const modelId = args[0] as string
      const elementId = args[1] as string
      const model = models.get(modelId)
      if (!model) return false

      const index = model.elements.findIndex(e => e.id === elementId)
      if (index === -1) return false

      model.elements.splice(index, 1)
      // 同时删除相关的关系
      model.relations = model.relations.filter(
        r => r.sourceId !== elementId && r.targetId !== elementId
      )
      model.updatedAt = Date.now()
      return true
    })

    // 添加关系
    api.ipc.handle('addRelation', (...args: unknown[]) => {
      const modelId = args[0] as string
      const relation = args[1] as SysMLRelation
      const model = models.get(modelId)
      if (!model) return null

      model.relations.push(relation)
      model.updatedAt = Date.now()
      return relation
    })

    // 删除关系
    api.ipc.handle('deleteRelation', (...args: unknown[]) => {
      const modelId = args[0] as string
      const relationId = args[1] as string
      const model = models.get(modelId)
      if (!model) return false

      const index = model.relations.findIndex(r => r.id === relationId)
      if (index === -1) return false

      model.relations.splice(index, 1)
      model.updatedAt = Date.now()
      return true
    })

    // 获取元模型定义
    api.ipc.handle('getMetaModel', () => {
      return getMetaModelDefinition()
    })

    api.ui.showMessage('success', 'SysML v2 编辑器已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('SysML v2 编辑器已停用')
    api = null
  },
}

// 创建新模型
function createNewModel(name: string): SysMLModel {
  const model: SysMLModel = {
    id: generateId(),
    name,
    elements: [],
    relations: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  models.set(model.id, model)
  return model
}

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// 获取元模型定义
function getMetaModelDefinition() {
  return {
    elements: [
      {
        type: 'PartDefinition',
        label: '部件定义',
        icon: 'block',
        category: 'structure',
        defaultSize: { width: 160, height: 80 },
        ports: ['in', 'out'],
      },
      {
        type: 'PartUsage',
        label: '部件使用',
        icon: 'block-usage',
        category: 'structure',
        defaultSize: { width: 140, height: 60 },
        ports: ['in', 'out'],
      },
      {
        type: 'PortDefinition',
        label: '端口定义',
        icon: 'port',
        category: 'interface',
        defaultSize: { width: 24, height: 24 },
        ports: [],
      },
      {
        type: 'PortUsage',
        label: '端口使用',
        icon: 'port-usage',
        category: 'interface',
        defaultSize: { width: 20, height: 20 },
        ports: [],
      },
      {
        type: 'ItemDefinition',
        label: '项定义',
        icon: 'item',
        category: 'data',
        defaultSize: { width: 120, height: 60 },
        ports: [],
      },
      {
        type: 'AttributeDefinition',
        label: '属性定义',
        icon: 'attribute',
        category: 'data',
        defaultSize: { width: 140, height: 40 },
        ports: [],
      },
      {
        type: 'RequirementDefinition',
        label: '需求定义',
        icon: 'requirement',
        category: 'requirement',
        defaultSize: { width: 180, height: 100 },
        ports: [],
      },
      {
        type: 'ConstraintDefinition',
        label: '约束定义',
        icon: 'constraint',
        category: 'constraint',
        defaultSize: { width: 160, height: 80 },
        ports: [],
      },
      {
        type: 'ActionDefinition',
        label: '动作定义',
        icon: 'action',
        category: 'behavior',
        defaultSize: { width: 140, height: 60 },
        ports: ['in', 'out'],
      },
      {
        type: 'StateDefinition',
        label: '状态定义',
        icon: 'state',
        category: 'behavior',
        defaultSize: { width: 120, height: 80 },
        ports: ['in', 'out'],
      },
    ],
    relations: [
      { type: 'composition', label: '组合', lineStyle: 'solid', arrowType: 'diamond-filled' },
      { type: 'reference', label: '引用', lineStyle: 'dashed', arrowType: 'arrow' },
      { type: 'generalization', label: '泛化', lineStyle: 'solid', arrowType: 'triangle' },
      { type: 'dependency', label: '依赖', lineStyle: 'dashed', arrowType: 'arrow' },
      { type: 'connection', label: '连接', lineStyle: 'solid', arrowType: 'none' },
      { type: 'allocation', label: '分配', lineStyle: 'dashed', arrowType: 'arrow' },
      { type: 'satisfy', label: '满足', lineStyle: 'dashed', arrowType: 'arrow' },
      { type: 'verify', label: '验证', lineStyle: 'dashed', arrowType: 'arrow' },
    ],
    categories: [
      { id: 'structure', label: '结构', color: '#1890ff' },
      { id: 'interface', label: '接口', color: '#52c41a' },
      { id: 'data', label: '数据', color: '#faad14' },
      { id: 'requirement', label: '需求', color: '#eb2f96' },
      { id: 'constraint', label: '约束', color: '#722ed1' },
      { id: 'behavior', label: '行为', color: '#13c2c2' },
    ],
  }
}

export default plugin

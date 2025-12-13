/**
 * SysML v2 元模型类型定义
 */

// ===== 元素类型 =====

export type SysMLElementType =
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

// ===== 关系类型 =====

export type SysMLRelationType =
  | 'composition'
  | 'reference'
  | 'generalization'
  | 'dependency'
  | 'connection'
  | 'allocation'
  | 'satisfy'
  | 'verify'

// ===== 元素定义 =====

export interface SysMLElement {
  id: string
  type: SysMLElementType | string
  name: string
  attributes: Record<string, unknown>
  position: { x: number; y: number }
  size: { width: number; height: number }
}

// ===== 关系定义 =====

export interface SysMLRelation {
  id: string
  type: SysMLRelationType | string
  sourceId: string
  targetId: string
  label?: string
}

// ===== 模型定义 =====

export interface SysMLModel {
  id: string
  name: string
  elements: SysMLElement[]
  relations: SysMLRelation[]
  createdAt: number
  updatedAt: number
}

// ===== 元模型定义 =====

export interface MetaElementDef {
  type: SysMLElementType
  label: string
  icon: string
  category: string
  defaultSize: { width: number; height: number }
  ports: string[]
}

export interface MetaRelationDef {
  type: SysMLRelationType
  label: string
  lineStyle: 'solid' | 'dashed'
  arrowType: string
}

export interface MetaCategoryDef {
  id: string
  label: string
  color: string
}

export interface MetaModelDefinition {
  elements: MetaElementDef[]
  relations: MetaRelationDef[]
  categories: MetaCategoryDef[]
}

// ===== 分类颜色 =====

export const CATEGORY_COLORS: Record<string, string> = {
  structure: '#1890ff',
  interface: '#52c41a',
  data: '#faad14',
  requirement: '#eb2f96',
  constraint: '#722ed1',
  behavior: '#13c2c2',
}

# SysML v2 建模工具 - 图形层技术选型推荐

## 🎯 项目概述

基于 Vue 3 + CS 架构的 SysML v2 系统建模工具，需要强大的图形渲染和交互能力。

## 📊 图形层技术对比

### 🥇 **推荐首选：Vue Flow**

**优势**：
- ✅ **Vue 3 原生支持**：专为 Vue 生态设计
- ✅ **开箱即用**：丰富的节点类型、连接线、交互功能
- ✅ **轻量高效**：基于 WebGL 优化，性能优秀
- ✅ **高度可定制**：支持自定义节点、边、样式
- ✅ **活跃社区**：持续更新，生态完善
- ✅ **MIT 协议**：商业友好

**适用场景**：
- SysML 图表：包图、类图、序列图、活动图等
- 拖拽创建元素
- 自动布局
- 缩放和平移

**集成示例**：
```bash
npm install @vue-flow/core @vue-flow/node-toolbar @vue-flow/minimap
```

### 🥈 **备选方案：Konva.js**

**优势**：
- ✅ **底层控制**：直接操作 Canvas，性能极佳
- ✅ **灵活定制**：可以绘制任意复杂图形
- ✅ **事件系统**：丰富的交互事件支持
- ✅ **序列化**：支持图形状态保存和恢复

**适用场景**：
- 需要像素级控制的复杂图形
- 自定义 SysML 符号库
- 高性能渲染大量元素

**集成示例**：
```bash
npm install konva vue-konva
```

### 🥉 **专业方案：D3.js**

**优势**：
- ✅ **数据驱动**：基于数据自动生成图形
- ✅ **数学可视化**：强大的布局算法
- ✅ **动画支持**：流畅的过渡效果
- ✅ **生态丰富**：大量现成图表类型

**适用场景**：
- 数据密集的图表
- 需要复杂布局算法
- 统计图表和关系图

### 🏆 **企业级推荐：AntV X6**

**优势**：
- ✅ **蚂蚁金服出品**：企业级稳定性和可靠性
- ✅ **Vue 3 完美支持**：@antv/x6-vue-shape 官方集成
- ✅ **功能极其丰富**：内置50+节点类型，20+边类型
- ✅ **高性能渲染**：基于 SVG，流畅处理数千元素
- ✅ **商业级交互**：拖拽、缩放、选择、撤销重做等
- ✅ **插件生态**：Stencil、Transform、Snapline 等专业插件
- ✅ **中文文档完善**：详细的 API 文档和示例
- ✅ **MIT 协议**：商业友好

**适用场景**：
- 企业级 SysML 建模工具
- 需要复杂图表交互的应用
- 大型系统架构图
- 专业建模软件

**集成示例**：
```bash
npm install @antv/x6 @antv/x6-vue-shape
# 或使用 Vue 专用版本
npm install @antv/x6-vue3
```

**核心特性**：
- 🔧 **节点系统**：支持 HTML、SVG、React/Vue 组件节点
- 🔗 **边系统**：智能路由、自定义路径、动画效果
- 🎯 **交互系统**：多选、框选、快捷键、右键菜单
- 📏 **布局算法**：层次布局、网格布局、圆形布局
- 💾 **序列化**：完整的图表数据导入导出
- 🔄 **历史管理**：撤销重做、命令模式
- 🎨 **主题系统**：可定制的视觉样式

### 💰 **商业方案：GoJS**

**优势**：
- ✅ **企业级功能**：完整的图表编辑器
- ✅ **专业支持**：商业技术支持
- ✅ **高级特性**：自动布局、图表验证等
- ✅ **文档完善**：详细的 API 文档

**考虑因素**：
- 💰 **商业许可**：需要购买许可证
- 🎯 **适合企业应用**

---

## 🏗️ 推荐架构设计

### 前端技术栈

```
Vue 3 + TypeScript + Pinia + Vue Router
    │
    ├── AntV X6 (企业级图形核心) ⭐推荐
    │   ├── 节点系统 (SysML元素)
    │   ├── 边系统 (关系连接)
    │   ├── 交互系统 (拖拽/选择/缩放)
    │   └── 插件生态 (Stencil/Transform/Snapline)
    │
    ├── Vue Flow (轻量级备选)
    │   ├── 快速原型开发
    │   └── 简单图表场景
    │
    ├── Konva.js (复杂图形绘制)
    │   ├── 自定义符号渲染
    │   └── 高级交互
    │
    └── D3.js (数据可视化)
        ├── 布局算法
        └── 统计图表
```

### SysML v2 支持的图表类型

| 图表类型 | Vue Flow | Konva.js | D3.js | AntV X6 |
|---------|----------|----------|-------|---------|
| 包图 (Package) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 类图 (Class) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 序列图 (Sequence) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 活动图 (Activity) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 用例图 (Use Case) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 状态机图 (State) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 参数图 (Parametric) | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 需求图 (Requirement) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 🚀 快速开始指南

### 1. 创建项目结构

```bash
# 使用 Vonic 插件架构
pnpm create-plugin sysml-modeler "SysML v2 建模工具"
cd plugins/sysml-modeler

# 安装图形库
pnpm add @antv/x6 @antv/x6-vue-shape
# 或 Vue 专用版本
pnpm add @antv/x6-vue3
# 备选方案
pnpm add @vue-flow/core @vue-flow/node-toolbar @vue-flow/minimap
pnpm add konva vue-konva
pnpm add d3 @types/d3
```

### 2. 基础配置

```typescript
// plugins/sysml-modeler/src/types.ts
export interface SysMLElement {
  id: string
  type: 'package' | 'class' | 'interface' | 'actor' | 'usecase'
  position: { x: number, y: number }
  data: Record<string, any>
  style?: Record<string, any>
}

export interface SysMLRelationship {
  id: string
  source: string
  target: string
  type: 'association' | 'generalization' | 'realization' | 'dependency'
  label?: string
}
```

### 3. Vue Flow 集成示例

```vue
<!-- plugins/sysml-modeler/src/SysMLCanvas.vue -->
<script setup lang="ts">
import type { Edge, Node } from '@vue-flow/core'
import { Background, Controls, MiniMap, VueFlow } from '@vue-flow/core'
import { ref } from 'vue'

// SysML 节点定义
const nodeTypes = {
  sysmlPackage: defineAsyncComponent(() => import('./nodes/SysMLPackage.vue')),
  sysmlClass: defineAsyncComponent(() => import('./nodes/SysMLClass.vue')),
  // ... 其他节点类型
}

const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])

// 连接处理
function onConnect(connection: Connection) {
  // 创建 SysML 关系
  const edge: Edge = {
    id: `${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    type: 'sysmlRelationship'
  }
  edges.value.push(edge)
}
</script>

<template>
  <VueFlow
    v-model:nodes="nodes"
    v-model:edges="edges"
    :node-types="nodeTypes"
    :edge-types="edgeTypes"
    fit-view-on-init
    class="sysml-canvas"
    @connect="onConnect"
    @node-drag-stop="onNodeDragStop"
  >
    <MiniMap />
    <Controls />
    <Background />
  </VueFlow>
</template>
```

### 5. AntV X6 企业级集成示例

```vue
<!-- plugins/sysml-modeler/src/SysMLCanvas.vue -->
<script setup lang="ts">
import { Graph } from '@antv/x6'
import { onMounted, onUnmounted, ref } from 'vue'

const container = ref<HTMLDivElement>()
let graph: Graph | null = null

onMounted(() => {
  if (!container.value)
    return

  // 创建 AntV X6 图表实例
  graph = new Graph({
    container: container.value,
    width: 800,
    height: 600,
    grid: true,
    snapline: true, // 对齐线
    history: true, // 撤销重做
    selecting: {
      enabled: true,
      multiple: true,
      rubberband: true,
    },
    connecting: {
      anchor: 'center',
      connectionPoint: 'anchor',
      allowBlank: false,
      highlight: true,
      snap: true,
      createEdge() {
        return graph?.createEdge({
          shape: 'sysml-relationship',
          attrs: {
            line: {
              stroke: '#1890ff',
              strokeWidth: 2,
            },
          },
        })
      },
    },
  })

  // 注册自定义节点
  Graph.registerNode('sysml-class', {
    inherit: 'rect',
    width: 120,
    height: 60,
    attrs: {
      body: {
        fill: '#fff',
        stroke: '#333',
        strokeWidth: 2,
      },
      label: {
        text: 'Class',
        fill: '#333',
        fontSize: 12,
      },
    },
  })

  // 注册自定义边
  Graph.registerEdge('sysml-relationship', {
    inherit: 'edge',
    attrs: {
      line: {
        stroke: '#1890ff',
        strokeWidth: 2,
        targetMarker: {
          name: 'block',
          size: 8,
        },
      },
    },
  })

  // 添加示例节点
  const node1 = graph.addNode({
    shape: 'sysml-class',
    x: 100,
    y: 100,
    attrs: {
      label: {
        text: '«Class»\nCar',
      },
    },
  })

  const node2 = graph.addNode({
    shape: 'sysml-class',
    x: 300,
    y: 100,
    attrs: {
      label: {
        text: '«Class»\nEngine',
      },
    },
  })

  // 添加关系边
  graph.addEdge({
    shape: 'sysml-relationship',
    source: node1.id,
    target: node2.id,
    labels: [
      {
        attrs: {
          label: {
            text: 'aggregation',
            fill: '#1890ff',
            fontSize: 10,
          },
        },
      },
    ],
  })

  // 事件监听
  graph.on('node:click', ({ node }) => {
    console.log('Node clicked:', node.id)
  })

  graph.on('edge:click', ({ edge }) => {
    console.log('Edge clicked:', edge.id)
  })

  graph.on('blank:click', () => {
    graph?.cleanSelection()
  })
})

onUnmounted(() => {
  graph?.dispose()
})
</script>

<template>
  <div ref="container" class="sysml-canvas" />
</template>

<style scoped>
.sysml-canvas {
  width: 100%;
  height: 600px;
  border: 1px solid #ddd;
}
</style>
```

### 6. AntV X6 Vue 组件集成

```vue
<!-- plugins/sysml-modeler/src/nodes/SysMLClass.vue -->
<script setup lang="ts">
defineProps<{
  name: string
  attributes?: Array<{ name: string, type: string, visibility: string }>
  operations?: Array<{ name: string, parameters?: string[], returnType: string, visibility: string }>
}>()
</script>

<template>
  <div class="sysml-class-node">
    <div class="class-header">
      <span class="stereotype">«Class»</span>
      <span class="name">{{ name }}</span>
    </div>
    <div v-if="attributes?.length" class="class-attributes">
      <div v-for="attr in attributes" :key="attr.name">
        {{ attr.visibility }} {{ attr.name }}: {{ attr.type }}
      </div>
    </div>
    <div v-if="operations?.length" class="class-operations">
      <div v-for="op in operations" :key="op.name">
        {{ op.visibility }} {{ op.name }}({{ op.parameters?.join(', ') }}): {{ op.returnType }}
      </div>
    </div>
  </div>
</template>
```

```typescript
// plugins/sysml-modeler/src/SysMLCanvasX6.vue
import { Edge, Graph, Node } from '@antv/x6'
import { VueShape } from '@antv/x6-vue-shape'
import SysMLClass from './nodes/SysMLClass.vue'

// 注册 Vue 组件节点
Graph.registerNode('sysml-class-vue', {
  inherit: VueShape,
  width: 150,
  height: 80,
  component: SysMLClass,
})

// 在图表中使用
const node = graph.addNode({
  shape: 'sysml-class-vue',
  x: 100,
  y: 100,
  data: {
    name: 'Car',
    attributes: [
      { name: 'brand', type: 'String', visibility: '+' },
      { name: 'model', type: 'String', visibility: '+' },
    ],
    operations: [
      { name: 'start', parameters: [], returnType: 'void', visibility: '+' },
    ],
  },
})
```

### 4. 自定义 SysML 节点

```vue
<!-- plugins/sysml-modeler/src/nodes/SysMLClass.vue -->
<script setup lang="ts">
defineProps<{
  data: {
    name: string
    attributes?: Array<{ name: string, type: string, visibility: string }>
    operations?: Array<{ name: string, parameters?: string[], returnType: string, visibility: string }>
  }
}>()
</script>

<template>
  <div class="sysml-class-node">
    <div class="class-header">
      <span class="stereotype">«Class»</span>
      <span class="name">{{ data.name }}</span>
    </div>
    <div v-if="data.attributes?.length" class="class-attributes">
      <div v-for="attr in data.attributes" :key="attr.name">
        {{ attr.visibility }} {{ attr.name }}: {{ attr.type }}
      </div>
    </div>
    <div v-if="data.operations?.length" class="class-operations">
      <div v-for="op in data.operations" :key="op.name">
        {{ op.visibility }} {{ op.name }}({{ op.parameters?.join(', ') }}): {{ op.returnType }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.sysml-class-node {
  background: white;
  border: 2px solid #333;
  border-radius: 8px;
  min-width: 150px;
  font-family: 'Courier New', monospace;
}

.class-header {
  padding: 8px;
  background: #f0f0f0;
  border-bottom: 1px solid #333;
  text-align: center;
}

.stereotype {
  font-style: italic;
  color: #666;
  font-size: 0.8em;
}

.class-attributes,
.class-operations {
  padding: 4px 8px;
}

.class-attributes {
  border-bottom: 1px solid #ddd;
}
</style>
```

---

## 🎨 UI/UX 设计建议

### 工具栏设计
```
┌─────────────────────────────────────────────────┐
│ File Edit View Tools Help                       │
├─────────────────────────────────────────────────┤
│ [📦] [📋] [🔗] [⚡] [🔍] [↻] [⚙️]              │
├─────────────────────────────────────────────────┤
│                                                 │
│              SysML Canvas                       │
│                                                 │
├─────────────────────────────────────────────────┤
│ Properties | Console | Outline                  │
└─────────────────────────────────────────────────┘
```

### 快捷键支持
- `Ctrl+N`: 新建图表
- `Ctrl+S`: 保存
- `Delete`: 删除选中元素
- `Ctrl+Z/Y`: 撤销/重做
- `Ctrl+A`: 全选
- `Ctrl+C/V`: 复制/粘贴

---

## 🔧 后端集成考虑

### CS 架构设计
```
前端 (Vue 3 + Vue Flow) ─── REST/WebSocket ──→ 后端 (Node.js/Go/Java)
                                      │
                                      ├── 项目管理
                                      ├── 图表存储
                                      ├── 版本控制
                                      ├── 协作编辑
                                      └── SysML 验证
```

### 数据模型
```typescript
// 前端数据结构
interface SysMLProject {
  id: string
  name: string
  diagrams: SysMLDiagram[]
  createdAt: Date
  updatedAt: Date
}

interface SysMLDiagram {
  id: string
  name: string
  type: 'package' | 'class' | 'sequence' | 'activity' | ...
  elements: SysMLElement[]
  relationships: SysMLRelationship[]
  viewport: { x: number; y: number; zoom: number }
}
```

---

## 📈 性能优化建议

### 1. 虚拟化渲染
- 对于大型图表，使用虚拟滚动
- 只渲染可视区域的元素

### 2. 增量更新
- 使用 Vue 3 的响应式系统优化重渲染
- 批量更新节点和边

### 3. Web Workers
- 复杂计算（如布局算法）移到 Web Worker
- 避免阻塞主线程

### 4. 内存管理
- 及时清理不再使用的图形对象
- 使用对象池复用元素

---

## 🎯 总结

**推荐技术栈**：
1. **AntV X6** - 企业级图形库（强烈推荐）
2. **Vue Flow** - 轻量级备选方案
3. **Konva.js** - 复杂图形补充
4. **D3.js** - 数据可视化增强

**优势**：
- 🏢 **企业级**：AntV X6 提供商业级稳定性和功能
- 🎨 **现代化**：Vue 3 + TypeScript
- 🚀 **高性能**：SVG 渲染，支持大规模图表
- 🔧 **易扩展**：丰富的插件生态和自定义能力
- 👥 **协作友好**：支持实时协作和版本控制
- 📚 **文档完善**：中文文档，降低学习成本

**开始开发**：
```bash
# 1. 创建插件
pnpm create-plugin sysml-modeler "SysML v2 建模工具"

# 2. 安装 AntV X6（推荐）
cd plugins/sysml-modeler
pnpm add @antv/x6 @antv/x6-vue-shape

# 3. 开始编码
# 参考上面的 AntV X6 示例代码
```

**选择建议**：
- **企业应用**：选择 AntV X6，功能最全面
- **快速原型**：选择 Vue Flow，开发效率高
- **复杂图形**：选择 Konva.js，自定义能力强
- **数据可视化**：结合 D3.js，增强分析能力

这个技术选型既满足了 SysML v2 的复杂建模需求，又保持了良好的开发体验和性能表现。

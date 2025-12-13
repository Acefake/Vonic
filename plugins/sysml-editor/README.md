# SysML v2 编辑器插件

基于 AntV X6 的 SysML v2 图形编辑器与元模型管理插件。

## 功能特性

### 元模型支持

支持 SysML v2 核心元素：

| 类别 | 元素类型 |
|------|----------|
| **结构** | PartDefinition, PartUsage |
| **接口** | PortDefinition, PortUsage |
| **数据** | ItemDefinition, AttributeDefinition |
| **需求** | RequirementDefinition |
| **约束** | ConstraintDefinition |
| **行为** | ActionDefinition, StateDefinition |

### 关系类型

- **composition** - 组合关系
- **reference** - 引用关系
- **generalization** - 泛化关系
- **dependency** - 依赖关系
- **connection** - 连接关系
- **allocation** - 分配关系
- **satisfy** - 满足关系
- **verify** - 验证关系

### 编辑功能

- 拖拽创建元素
- 连线建立关系
- 多选/框选
- 复制/粘贴 (Ctrl+C/V)
- 撤销/重做 (Ctrl+Z/Y)
- 对齐辅助线
- 缩放/平移
- 属性面板编辑

## 安装依赖

```bash
cd plugins/sysml-editor
pnpm install
```

## 使用方式

1. 在 Vonic 应用中启用插件
2. 点击侧边栏的 "SysML v2 编辑器"
3. 从左侧元素面板拖拽元素到画布
4. 通过端口连接创建关系
5. 在右侧属性面板编辑元素属性

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z / Ctrl+Y | 重做 |
| Delete / Backspace | 删除选中 |
| Ctrl+鼠标滚轮 | 缩放 |
| Ctrl+拖拽 | 平移画布 |

## 技术栈

- **图形引擎**: AntV X6 v2
- **前端框架**: Vue 3 + TypeScript
- **UI 组件**: Ant Design Vue
- **插件系统**: @vonic/plugin-electron

## 路线图

- [ ] 模型持久化到本地文件
- [ ] SysML v2 文本语法支持
- [ ] 双向同步（图形 ↔ 文本）
- [ ] 多种图表视图（BDD, IBD, REQ, STM）
- [ ] 模型导入/导出
- [ ] 约束验证

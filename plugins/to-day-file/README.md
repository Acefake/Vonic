# 到日文件

**一个功能强大的日文件管理系统，帮助你高效地管理每日任务和文件。**

## 功能特性

### 📅 日常管理
- **今日文件追踪**: 快速查看并管理今天的所有文件
- **文件创建**: 支持快速创建新文件，自动关联到当前日期
- **状态追踪**: 支持待办、已完成、已归档三种状态
- **分类标签**: 为文件添加分类和标签，便于管理

### 📊 统计分析
- **实时统计**: 显示总数、今日数、完成数、待办数
- **分类统计**: 按文件分类进行统计
- **进度追踪**: 一眼看出完成进度

### 📤 数据管理
- **导出功能**: 将所有文件导出为JSON格式备份
- **导入功能**: 从JSON文件导入文件数据
- **数据持久化**: 所有数据自动保存到本地存储

### 🎯 高效操作
- **快速筛选**: 按状态筛选显示待办、已完成或已归档任务
- **批量操作**: 支持快速标记完成和删除
- **即时刷新**: 一键刷新获取最新数据

## 使用指南

### 基本操作

1. **创建文件**
   - 点击"新建文件"按钮
   - 输入文件名
   - 点击"保存"确认创建

2. **管理文件**
   - 点击文件旁的✓图标标记为已完成
   - 点击删除图标移除文件
   - 使用状态筛选按钮快速查看不同状态的文件

3. **导出文件**
   - 点击"导出"按钮
   - 选择保存位置
   - 所有文件将被保存为JSON格式

4. **导入文件**
   - 点击"导入"按钮
   - 选择之前导出的JSON文件
   - 文件将被导入到系统中

## 插件架构

### 核心类

```typescript
// 到日文件接口
interface ToDayFile {
  id: string                           // 唯一标识符
  name: string                         // 文件名
  date: string                         // 日期 (YYYY-MM-DD)
  filePath: string                     // 文件路径
  tags: string[]                       // 标签数组
  category: string                     // 分类
  status: 'pending' | 'completed' | 'archived'  // 状态
  createdAt: Date                      // 创建时间
  updatedAt: Date                      // 更新时间
}

// 统计信息
interface Statistics {
  total: number                        // 总文件数
  todayCount: number                   // 今日文件数
  pendingCount: number                 // 待办数
  completedCount: number               // 已完成数
  byCategory: Record<string, number>   // 按分类统计
}
```

### 暴露的IPC接口

| 接口 | 描述 | 参数 |
|------|------|------|
| `getAllFiles` | 获取所有文件 | 无 |
| `getTodayFiles` | 获取今日文件 | 无 |
| `createFile` | 创建新文件 | 文件数据对象 |
| `updateFile` | 更新文件 | id, 更新数据 |
| `deleteFile` | 删除文件 | 文件id |
| `getStatistics` | 获取统计信息 | 无 |
| `importFiles` | 导入文件 | 无 |
| `exportFiles` | 导出文件 | 无 |

## 存储结构

所有数据存储在本地存储中，键为 `to-day-files`：

```json
{
  "files": [
    {
      "id": "file_1234567890_abc123",
      "name": "完成项目文档",
      "date": "2024-12-08",
      "filePath": "/path/to/file",
      "tags": ["文档", "紧急"],
      "category": "工作",
      "status": "pending",
      "createdAt": "2024-12-08T10:00:00Z",
      "updatedAt": "2024-12-08T10:00:00Z"
    }
  ],
  "tags": ["文档", "紧急"],
  "categories": ["工作", "生活"]
}
```

## 快捷命令

| 命令 | 说明 |
|------|------|
| `create-new-file` | 快速创建新文件 |
| `show-today-files` | 查看今日文件统计 |
| `export-files` | 导出所有文件 |

## 开发说明

### 项目结构

```
to-day-file/
├── manifest.json       # 插件清单配置
├── index.ts            # 插件核心逻辑
├── Panel.vue           # UI面板组件
├── package.json        # NPM配置
└── README.md           # 本文档
```

### 主要依赖

- `@vonic/plugin-electron` - Vonic插件SDK
- `Vue 3` - UI框架
- `Ant Design Vue` - UI组件库

## 更新历史

### v1.0.0 (2024-12-08)
- 初始版本发布
- 实现基础的文件管理功能
- 支持导入导出
- 完整的UI界面

## 许可证

MIT

## 支持

如有问题或建议，欢迎提交 Issue 或 Pull Request。

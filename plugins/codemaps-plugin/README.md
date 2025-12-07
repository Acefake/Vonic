# Codemaps

代码地图管理工具，帮助你快速导航和理解代码结构。

## 功能

- 可视化代码结构
- 快速导航到代码位置
- 代码关系图展示
- 支持多种编程语言

## 使用方法

1. 启用插件后，在侧边栏可以看到 Codemaps 面板
2. 打开项目后，插件会自动分析代码结构
3. 点击节点可以快速跳转到对应代码位置
4. 支持缩放和拖拽查看代码地图

## 开发说明

本插件演示了 Vonic 插件系统的高级功能：

- `api.panels.register()` - 注册面板
- `api.commands.register()` - 注册命令
- `api.ui.showMessage()` - 显示消息提示

## 文件结构

```
codemaps-plugin/
├── manifest.json   # 插件清单
├── index.js        # 插件入口
├── Panel.vue       # 面板组件
└── README.md       # 说明文档
```

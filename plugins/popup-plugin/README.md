# 弹窗助手

展示视图、子窗口和弹窗功能的示例插件。

## 功能

- **面板视图**：在侧边栏展示插件面板
- **编辑器视图**：打开独立的编辑器窗口
- **设置视图**：插件配置界面
- **子窗口**：创建独立的子窗口

## 使用方法

1. 启用插件后，在侧边栏可以看到插件面板
2. 点击面板中的按钮可以打开不同类型的视图
3. 支持打开编辑器、设置页面和独立子窗口

## 开发说明

本插件演示了 Vonic 插件系统的核心功能：

- `api.panels.register()` - 注册面板
- `api.views.open()` - 打开视图
- `api.windows.create()` - 创建子窗口
- `api.commands.register()` - 注册命令

## 文件结构

```
popup-plugin/
├── manifest.json   # 插件清单
├── index.js        # 插件入口
├── Panel.vue       # 面板组件
├── Editor.vue      # 编辑器组件
├── Settings.vue    # 设置组件
└── README.md       # 说明文档
```

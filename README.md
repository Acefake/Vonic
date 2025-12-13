# Vonic - 现代化 Electron + Vue 3 + TypeScript 桌面应用开发框架

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5-green.svg)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-38.1-blue.svg)](https://www.electronjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15-orange.svg)](https://pnpm.io/)

Vonic 是一个**企业级 Electron + Vue 3 + TypeScript** 桌面应用开发框架，采用 **Monorepo 架构** 和**插件化设计**，提供完整的桌面应用开发解决方案。

## ✨ 核心特性

### 🚀 现代化技术栈
- **Vue 3 + TypeScript**: 类型安全，开发友好
- **Electron 38**: 最新 Electron API，高性能跨平台
- **Monorepo 架构**: pnpm + turbo 实现高效多包管理
- **UnoCSS**: 原子化 CSS，极致性能

### 🧩 强大的插件系统
- **三轨插件架构**: 内置、外部、开发三种插件类型
- **完整的插件生命周期**: 安装、激活、停用、卸载
- **安全沙箱执行**: 插件代码在隔离环境运行
- **.vpkg 插件包格式**: 支持分发和安装

### 🔧 生产就绪功能
- **完整的 IPC 通信框架**: 主进程与渲染进程完全分离
- **模块化应用 API**: 统一、类型安全的 API 接口
- **多窗口管理系统**: 窗口通信、懒加载机制
- **内置基础服务**: 文件操作、日志、存储、通知等

## 🏗️ 项目架构

```
Vonic Monorepo (pnpm + Turbo)
├── apps/electron/                # 主应用程序
│   ├── src/main/                # 主进程代码 (Node.js)
│   │   ├── core/                # 核心管理器
│   │   │   ├── window.ts        # 窗口管理器
│   │   │   ├── file.ts          # 文件管理器
│   │   │   ├── plugin/         # 插件管理器
│   │   │   └── ...
│   │   ├── config/              # 配置文件
│   │   └── index.ts             # 主进程入口
│   ├── src/renderer/           # 渲染进程 (Vue 3)
│   │   ├── src/app/            # 应用 API 模块
│   │   ├── views/              # 页面视图
│   │   ├── components/         # 共享组件
│   │   └── hooks/              # Vue 组合式函数
│   ├── src/preload/            # 预加载脚本 (IPC 桥接)
│   └── src/shared/             # 共享类型和常量
├── packages/                   # 核心库包
│   ├── core/plugin/            # 插件系统
│   │   ├── plugin-electron/    # Electron 插件 SDK
│   │   └── plugin-web/         # Web 插件 SDK
│   ├── shared/                # 共享类型定义
│   ├── effects/               # 特效和图表库
│   └── cli/                   # 插件开发 CLI 工具
└── plugins/                   # 示例插件
    ├── todo-list/             # 待办清单示例
    ├── sysml-editor/          # SysML 编辑器示例
    └── popup-plugin/          # 弹窗插件示例
```

## ⚡ 快速开始

### 环境要求
- Node.js 18+
- pnpm 9+
- TypeScript 5.9+

### 安装依赖
```bash
# 安装项目依赖
pnpm install
```

### 开发模式
```bash
# 启动 Electron 应用（热重载开发环境）
pnpm dev

# 仅启动 Web 渲染进程
pnpm dev:web
```

### 构建和发布
```bash
# 构建应用（所有平台）
pnpm build

# 构建 Windows 安装包
pnpm build:win

# 构建 macOS 安装包
pnpm build:mac

# 构建 Linux 安装包
pnpm build:linux

# 构建分析报告
pnpm build:analyze
```

## 🛠️ 插件开发

### 创建插件模板
```bash
# 使用 CLI 创建插件
pnpm create-plugin my-plugin "我的插件"
```

### 插件目录结构
```bash
my-plugin/
├── manifest.json      # 插件清单配置
├── index.ts          # 插件入口文件
├── Panel.vue         # 插件面板组件 (可选)
├── Editor.vue        # 编辑器组件 (可选)
└── package.json      # 依赖配置
```

### 插件清单示例
```json
{
  "id": "todo-list",
  "name": "待办清单",
  "version": "1.0.0",
  "author": "开发者名称",
  "description": "待办清单管理插件",
  "main": "index.ts"
}
```

### 插件代码示例
```typescript
import type { Plugin, PluginAPI } from '@vonic/plugin-electron'

const plugin: Plugin = {
  id: 'my-plugin',
  name: '我的插件',
  version: '1.0.0',

  async activate(api: PluginAPI): Promise<void> {
    api.logger.info('插件已激活')
    
    // 注册面板
    api.panels.register({
      type: 'component',
      title: '插件面板',
      componentPath: 'Panel.vue'
    })
    
    // 注册命令
    api.commands.register('hello', '打招呼', () => {
      api.ui.showMessage('success', '你好！')
    })
    
    // IPC 处理器
    api.ipc.handle('getData', () => ({
      message: 'Hello from plugin'
    }))
  },

  async deactivate(): Promise<void> {
    // 清理资源
  }
}

export default plugin
```

### 构建和打包插件
```bash
# 构建插件为 .vpkg 包
pnpm build-plugin plugins/my-plugin --minify

# 或使用 CLI
vonic build plugins/my-plugin --minify
```

## 📚 核心概念

### 应用 API (`window.app`)
渲染进程可通过 `window.app` 访问所有应用功能：

```typescript
// 文件操作
const content = await app.file.readFile('./data.json')
await app.file.saveFile(content)

// 存储管理
await app.storage.set('key', { data: 'value' })
const data = await app.storage.get('key')

// 窗口管理
const newWindow = await app.window.create({
  title: '新窗口',
  width: 800,
  height: 600
})

// 插件管理
const plugin = app.plugin.get('todo-list')
await plugin.invoke('getData')
```

### IPC 通信模式
```typescript
// 主进程注册处理器
ipcMain.handle('file:read', async (_, path: string) => {
  return fs.readFileSync(path, 'utf-8')
})

// 渲染进程调用
const content = await window.electron.ipcRenderer.invoke('file:read', './data.json')
```

### 插件安全沙箱
```
Renderer Process (Vue)
        ↓
Preload Script (contextBridge)
        ↓
Main Process (IPC Handlers)
        ↓
Plugin VM Sandbox
        ↓
Plugin Code Execution
```

## 🔧 配置和优化

### Electron 配置
```typescript
// electron.vite.config.ts
// - 代码分包：echarts、antd 等大库单独分包
// - 字节码保护：生产环境启用 bytecodePlugin
// - Tree-shaking：激进摇树优化
```

### 构建优化
- **代码分包策略**: 自动识别大库并单独分包
- **懒加载支持**: 按需加载插件和组件
- **体积分析**: 支持 `--mode analyze` 生成构建报告

### 多平台支持
- **Windows**: NSIS 安装程序 + 便携版
- **macOS**: DMG + 代码签名支持
- **Linux**: AppImage + deb + rpm

## 🚀 开发工作流

### 代码质量
```bash
# 代码格式化
pnpm format

# ESLint 检查
pnpm lint
pnpm lint:fix

# TypeScript 类型检查
pnpm typecheck
```

### Git Hook
项目配置了 `simple-git-hooks` 和 `lint-staged`，提交前自动检查和修复代码。

### 版本管理
项目使用语义化版本控制，可以通过 `electron-updater` 实现自动更新。

## 📖 详细文档

- [插件开发指南](./docs/plugin-development.md) - 完整的插件开发文档
- [架构设计说明](./.github/copilot-instructions.md) - AI 协同开发指南
- 产品配置: `apps/electron/src/config/product.config.ts`
- 窗口配置: `apps/electron/src/main/config/windows.ts`

## 🤝 贡献

1. **Fork 项目**：点击右上角的 Fork 按钮
2. **创建分支**：`git checkout -b feature/your-feature`
3. **提交更改**：`git commit -m 'Add some feature'`
4. **推送分支**：`git push origin feature/your-feature`
5. **创建 PR**：在新分支页面创建 Pull Request

### 编码规范
- 使用 TypeScript 严格模式
- 遵循 Vue 3 组合式 API 最佳实践
- 主进程与渲染进程通过 IPC 通信
- 禁止直接访问 Node.js API（从渲染进程）

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目和工具：
- [Electron](https://www.electronjs.org/)
- [Vue.js](https://vuejs.org/)
- [UnoCSS](https://unocss.dev/)
- [Ant Design Vue](https://antdv.com/)
- [electron-vite](https://electron-vite.org/)
- 以及所有依赖的社区项目

---

**Vonic** - 让桌面应用开发更简单、更高效、更安全！

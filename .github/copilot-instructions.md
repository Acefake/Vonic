# Vonic Copilot Instructions

Vonic 是一个 **Electron + Vue 3 + TypeScript** 的现代化桌面应用开发框架，采用 **Monorepo 架构** 和**插件化设计**。本指南帮助 AI 助手快速理解代码库的关键模式和约定。

## 核心架构

### 三层隔离 + 插件系统
```
Monorepo (pnpm + Turbo)
├── apps/electron/          # 主应用（Electron）
│   ├── src/main/           # 主进程（Node.js）
│   ├── src/renderer/       # 渲染进程（Vue 3）
│   ├── src/preload/        # 预加载脚本（IPC 桥接）
│   └── src/shared/         # 共享常量
├── packages/               # 核心库（可复用）
│   ├── shared/            # 类型定义和常量
│   ├── core/plugin/       # 插件系统 (@vonic/plugin-electron)
│   ├── effects/           # 特效库（ECharts、动画）
│   └── cli/               # 插件开发 CLI
└── plugins/               # 内置插件示例
```

### 数据流向
```
Renderer (Vue) --[IPC]→ Main (Node.js) --[FS/System]→ OS
                ↓
            Plugin API (Secure Sandbox)
```

## 关键模式

### 1. IPC 通信模式（禁止直接 NodeIntegration）
- **为什么**：安全性 + 可维护性
- **正确做法**：通过 `app.file.readFile()` 等 API 调用，而非 `window.require('fs')`
- **实现**：每个功能域在 `src/renderer/src/app/modules/` 中定义 API，通过 `platform/index.ts` 中的 `getIPCRenderer()` 调用 IPC
- **平台检测**：使用 `isElectron`（来自 `platform/index.ts`）区分 Electron 和 Web 环境，提供回退实现

### 2. 存储策略
- **持久化存储**：`electron-store`（自动 JSON 序列化到 `~/.config/Vonic/`）
- **访问方式**：`app.storage.get()` / `app.storage.set()`
- **插件隔离**：各插件存储自动添加前缀 `plugin:{pluginId}:`
- **示例**：
  ```typescript
  // 渲染进程
  await app.storage.set('key', { data: 'value' })
  // 插件内自动隔离
  api.storage.set('key', value)  // 实际存储为 'plugin:todo-list:key'
  ```

### 3. 插件系统（核心扩展机制）
- **三种插件类型**：
  - **内置** (Builtin): `apps/electron/src/main/core/plugin/` 中的插件，随应用打包
  - **外部** (External): `.vpkg` 格式，用户安装到 `~/.config/Vonic/plugins/`
  - **开发** (Dev): 开发阶段加载，位于 `plugins/` 目录
- **插件生命周期**：
  ```typescript
  const plugin: Plugin = {
    id: 'my-plugin',
    name: '我的插件',
    version: '1.0.0',
    async activate(api: PluginAPI) {
      // 注册命令、面板、IPC 处理器等
      api.commands.register('hello', '打招呼', () => {});
      api.panels.register({ type: 'component', title: '面板', componentPath: 'Panel.vue' });
      api.ipc.handle('getData', () => ({ message: 'Hello' }));
    },
    async deactivate() { /* 清理资源 */ }
  }
  ```
- **插件视图注册**：插件可通过 `api.views.register()` 注册窗口、模态框或导航视图，通过 `/plugin-view/{viewId}` 路由打开
- **插件 UI API**：`api.ui.showMessage`、`api.ui.showConfirm`、`api.ui.showInput` 等提供用户交互
- **插件激活时机**：主窗口加载完成后自动激活已启用的插件（参见 `main/index.ts` 中的 `did-finish-load` 事件）

### 4. 窗口管理
- **单例模式**：`WindowManager` 使用 `getInstance()` 获取实例
- **窗口标识**：使用 `WindowName` 枚举（来自 `shared/constants.ts`）确保一致性
- **子窗口通信**：通过 IPC 发送消息，父窗口可通过 `WindowManager.createWindow()` 创建并跟踪子窗口

## 开发工作流

### 常用命令
```bash
# 安装依赖
pnpm install

# 启动 Electron 应用（带热重载）
pnpm dev

# 仅启动 Web 渲染进程（用于独立前端开发）
pnpm dev:web

# 代码检查
pnpm lint
pnpm typecheck

# 构建应用
pnpm build:win      # Windows
pnpm build:mac      # macOS
pnpm build:linux    # Linux
pnpm build:analyze  # 生成构建分析报告（stats.html）

# 插件开发
pnpm create-plugin my-plugin "我的插件"   # 脚手架生成
pnpm build-plugin plugins/my-plugin --minify  # 生成 .vpkg
```

### 构建优化
- **代码分包**：特大库（echarts、antd 等）单独分包（配置在 `electron.vite.config.ts`）
- **字节码保护**：生产环境启用 `bytecodePlugin`（防反编译）
- **Tree-shaking**：激进优化 `moduleSideEffects: false`
- **多平台适配**：通过 `electron-builder.yml` 配置 Windows NSIS、macOS DMG、Linux AppImage

## 代码约定

### 类型安全
- **共享类型**：`packages/shared/src/types.ts` 和 `apps/electron/src/shared/types.ts` 定义核心接口
- **插件接口**：`@vonic/plugin-electron` 提供 `Plugin` 和 `PluginAPI` 类型，编译时检查
- **WindowName 枚举**：窗口标识，确保名称一致性

### 代码风格
- **ESLint 配置**：使用 `@antfu/eslint-config`，遵循 Vue 3 组合式 API 最佳实践
- **Prettier**：自动格式化，配置在 `.prettierrc.yaml`
- **Git Hook**：`simple-git-hooks` + `lint-staged` 在提交前自动检查和修复

### 文件组织
- **主进程**：`src/main/core/` 下一个管理器一个类（如 `FileManager`、`DialogManager`），每个类有 `registerHandlers()` 方法注册 IPC 处理器
- **渲染进程**：`src/renderer/src/app/modules/` 下每个功能域一个模块，通过 `app` 对象暴露
- **平台适配**：`src/renderer/src/app/platform/` 处理 Electron 与 Web 的差异

## 常见陷阱

| 问题 | 错误示例 | 正确做法 |
|------|---------|---------|
| 直接访问 Node.js | `window.require('fs')` | 使用 `app.file.readFile()` |
| 在渲染进程做 CPU 密集运算 | 长 for 循环 | 使用 Worker 或在主进程处理 |
| 插件 ID 重复 | `id: "Plugin"` | 使用 kebab-case: `id: "my-plugin"` |
| 忘记导出插件 | `const plugin = {...}` | `export default plugin` |
| 异步插件激活未等待 | 未 await `activate()` | 始终 await，确保加载完成 |
| 存储键冲突 | `api.storage.set('key', value)` | 利用自动前缀，或手动添加命名空间 |

## 安全限制
- ⚠️ **插件安全**：当前 VM 沙箱权限过宽，建议实施权限声明系统
- ⚠️ **插件签名**：缺少插件来源验证，建议添加签名机制
- ⚠️ **版本兼容**：插件 manifest 缺少主程序版本要求字段

## 扩展阅读
- 插件开发完整文档：`docs/plugin-development.md`
- 产品配置：`apps/electron/src/config/product.config.ts`
- 窗口配置：`apps/electron/src/main/config/windows.ts`
- 架构设计说明：`PLUGIN_SYSTEM_DESIGN.md`

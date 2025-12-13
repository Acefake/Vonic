# Vonic 插件系统架构设计详解

## 📋 目录
1. [整体架构](#整体架构)
2. [核心组件](#核心组件)
3. [插件生命周期](#插件生命周期)
4. [API设计](#api设计)
5. [安全机制](#安全机制)
6. [交互流程](#交互流程)
7. [扩展性设计](#扩展性设计)
8. [已知问题](#已知问题)

---

## 整体架构

### 🏗️ 架构全景图

```
┌─────────────────────────────────────────────────────────────┐
│                     Vonic 应用                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  Renderer       │          │   Main Process   │        │
│  │  (Vue 3 UI)     │◄───IPC──►│  (Node.js)       │        │
│  └──────────────────┘          └──────────────────┘        │
│          │                             │                    │
│          │                             ▼                    │
│          │                    ┌──────────────────┐          │
│          │                    │ PluginManager    │          │
│          │                    │  - 管理插件     │          │
│          │                    │  - 生命周期     │          │
│          │                    │  - 状态持久化   │          │
│          │                    └──────────────────┘          │
│          │                             │                    │
│          │      ┌──────────────────────┼──────────────────┐
│          │      ▼                      ▼                  ▼
│    ┌──────────────┐         ┌──────────────┐    ┌──────────────┐
│    │  Builtin     │         │  External    │    │   Dev        │
│    │  Plugins     │         │  Plugins     │    │  Plugins     │
│    │  (内置)      │         │  (.vpkg)     │    │  (开发)      │
│    └──────────────┘         └──────────────┘    └──────────────┘
│
│  ┌─────────────────────────────────────────┐
│  │       VM Sandbox (插件运行环境)          │
│  │  - 限制访问权限                          │
│  │  - 隔离执行上下文                        │
│  │  - 支持 TypeScript 编译                  │
│  └─────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────┘
```

### 📦 三层插件架构

| 插件类型 | 位置 | 特点 | 加载时机 | 用途 |
|---------|------|------|---------|------|
| **Builtin** | 应用内置 | 随应用打包 | 应用启动 | 核心功能扩展 |
| **External** | `~/.config/Vonic/plugins/` | 用户安装（.vpkg）| 应用启动 | 第三方功能 |
| **Dev** | `plugins/` 目录 | 开发调试 | 开发模式 | 开发测试 |

---

## 核心组件

### 1. **PluginManager** (主进程)

**职责**: 管理插件的完整生命周期

```typescript
class PluginManager {
  // 核心容器
  private plugins: Map<string, Plugin>              // 已加载的插件对象
  private pluginAPIs: Map<string, PluginAPIImpl>    // 插件API实例
  private pluginStates: Map<string, PluginState>   // 插件状态
  private externalPlugins: Map<string, ...>        // 外部插件注册信息
  private devPlugins: Map<string, ...>             // 开发插件注册信息

  // 核心方法
  initHandlers()              // 初始化 IPC 处理器
  activatePlugin(id)          // 激活插件
  deactivatePlugin(id)        // 停用插件
  installPlugin(path)         // 安装插件
  uninstallPlugin(id)         // 卸载插件
  getAllPlugins()             // 获取所有插件信息
}
```

**关键特性**:
- ✅ 多状态管理：enabled/disabled, loaded/unloaded
- ✅ 自动扫描：启动时扫描已安装插件
- ✅ 持久化状态：保存插件启用/禁用状态
- ✅ 错误恢复：插件加载失败时的清理机制

### 2. **PluginAPIImpl** (插件API)

**职责**: 为插件提供安全的应用接口

```typescript
class PluginAPIImpl {
  // API 模块
  logger: Logger // 日志记录（自动添加插件ID前缀）
  storage: Storage // 隔离存储（自动添加 plugin:pluginId: 前缀）
  commands: CommandRegistry // 命令注册
  ui: UIModule // UI 操作（消息、通知、对话框）
  views: ViewRegistry // 视图注册和管理
  menus: MenuRegistry // 菜单注册
  panels: PanelRegistry // 面板注册
  clipboard: ClipboardAPI // 剪贴板操作
  ipc: IPCBridge // IPC 通信
}
```

**安全机制**:
- 🔒 命名空间隔离：所有IPC处理器自动添加 `plugin:pluginId:` 前缀
- 🔒 存储隔离：插件存储自动添加 `plugin:pluginId:` 前缀
- 🔒 API受限：插件只能访问预定义的API，无法访问Node.js全局对象

### 3. **插件Manifest** (清单配置)

```json
{
  "id": "todo-list", // 唯一标识符（kebab-case）
  "name": "待办清单", // 显示名称
  "version": "1.0.0", // 语义化版本
  "author": "Developer", // 作者
  "description": "管理待办任务", // 描述
  "main": "index.ts" // 入口文件（相对路径）
}
```

**约束**:
- `id`: 必需，英文kebab-case，全局唯一
- `name`: 必需，可以是中文
- `version`: 必需，遵循语义化版本规范
- `main`: 必需，支持 `.ts` 和 `.js` 文件

---

## 插件生命周期

### 🔄 完整生命周期流程

```
1. 扫描 (Scan)
   ├─ 启动时自动扫描外部插件目录
   ├─ 读取 manifest.json 获取插件信息
   └─ 注册插件条目但不加载代码

2. 加载 (Load)
   ├─ 按需加载插件代码（激活时触发）
   ├─ 支持 .ts 和 .js 文件
   ├─ 使用 sucrase 编译 TypeScript
   ├─ 运行在 vm.Script 中的隔离上下文
   └─ 提取 default export 作为插件对象

3. 激活 (Activate)
   ├─ 创建 PluginAPIImpl 实例
   ├─ 调用 plugin.activate(api)
   ├─ 保存激活状态到存储
   ├─ 发送 IPC 消息通知渲染进程
   └─ 插件在此时注册 UI 元素、命令等

4. 运行 (Running)
   ├─ 插件处理用户交互
   ├─ 通过 IPC 与其他层通信
   ├─ 访问受限的应用 API
   └─ 监听事件和处理请求

5. 停用 (Deactivate)
   ├─ 调用 plugin.deactivate()（如果存在）
   ├─ 清理所有 IPC 处理器
   ├─ 销毁所有打开的窗口
   ├─ 清理事件监听
   └─ 保存禁用状态

6. 卸载 (Uninstall)
   ├─ 确保插件已停用
   ├─ 删除插件目录
   ├─ 删除持久化状态
   └─ 删除插件数据
```

### 状态机模型

```
         ┌─────────────┐
         │   Not Found │
         └──────┬──────┘
                │ scan
                ▼
         ┌─────────────┐
         │  Registered │◄──────────────┐
         └──────┬──────┘               │ uninstall
                │ activate             │
                ▼                      │
         ┌─────────────┐               │
         │   Loading   │               │
         └──────┬──────┘               │
                │ success              │
                ▼                      │
         ┌─────────────┐               │
         │  Activated  │───deactivate──┤
         └─────────────┘               │
                                       │
         ┌─────────────┐               │
         │   Failed    │───uninstall───┘
         └─────────────┘
```

---

## API设计

### 🎯 API 模块详解

#### 1. **Logger** (日志)
```typescript
logger: {
  info(...args) // 信息日志
  warn(...args) // 警告日志
  error(...args) // 错误日志
}
// 自动添加前缀: [plugin-id]
```

#### 2. **Storage** (存储)
```typescript
storage: {
  get<T>(key, defaultValue?): T        // 读取数据
  set<T>(key, value): void             // 存储数据
  delete(key): void                    // 删除数据
}
// 自动隔离: plugin:pluginId:${key}
```

#### 3. **Commands** (命令)
```typescript
commands: {
  register(id, title, handler) // 注册命令
  // 自动生成 IPC 处理器: command:${pluginId}.${id}
}
```

#### 4. **UI** (用户界面)
```typescript
ui: {
  showMessage(type, content) // 消息提示
  showNotification(title, body) // 系统通知
  showConfirm(title, content) // 确认对话框
  showInput(title, placeholder) // 输入对话框
  showModal(options) // 自定义模态框
  openExternal(url) // 打开外部链接
}
```

#### 5. **Views** (视图)
```typescript
views: {
  register(id, config) // 注册视图（页面/模态/窗口）
  open(id, data) // 打开视图
  close(id) // 关闭视图
}
```

#### 6. **Panels** (面板)
```typescript
panels: {
  register(config) // 在侧边栏注册面板
  // config.type: 'component' | 'menu'
  // config.componentPath: Vue 组件路径
}
```

#### 7. **Menus** (菜单)
```typescript
menus: {
  registerSidebar(items) // 注册侧边栏菜单项
}
```

#### 8. **IPC** (进程通信)
```typescript
ipc: {
  handle(channel, handler) // 注册处理器
  send(channel, ...args) // 发送消息
  sendToMain(channel, ...args) // 发送给主窗口
  // 自动添加命名空间: plugin:${pluginId}:${channel}
}
```

---

## 安全机制

### 🔒 四层安全防护

#### 1. **上下文隔离** (Context Isolation)
```
Renderer ──contextBridge──> Preload ──IPC──> Main ──Plugin Manager
  (不可信)  (受限访问)      (受限)    (安全)  (受信)
```

#### 2. **VM 沙箱执行** ⚠️
```typescript
const context = vm.createContext({
  module: moduleExports,
  require: limitedRequire, // 受限的 require
  __filename,
  __dirname, // 文件路径
  console,
  process,
  Buffer, // ⚠️ 当前权限过宽！
  setTimeout,
  setInterval, // 计时器
})
```

**已知问题**:
- ❌ 插件可以访问完整的 `process` 对象
- ❌ 插件可以访问 `Buffer` 和 `require`
- ❌ 缺乏权限声明系统
- ❌ 缺乏插件签名验证

#### 3. **命名空间隔离** ✅
```typescript
// IPC 处理器自动添加前缀
const fullChannel = `plugin:${pluginId}:${userChannel}`
ipcMain.handle(fullChannel, handler)

// 存储自动添加前缀
const key = `plugin:${pluginId}:${userKey}`
storage.set(key, value)
```

#### 4. **API 受限** ✅
```typescript
// 插件只能通过预定义的 PluginAPI 访问应用功能
// 无法直接访问 Electron API、文件系统等
// 所有访问都经过主进程的 IPC 处理器
```

---

## 交互流程

### 📡 从UI到插件的完整流程

```
1. 用户在 UI 中触发事件
   └─ 例如：点击"创建新文件"按钮

2. Vue 组件调用 app.plugin.get('plugin-id').invoke('createFile', data)
   └─ 使用渲染进程的 ipc.invoke() 发送 IPC 消息

3. Preload 脚本转发到主进程
   └─ window.electron.ipcRenderer.invoke('plugin:plugin-id:createFile', data)

4. 主进程 PluginManager 接收消息
   └─ 查找注册的 IPC 处理器：plugin:plugin-id:createFile

5. 执行插件提供的处理器
   └─ handler(event, data) => result

6. 返回结果给渲染进程
   └─ Promise 解决

7. Vue 组件更新 UI
   └─ 反映新的数据状态
```

### 💾 插件存储隔离示例

```typescript
// 插件代码中
api.storage.set('userFiles', [/* 数据 */])

// 实际存储键
'plugin:todo-list:userFiles'

// 其他插件无法访问
const plugin2 = app.plugin.get('other-plugin')
// 访问的是 'plugin:other-plugin:userFiles'
```

---

## 扩展性设计

### 🎨 插件可以实现的功能

#### 注册 UI 元素
```typescript
api.panels.register({
  type: 'component',
  title: '我的面板',
  componentPath: 'Panel.vue'
})

api.commands.register('myCmd', '我的命令', async () => {
  // 命令逻辑
})

api.menus.registerSidebar([
  { id: 'menu1', label: '菜单项1', command: 'myCmd' }
])
```

#### 处理 IPC 请求
```typescript
api.ipc.handle('getData', async (arg) => {
  return { data: arg }
})

// 渲染进程调用
const result = await app.plugin.get('my-plugin').invoke('getData', 'test')
```

#### 打开新窗口
```typescript
api.views.register('editor', {
  title: '编辑器',
  type: 'window',
  window: { width: 800, height: 600 }
})

api.views.open('editor', { /* 初始数据 */ })
```

#### 持久化数据
```typescript
// 自动隔离，不影响其他插件
api.storage.set('settings', {
  theme: 'dark',
  language: 'zh-CN'
})

const settings = api.storage.get('settings')
```

### 📦 .vpkg 插件包格式

```
文件结构：
┌─ 6 字节 VPKG_MAGIC ────┐
│ 0x56 0x50 0x4B 0x47   │  "VPKG" 标记
│ 0x00 0x01             │  版本 1
└─────────────────────┬──┘
                      │
                      ▼
              ┌────────────────────┐
              │  ZIP 压缩包内容    │
              ├────────────────────┤
              │ manifest.json      │
              │ index.ts/.js       │
              │ Panel.vue          │
              │ ...其他资源        │
              └────────────────────┘
```

---

## 已知问题

### ⚠️ 安全问题

1. **VM 沙箱权限过宽**
   - 插件可以访问 `process`、`Buffer`、`require`
   - 风险：代码注入、数据泄露、系统破坏
   - 建议：实施白名单权限系统

2. **缺乏插件签名验证**
   - 无法验证插件来源
   - 风险：恶意插件安装
   - 建议：添加数字签名机制

3. **无版本兼容性检查**
   - manifest.json 缺少主程序版本要求
   - 风险：不兼容的API调用
   - 建议：添加 `engines.vonic` 字段

### 🐛 功能问题

4. **错误处理不完善**
   - 插件加载失败时的清理不彻底
   - 缺乏自动恢复机制

5. **依赖管理混乱**
   - 插件间依赖关系无法定义
   - 加载顺序无法控制

6. **监控指标缺失**
   - 无插件性能指标收集
   - 无插件错误追踪

### 📋 改进建议

```typescript
// 改进的 PluginManifest 设计
interface PluginManifestV2 {
  id: string
  name: string
  version: string
  engines: {
    vonic: '>=1.0.0' // 主程序版本要求
  }
  permissions: { // 权限声明
    system: ['notifications']
    database: ['read', 'write']
    network: ['http_GET']
  }
  dependencies?: { // 插件依赖
    'other-plugin': '>=1.0.0'
  }
  signature?: string // 数字签名
}
```

---

## 总结

### ✅ 优势
- 清晰的三层插件架构（Builtin/External/Dev）
- 完整的插件生命周期管理
- 语义清晰的 API 设计
- 命名空间隔离保证数据安全
- 灵活的扩展机制

### ⚠️ 待改进
- 安全沙箱权限控制不足
- 缺乏权限声明和签名验证
- 版本兼容性检查缺失
- 错误处理和恢复机制不完善
- 插件依赖关系管理缺失

### 🎯 设计理念
1. **安全第一**：分离主进程和渲染进程，IPC 隔离
2. **易于扩展**：丰富的 API，低门槛的插件开发
3. **用户友好**：完整的生命周期，优雅的 UI 集成
4. **企业就绪**：支持三种插件类型，灵活的部署方式

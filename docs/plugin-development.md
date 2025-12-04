# 插件开发指南

本文档介绍如何为 simu-tool 开发和安装插件。

## 插件包结构

插件需要打包成 `.zip` 文件，包含以下结构：

```
my-plugin/
├── manifest.json      # 必需：插件清单文件
├── index.js          # 必需：插件入口文件（由 manifest.main 指定）
└── ...               # 其他资源文件
```

## manifest.json 规范

```json
{
  "id": "my-plugin", // 必需：插件唯一标识符（英文，无空格）
  "name": "我的插件", // 必需：插件显示名称
  "version": "1.0.0", // 必需：版本号（语义化版本）
  "author": "作者名", // 可选：作者
  "description": "插件描述", // 可选：插件描述
  "main": "index.js" // 必需：入口文件路径（相对于 manifest.json）
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | string | ✅ | 插件唯一标识符，建议使用小写字母和连字符 |
| name | string | ✅ | 插件显示名称 |
| version | string | ✅ | 版本号，建议使用语义化版本 (如 1.0.0) |
| author | string | ❌ | 作者名称 |
| description | string | ❌ | 插件功能描述 |
| main | string | ✅ | 入口文件路径，相对于 manifest.json 所在目录 |

## 插件入口文件

入口文件需要导出一个实现 `Plugin` 接口的对象：

```javascript
// index.js
module.exports = {
  id: 'my-plugin',
  name: '我的插件',
  version: '1.0.0',

  // 插件加载时调用
  async onLoad(context) {
    context.logger.info('插件已加载')

    // 注册 IPC 处理器
    context.ipc.handle('my-action', async (data) => {
      return { success: true, data }
    })
  },

  // 插件启用时调用
  async onEnable() {
    console.log('插件已启用')
  },

  // 插件禁用时调用
  async onDisable() {
    console.log('插件已禁用')
  },

  // 插件卸载时调用
  async onUnload() {
    console.log('插件已卸载')
  }
}
```

## PluginContext API

插件在 `onLoad` 时会收到一个 `context` 对象，提供以下 API：

### logger

日志记录器，自动添加插件前缀：

```javascript
context.logger.info('信息日志')
context.logger.warn('警告日志')
context.logger.error('错误日志')
```

### storage

持久化存储：

```javascript
// 存储数据
context.storage.set('my-key', { value: 123 })

// 读取数据
const data = context.storage.get('my-key')
```

### ipc

IPC 通信：

```javascript
// 注册处理器（渲染进程可通过 plugin:my-plugin:channel 调用）
context.ipc.handle('channel', async (arg1, arg2) => {
  return result
})

// 监听事件
context.ipc.on('event', (event, data) => {
  console.log(data)
})
```

## 安装插件

1. 将插件打包成 `.zip` 文件
2. 在应用中点击「插件管理」→「安装插件」
3. 选择 `.zip` 文件
4. 安装完成后，在插件列表中启用插件

## 插件目录

已安装的插件存储在：
- Windows: `%APPDATA%/simu-tool/plugins/`
- macOS: `~/Library/Application Support/simu-tool/plugins/`
- Linux: `~/.config/simu-tool/plugins/`

## 开发模式快速开始

建议使用开发模式进行插件开发，无需每次打包：

1. 创建插件目录，包含 `manifest.json` 和入口文件
2. 在应用中点击「插件管理」→「添加开发插件」
3. 选择插件目录
4. 启用插件进行测试
5. 修改代码后，点击「重新加载」按钮即可生效

### 开发模式特性

- **无需打包**: 直接从本地目录加载
- **热重载**: 修改代码后即可重新加载
- **实时日志**: 插件日志输出到主进程控制台
- **开发标记**: 开发插件显示橙色「开发」标签

## 示例插件

参考 `src/main/plugins/` 目录下的内置插件实现。

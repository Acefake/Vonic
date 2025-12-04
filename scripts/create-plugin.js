#!/usr/bin/env node
/**
 * 插件模板生成脚本
 * 用法: node scripts/create-plugin.js <plugin-id> [plugin-name]
 * 示例: node scripts/create-plugin.js my-plugin 我的插件
 */

const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)

if (args.length === 0) {
  console.log('用法: node scripts/create-plugin.js <plugin-id> [plugin-name]')
  console.log('示例: node scripts/create-plugin.js my-plugin 我的插件')
  process.exit(1)
}

const pluginId = args[0]
const pluginName = args[1] || pluginId

// 验证 plugin-id 格式
if (!/^[a-z][a-z0-9-]*$/.test(pluginId)) {
  console.error('错误: plugin-id 只能包含小写字母、数字和连字符，且以字母开头')
  process.exit(1)
}

const pluginDir = path.join(__dirname, '../examples', pluginId)

if (fs.existsSync(pluginDir)) {
  console.error(`错误: 目录已存在: ${pluginDir}`)
  process.exit(1)
}

// 创建目录
fs.mkdirSync(pluginDir, { recursive: true })

// manifest.json
const manifest = {
  id: pluginId,
  name: pluginName,
  version: '1.0.0',
  author: 'Developer',
  description: `${pluginName}插件`,
  main: 'index.ts',
}

// types.ts - 类型定义
const typesTs = `/** 插件 API 类型定义 */

export interface PluginAPI {
  logger: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
  storage: {
    get: <T>(key: string, defaultValue?: T) => T
    set: <T>(key: string, value: T) => void
    remove: (key: string) => void
  }
  commands: {
    register: (id: string, title: string, handler: () => void | Promise<void>) => void
  }
  ui: {
    showMessage: (type: 'success' | 'info' | 'warning' | 'error', content: string) => void
    showNotification: (options: { title: string; body: string }) => void
    showConfirm: (title: string, content: string) => Promise<boolean>
    showInput: (title: string, placeholder?: string) => Promise<string | null>
  }
  views: {
    register: (id: string, config: ViewConfig) => void
    open: (id: string, data?: any) => void
  }
  panels: {
    register: (config: PanelConfig) => void
  }
  ipc: {
    handle: (channel: string, handler: (...args: any[]) => any) => void
    on: (channel: string, handler: (...args: any[]) => void) => void
    off: (channel: string, handler: (...args: any[]) => void) => void
    sendToMain: (channel: string, ...args: any[]) => void
  }
}

export interface ViewConfig {
  title: string
  type: 'page' | 'modal' | 'window'
  window?: {
    width?: number
    height?: number
    resizable?: boolean
    frame?: boolean
    modal?: boolean
  }
}

export interface PanelConfig {
  type: 'menu' | 'component'
  title?: string
  componentPath?: string
  menuItems?: { id: string; label: string; command: string }[]
}

export interface Plugin {
  id: string
  name: string
  version: string
  activate: (api: PluginAPI) => Promise<void>
  deactivate?: () => Promise<void>
}
`

// index.ts
const indexTs = `/**
 * ${pluginName}
 */

import type { PluginAPI, Plugin } from './types'

let api: PluginAPI | null = null

const plugin: Plugin = {
  id: '${pluginId}',
  name: '${pluginName}',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('${pluginName}已激活')

    // ===== 注册命令 =====
    api.commands.register('hello', '打招呼', async () => {
      api?.ui.showMessage('success', 'Hello from ${pluginName}!')
    })

    // ===== 注册自定义面板 =====
    api.panels.register({
      type: 'component',
      title: '${pluginName}',
      componentPath: 'Panel.vue',
    })

    // ===== IPC 接口 =====
    api.ipc.handle('getData', () => {
      return { message: 'Hello from ${pluginId}' }
    })

    api.ui.showMessage('success', '${pluginName}已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('${pluginName}已停用')
    api = null
  },
}

export default plugin
`

// Panel.vue
const panelVue = `<template>
  <div class="plugin-panel">
    <div class="panel-header">
      <h3>${pluginName}</h3>
    </div>
    
    <div class="panel-content">
      <p>{{ message }}</p>
      <AButton type="primary" @click="sayHello">打招呼</AButton>
    </div>
  </div>
</template>

<script setup>
import { Button as AButton, message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

const PLUGIN_ID = '${pluginId}'
const msg = ref('欢迎使用 ${pluginName}')

// 调用插件 IPC
async function invokePlugin(channel, ...args) {
  return await window.electron.ipcRenderer.invoke(\`plugin:\${PLUGIN_ID}:\${channel}\`, ...args)
}

async function sayHello() {
  const data = await invokePlugin('getData')
  message.success(data.message)
}

onMounted(async () => {
  const data = await invokePlugin('getData')
  msg.value = data.message
})
</script>

<style scoped>
.plugin-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.panel-header h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
}

.panel-content {
  flex: 1;
}
</style>
`

// 写入文件
fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(path.join(pluginDir, 'types.ts'), typesTs)
fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexTs)
fs.writeFileSync(path.join(pluginDir, 'Panel.vue'), panelVue)

console.log(`✅ 插件已创建: ${pluginDir}`)
console.log('')
console.log('文件列表:')
console.log('  - manifest.json')
console.log('  - types.ts')
console.log('  - index.ts')
console.log('  - Panel.vue')
console.log('')
console.log('开始使用:')
console.log('  1. 在应用中点击"加载开发插件"')
console.log(`  2. 选择目录: examples/${pluginId}`)
console.log('  3. 启用插件')

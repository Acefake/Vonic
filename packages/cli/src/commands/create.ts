import * as fs from 'node:fs'
import * as path from 'node:path'

export async function createPlugin(args: string[]): Promise<void> {
  const pluginName = args[0]

  if (!pluginName) {
    console.log('用法: vonic create <plugin-name>')
    process.exit(1)
  }

  const pluginId = pluginName.toLowerCase().replace(/\s+/g, '-')
  const pluginDir = path.resolve(pluginId)

  if (fs.existsSync(pluginDir)) {
    console.error(`错误: 目录已存在: ${pluginDir}`)
    process.exit(1)
  }

  console.log(`📦 创建插件: ${pluginName}`)

  fs.mkdirSync(pluginDir, { recursive: true })

  const manifest = {
    id: pluginId,
    name: pluginName,
    version: '1.0.0',
    author: 'Developer',
    description: `${pluginName} 插件`,
    main: 'index.ts',
  }
  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  )

  const indexTs = `import type { Plugin, PluginAPI } from '@vonic/plugin-sdk'

let api: PluginAPI | null = null

const plugin: Plugin = {
  id: '${pluginId}',
  name: '${pluginName}',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('${pluginName} 已激活')

    // 注册命令
    api.commands.register('hello', '打招呼', async () => {
      api?.ui.showMessage('success', 'Hello from ${pluginName}!')
    })

    // 注册面板
    api.panels.register({
      type: 'component',
      title: '${pluginName}',
      componentPath: 'Panel.vue',
    })

    api.ui.showMessage('success', '${pluginName} 已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('${pluginName} 已停用')
    api = null
  },
}

export default plugin
`
  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexTs)

  const panelVue = `<script setup lang="ts">
// ${pluginName} 面板组件
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">${pluginName}</h2>
    <p>这是 ${pluginName} 的面板内容</p>
  </div>
</template>
`
  fs.writeFileSync(path.join(pluginDir, 'Panel.vue'), panelVue)

  const readme = `# ${pluginName}

${manifest.description}

## 功能

- 功能描述 1
- 功能描述 2
- 功能描述 3

## 使用方法

1. 启用插件后，在侧边栏可以看到插件面板
2. 根据需要使用插件提供的功能

## 开发说明

本插件基于 Vonic 插件系统开发：

- \`api.panels.register()\` - 注册面板
- \`api.commands.register()\` - 注册命令
- \`api.ui.showMessage()\` - 显示消息提示

## 文件结构

\`\`\`
${pluginId}/
├── manifest.json   # 插件清单
├── index.ts        # 插件入口
├── Panel.vue       # 面板组件
└── README.md       # 说明文档
\`\`\`

## 版本历史

- **1.0.0** - 初始版本
`
  fs.writeFileSync(path.join(pluginDir, 'README.md'), readme)

  console.log(`✅ 插件创建完成: ${pluginDir}`)
  console.log('')
  console.log('下一步:')
  console.log(`  cd ${pluginId}`)
  console.log('  # 编辑 index.ts 和 Panel.vue')
  console.log('  vonic build . --minify')
}

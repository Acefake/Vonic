/**
 * Codemaps 插件
 * 代码地图管理工具，帮助快速导航和理解代码结构
 */

let api = null
let codemaps = []
let suggestions = []

module.exports = {
  id: 'codemaps-plugin',
  name: 'Codemaps',
  version: '1.0.0',

  async activate(pluginAPI) {
    api = pluginAPI
    api.logger.info('Codemaps 插件已激活')

    // 从存储中读取数据
    codemaps = api.storage.get('codemaps', [])
    suggestions = api.storage.get('suggestions', [
      {
        id: 'suggestion-1',
        title: 'Electron应用构建和发布流程',
        description: 'GitHub Actions工作流配置，多平台打包和发布',
        icon: 'rocket',
      },
      {
        id: 'suggestion-2',
        title: '插件系统架构',
        description: '插件加载、管理和API实现',
        icon: 'api',
      },
    ])

    // ===== 注册命令 =====

    // 创建新的 codemap
    api.commands.register('create', '创建 Codemap', async (startingPoint) => {
      const title = startingPoint || await api.ui.showInput('新建 Codemap', '输入起点描述...')
      if (title) {
        const codemap = {
          id: `codemap-${Date.now()}`,
          title,
          description: '',
          starred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        codemaps.push(codemap)
        api.storage.set('codemaps', codemaps)
        api.ui.showMessage('success', `Codemap "${title}" 已创建`)
        // 通知面板刷新
        api.ipc.send('codemapsUpdated', codemaps)
        return codemap
      }
      return null
    })

    // 切换收藏状态
    api.commands.register('toggleStar', '切换收藏', async (id) => {
      const codemap = codemaps.find(c => c.id === id)
      if (codemap) {
        codemap.starred = !codemap.starred
        codemap.updatedAt = new Date().toISOString()
        api.storage.set('codemaps', codemaps)
        api.ipc.send('codemapsUpdated', codemaps)
        return codemap
      }
      return null
    })

    // 删除 codemap
    api.commands.register('delete', '删除 Codemap', async (id) => {
      const index = codemaps.findIndex(c => c.id === id)
      if (index !== -1) {
        const deleted = codemaps.splice(index, 1)[0]
        api.storage.set('codemaps', codemaps)
        api.ui.showMessage('success', `Codemap "${deleted.title}" 已删除`)
        api.ipc.send('codemapsUpdated', codemaps)
        return true
      }
      return false
    })

    // 刷新建议
    api.commands.register('refreshSuggestions', '刷新建议', async () => {
      api.ipc.send('suggestionsUpdated', suggestions)
      return suggestions
    })

    // 从建议创建 codemap
    api.commands.register('createFromSuggestion', '从建议创建', async (suggestionId) => {
      const suggestion = suggestions.find(s => s.id === suggestionId)
      if (suggestion) {
        const codemap = {
          id: `codemap-${Date.now()}`,
          title: suggestion.title,
          description: suggestion.description,
          starred: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        codemaps.push(codemap)
        api.storage.set('codemaps', codemaps)
        api.ui.showMessage('success', `Codemap "${suggestion.title}" 已创建`)
        api.ipc.send('codemapsUpdated', codemaps)
        return codemap
      }
      return null
    })

    // ===== IPC 接口 =====

    // 获取所有 codemaps
    api.ipc.handle('getCodemaps', () => codemaps)

    // 获取建议列表
    api.ipc.handle('getSuggestions', () => suggestions)

    // 搜索 codemaps
    api.ipc.handle('search', (_, query) => {
      if (!query) return codemaps
      const lowerQuery = query.toLowerCase()
      return codemaps.filter(c =>
        c.title.toLowerCase().includes(lowerQuery) ||
        (c.description && c.description.toLowerCase().includes(lowerQuery))
      )
    })

    // 获取收藏的 codemaps
    api.ipc.handle('getStarred', () => codemaps.filter(c => c.starred))

    // 更新 codemap
    api.ipc.handle('update', (_, id, updates) => {
      const codemap = codemaps.find(c => c.id === id)
      if (codemap) {
        Object.assign(codemap, updates, { updatedAt: new Date().toISOString() })
        api.storage.set('codemaps', codemaps)
        api.ipc.send('codemapsUpdated', codemaps)
        return codemap
      }
      return null
    })

    // ===== 注册自定义面板 =====
    api.panels.register({
      type: 'component',
      title: 'Codemaps',
      componentPath: 'Panel.vue',
    })

    api.logger.info('Codemaps 插件初始化完成')
  },

  async deactivate() {
    api?.logger.info('Codemaps 插件已停用')
    api = null
  },
}

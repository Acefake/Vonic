/**
 * 弹窗助手插件
 * 展示视图、子窗口和主程序通信
 */

let api = null
let notes = []

module.exports = {
  id: 'popup-plugin',
  name: '弹窗助手',
  version: '1.0.0',

  async activate(pluginAPI) {
    api = pluginAPI
    api.logger.info('弹窗助手已激活')

    // 从存储中读取笔记
    notes = api.storage.get('notes', [])

    // ===== 注册视图 =====

    // 页面视图 - 在主窗口内导航
    api.views.register('main', {
      title: '笔记管理',
      type: 'page',
    })

    // 弹窗视图 - 在主窗口内弹出
    api.views.register('detail', {
      title: '笔记详情',
      type: 'modal',
    })

    // 子窗口 1 - 笔记编辑器
    api.views.register('editor', {
      title: '笔记编辑器',
      type: 'window',
      window: {
        width: 1200,
        height: 800,
        resizable: true,
        noLayout: true,
        frames: false,
      },
    })

    // 子窗口 2 - 设置页面
    api.views.register('settings', {
      title: '插件设置',
      type: 'window',
      window: {
        width: 400,
        height: 400,
        resizable: false,
      },
    })

    // ===== 注册命令 =====

    // 添加笔记
    api.commands.register('addNote', '添加笔记', async () => {
      const content = await api.ui.showInput('添加笔记', '请输入笔记内容...')
      if (content) {
        notes.push({
          id: Date.now(),
          content,
          createdAt: new Date().toLocaleString(),
        })
        api.storage.set('notes', notes)
        api.ui.showMessage('success', '笔记已添加！')
      }
    })

    // 查看笔记 - 打开弹窗视图
    api.commands.register('viewNotes', '查看笔记', () => {
      api.views.open('detail', { notes })
    })

    // 打开编辑器窗口
    api.commands.register('openEditor', '打开编辑器', () => {
      api.views.open('editor', { notes })
    })

    // 清空笔记
    api.commands.register('clearNotes', '清空笔记', async () => {
      if (notes.length === 0) {
        api.ui.showMessage('info', '没有笔记需要清空')
        return
      }

      const confirmed = await api.ui.showConfirm('清空笔记', `确定要清空全部 ${notes.length} 条笔记吗？`)
      if (confirmed) {
        notes = []
        api.storage.set('notes', [])
        api.ui.showMessage('success', '笔记已清空')
      }
    })

    // 打开设置窗口
    api.commands.register('openSettings', '打开设置', () => {
      api.views.open('settings')
    })

    // ===== IPC 接口 - 供 Vue 组件调用 =====
    api.ipc.handle('getNotes', () => notes)

    api.ipc.handle('addNote', (_, content) => {
      const note = { id: Date.now(), content, createdAt: new Date().toLocaleString() }
      notes.push(note)
      api.storage.set('notes', notes)
      return note
    })

    api.ipc.handle('deleteNote', (_, id) => {
      notes = notes.filter(n => n.id !== id)
      api.storage.set('notes', notes)
      return { success: true }
    })

    // 设置相关 IPC
    api.ipc.handle('getSettings', () => api.storage.get('settings', {}))
    api.ipc.handle('saveSettings', (_, settings) => {
      api.storage.set('settings', settings)
      return { success: true }
    })

    // 子窗口确认时接收数据，转发到主窗口
    api.ipc.handle('onEditorConfirm', (_, data) => {
      api.logger.info('编辑器确认，数据:', data)
      // 把数据发送到主窗口
      api.ipc.sendToMain('editorResult', data)
      api.ui.showMessage('success', `已保存 ${data.count} 条笔记`)
      return { received: true }
    })

    // ===== 视图渲染 =====
    api.ipc.handle('render', (_, viewId, data) => {
      // 主页面 - 使用 HTML
      if (viewId.endsWith('.main')) {
        return {
          html: `
            <div style="padding: 20px;">
              <h2>📝 笔记管理</h2>
              <p>共有 <strong>${notes.length}</strong> 条笔记</p>
              <ul style="margin-top: 16px; list-style: none; padding: 0;">
                ${notes.map(n => `
                  <li style="padding: 12px; background: #f5f5f5; margin: 8px 0; border-radius: 8px;">
                    <div>${n.content}</div>
                    <small style="color: #999;">${n.createdAt}</small>
                  </li>
                `).join('')}
              </ul>
            </div>
          `,
        }
      }

      // 详情弹窗 - 使用 HTML
      if (viewId.endsWith('.detail')) {
        const noteList = data?.notes || notes
        return {
          html: `
            <div style="max-height: 400px; overflow-y: auto;">
              ${noteList.length === 0
                  ? '<p style="text-align: center; color: #999;">暂无笔记</p>'
                  : noteList.map((n, i) => `
                    <div style="padding: 12px; border-bottom: 1px solid #eee;">
                      <strong>${i + 1}.</strong> ${n.content}
                      <br><small style="color: #999;">${n.createdAt}</small>
                    </div>
                  `).join('')
              }
            </div>
          `,
        }
      }

      // 编辑器子窗口 - 加载 Vue 文件
      if (viewId.endsWith('.editor')) {
        return { vue: 'Editor.vue' }
      }

      // 设置子窗口 - 加载另一个 Vue 文件
      if (viewId.endsWith('.settings')) {
        return { vue: 'Settings.vue' }
      }

      return { html: '<p>未知视图</p>' }
    })

    // ===== 注册自定义面板 =====
    api.panels.register({
      type: 'component',
      title: '笔记管理',
      componentPath: 'Panel.vue',
    })

    api.ui.showMessage('success', '弹窗助手已启动！')
  },

  async deactivate() {
    api?.logger.info('弹窗助手已停用')
    api = null
  },
}

import type { Plugin, PluginAPI } from '@vonic/plugin-electron'

let api: PluginAPI | null = null

// 到日文件接口
interface ToDayFile {
  id: string
  name: string
  date: string // YYYY-MM-DD
  filePath: string
  tags: string[]
  category: string
  status: 'pending' | 'completed' | 'archived'
  createdAt: Date
  updatedAt: Date
}

// 存储结构
interface StorageData {
  files: ToDayFile[]
  tags: string[]
  categories: string[]
}

// 日期工具函数
class DateUtils {
  static getToday(): string {
    return new Date().toISOString().split('T')[0] // YYYY-MM-DD
  }

  static getYesterday(): string {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date.toISOString().split('T')[0]
  }

  static getDateRange(days: number): { start: string; end: string } {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}

// 文件管理器
class ToDayFileManager {
  private storage_key = 'to-day-files'

  // 获取所有文件
  async getAllFiles(): Promise<ToDayFile[]> {
    const storage = api?.storage || null
    if (!storage) return []

    const data = storage.get<StorageData>(this.storage_key, { files: [], tags: [], categories: [] })
    return data.files
  }

  // 创建新文件
  async createFile(fileData: Omit<ToDayFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ToDayFile> {
    const newFile: ToDayFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...fileData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const storage = api?.storage || null
    if (!storage) throw new Error('插件未激活')

    const data = storage.get<StorageData>(this.storage_key, { files: [], tags: [], categories: [] })
    data.files.push(newFile)
    storage.set(this.storage_key, data)

    return newFile
  }

  // 更新文件
  async updateFile(id: string, updates: Partial<ToDayFile>): Promise<ToDayFile | null> {
    const storage = api?.storage || null
    if (!storage) throw new Error('插件未激活')

    const data = storage.get<StorageData>(this.storage_key, { files: [], tags: [], categories: [] })
    const index = data.files.findIndex((file) => file.id === id)
    if (index === -1) return null

    data.files[index] = {
      ...data.files[index],
      ...updates,
      updatedAt: new Date()
    }
    storage.set(this.storage_key, data)

    return data.files[index]
  }

  // 删除文件
  async deleteFile(id: string): Promise<boolean> {
    const storage = api?.storage || null
    if (!storage) throw new Error('插件未激活')

    const data = storage.get<StorageData>(this.storage_key, { files: [], tags: [], categories: [] })
    const newFiles = data.files.filter((file) => file.id !== id)

    if (newFiles.length === data.files.length) return false

    storage.set(this.storage_key, {
      ...data,
      files: newFiles
    })
    return true
  }

  // 获取今日文件
  async getTodayFiles(): Promise<ToDayFile[]> {
    const allFiles = await this.getAllFiles()
    const today = DateUtils.getToday()
    return allFiles.filter((file) => file.date === today)
  }

  // 获取统计信息
  async getStatistics(): Promise<{
    total: number
    todayCount: number
    pendingCount: number
    completedCount: number
    byCategory: Record<string, number>
  }> {
    const allFiles = await this.getAllFiles()
    const todayFiles = await this.getTodayFiles()

    const byCategory: Record<string, number> = {}
    allFiles.forEach((file) => {
      byCategory[file.category] = (byCategory[file.category] || 0) + 1
    })

    return {
      total: allFiles.length,
      todayCount: todayFiles.length,
      pendingCount: allFiles.filter((f) => f.status === 'pending').length,
      completedCount: allFiles.filter((f) => f.status === 'completed').length,
      byCategory
    }
  }
}

const fileManager = new ToDayFileManager()

const plugin: Plugin = {
  id: 'to-day-file',
  name: '到日文件',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('到日文件插件已激活')

    // ===== 注册面板 =====
    api.panels.register({
      type: 'component',
      title: '到日文件',
      componentPath: 'Panel.vue'
    })

    // ===== 注册命令 =====
    api.commands.register('create-new-file', '创建新文件', async () => {
      const file = await fileManager.createFile({
        name: '未命名文件',
        date: DateUtils.getToday(),
        filePath: '',
        tags: [],
        category: '默认',
        status: 'pending'
      })
      api?.ui.showMessage('success', `新建文件: ${file.name}`)
      return file
    })

    api.commands.register('show-today-files', '查看今日文件', async () => {
      const files = await fileManager.getTodayFiles()
      api?.ui.showMessage('info', `今日有 ${files.length} 个文件需要处理`)
      return files
    })

    api.commands.register('export-files', '导出到日文件', async () => {
      try {
        const files = await fileManager.getAllFiles()
        const content = JSON.stringify(files, null, 2)
        const result = await api?.file.selectFile({
          properties: ['createDirectory', 'showOverwriteConfirmation'],
          title: '选择保存位置',
          defaultPath: `to-day-files-backup-${DateUtils.getToday()}.json`
        })

        if (result && result.length > 0) {
          await api?.file.saveFile({
            path: result[0],
            content
          })
          api?.ui.showMessage('success', '文件导出成功')
        }
      } catch (error) {
        api?.logger.error('导出文件失败', error)
        api?.ui.showMessage('error', '导出文件失败: ' + (error as Error).message)
      }
    })

    // ===== 注册 IPC 接口 =====

    // 获取所有文件
    api.ipc.handle('getAllFiles', async () => {
      return await fileManager.getAllFiles()
    })

    // 获取今日文件
    api.ipc.handle('getTodayFiles', async () => {
      return await fileManager.getTodayFiles()
    })

    // 创建文件
    api.ipc.handle('createFile', async (_, fileData: Partial<ToDayFile>) => {
      const file = await fileManager.createFile({
        name: fileData.name || '未命名文件',
        date: fileData.date || DateUtils.getToday(),
        filePath: fileData.filePath || '',
        tags: fileData.tags || [],
        category: fileData.category || '默认',
        status: 'pending'
      })
      return file
    })

    // 更新文件
    api.ipc.handle('updateFile', async (_, id: string, updates: Partial<ToDayFile>) => {
      return await fileManager.updateFile(id, updates)
    })

    // 删除文件
    api.ipc.handle('deleteFile', async (_, id: string) => {
      return await fileManager.deleteFile(id)
    })

    // 获取统计
    api.ipc.handle('getStatistics', async () => {
      return await fileManager.getStatistics()
    })

    // 导入文件
    api.ipc.handle('importFiles', async () => {
      try {
        const result = await api?.file.selectFile({
          properties: ['openFile'],
          filters: [{ name: 'JSON 文件', extensions: ['json'] }]
        })

        if (result && result.length > 0) {
          const content = await api?.file.readFile(result[0])
          const files = JSON.parse(content || '[]') as ToDayFile[]

          // 验证数据
          if (!Array.isArray(files)) {
            throw new Error('无效的数据格式')
          }

          // 保存到存储
          const storage = api?.storage
          storage?.set('to-day-files', {
            files,
            tags: [...new Set(files.flatMap((f) => f.tags))],
            categories: [...new Set(files.map((f) => f.category))]
          })

          api?.logger.info(`成功导入 ${files.length} 个文件`)
          return { success: true, count: files.length }
        }
      } catch (error) {
        api?.logger.error('导入文件失败', error)
        throw error
      }
    })

    api.ui.showMessage('success', '到日文件系统已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('到日文件插件已停用')
    api = null
  }
}

export default plugin

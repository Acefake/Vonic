/**
 * 文件管理插件
 */

import type { Plugin, PluginAPI } from '@vonic/plugin-electron'

// 扩展 PluginAPI 以包含 file 属性
interface ExtendedPluginAPI extends PluginAPI {
  file?: {
    selectFile?: (options?: any) => Promise<string[] | null>
    saveFile?: (options?: any) => Promise<string | null>
    writeFile?: (path: string, content: string) => Promise<void>
  }
}

let api: ExtendedPluginAPI | null = null

// 支持的文件格式
const SUPPORTED_FORMATS = {
  images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'],
  documents: ['pdf', 'docx', 'txt', 'md', 'json', 'xml', 'csv', 'xlsx', 'pptx'],
  // 可以扩展
}

// 文件项接口
interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: 'image' | 'document' | 'other'
  importedAt: Date
}

// 文件管理器
class FileManager {
  private storageKey = 'file-manager-files'

  async getAllFiles(): Promise<FileItem[]> {
    const storage = api?.storage
    if (!storage)
      return []
    const data = storage.get<{ files: FileItem[] }>(this.storageKey, { files: [] })
    return data.files
  }

  async addFile(filePath: string, name?: string): Promise<FileItem> {
    const files = await this.getAllFiles()
    const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const fileType = this.getFileType(filePath)
    const newFile: FileItem = {
      id,
      name: name || this.extractFileName(filePath),
      path: filePath,
      size: 0, // 实际大小需要读取文件系统，这里简化
      type: fileType,
      importedAt: new Date(),
    }
    files.push(newFile)
    api?.storage.set(this.storageKey, { files })
    return newFile
  }

  async removeFile(id: string): Promise<boolean> {
    const files = await this.getAllFiles()
    const newFiles = files.filter(f => f.id !== id)
    if (newFiles.length === files.length)
      return false
    api?.storage.set(this.storageKey, { files: newFiles })
    return true
  }

  async clearFiles(): Promise<void> {
    api?.storage.set(this.storageKey, { files: [] })
  }

  private getFileType(filePath: string): 'image' | 'document' | 'other' {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    if (SUPPORTED_FORMATS.images.includes(ext))
      return 'image'
    if (SUPPORTED_FORMATS.documents.includes(ext))
      return 'document'
    return 'other'
  }

  private extractFileName(filePath: string): string {
    return filePath.split(/[\\/]/).pop() || filePath
  }
}

const fileManager = new FileManager()

const plugin: Plugin = {
  id: 'file-manager',
  name: '文件管理',
  version: '1.0.0',

  async activate(pluginAPI: PluginAPI): Promise<void> {
    api = pluginAPI
    api.logger.info('文件管理插件已激活')

    // 注册面板
    api.panels.register({
      type: 'component',
      title: '文件管理',
      componentPath: 'Panel.vue',
    })

    // 注册命令：导入文件
    api.commands.register('import-files', '导入文件', async () => {
      try {
        const result = await api?.file?.selectFile?.({
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: '所有支持的文件', extensions: [...SUPPORTED_FORMATS.images, ...SUPPORTED_FORMATS.documents] },
            { name: '图片文件', extensions: SUPPORTED_FORMATS.images },
            { name: '文档文件', extensions: SUPPORTED_FORMATS.documents },
          ],
        })
        if (result && result.length > 0) {
          for (const filePath of result) {
            await fileManager.addFile(filePath)
          }
          api?.ui.showMessage('success', `成功导入 ${result.length} 个文件`)
        }
      }
      catch (error) {
        api?.logger.error('导入文件失败', error)
        api?.ui.showMessage('error', `导入文件失败: ${(error as Error).message}`)
      }
    })

    // 注册命令：导出文件
    api.commands.register('export-files', '导出文件', async () => {
      try {
        const files = await fileManager.getAllFiles()
        if (files.length === 0) {
          api?.ui.showMessage('info', '没有可导出的文件')
          return
        }
        const content = JSON.stringify(files, null, 2)
        const result = await api?.file?.saveFile?.({
          defaultPath: `file-manager-backup-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: 'JSON 文件', extensions: ['json'] }],
        })
        if (result) {
          await api?.file?.writeFile?.(result, content)
          api?.ui.showMessage('success', '文件导出成功')
        }
      }
      catch (error) {
        api?.logger.error('导出文件失败', error)
        api?.ui.showMessage('error', `导出文件失败: ${(error as Error).message}`)
      }
    })

    // IPC 接口
    api.ipc.handle('getAllFiles', async () => {
      return await fileManager.getAllFiles()
    })

    api.ipc.handle('addFile', async (...args: unknown[]) => {
      const filePath = args[0] as string
      return await fileManager.addFile(filePath)
    })

    api.ipc.handle('removeFile', async (...args: unknown[]) => {
      const id = args[0] as string
      return await fileManager.removeFile(id)
    })

    api.ipc.handle('clearFiles', async () => {
      await fileManager.clearFiles()
      return true
    })

    api.ipc.handle('getSupportedFormats', () => {
      return SUPPORTED_FORMATS
    })

    // 为命令注册 IPC 处理程序
    api.ipc.handle('import-files', async () => {
      try {
        const result = await api?.file?.selectFile?.({
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: '所有支持的文件', extensions: [...SUPPORTED_FORMATS.images, ...SUPPORTED_FORMATS.documents] },
            { name: '图片文件', extensions: SUPPORTED_FORMATS.images },
            { name: '文档文件', extensions: SUPPORTED_FORMATS.documents },
          ],
        })
        if (result && result.length > 0) {
          for (const filePath of result) {
            await fileManager.addFile(filePath)
          }
          api?.ui.showMessage('success', `成功导入 ${result.length} 个文件`)
          return { success: true, count: result.length }
        }
        return { success: false, count: 0 }
      }
      catch (error) {
        api?.logger.error('导入文件失败', error)
        api?.ui.showMessage('error', `导入文件失败: ${(error as Error).message}`)
        throw error
      }
    })

    api.ipc.handle('export-files', async () => {
      try {
        const files = await fileManager.getAllFiles()
        if (files.length === 0) {
          api?.ui.showMessage('info', '没有可导出的文件')
          return { success: false, message: '没有可导出的文件' }
        }
        const content = JSON.stringify(files, null, 2)
        const result = await api?.file?.saveFile?.({
          defaultPath: `file-manager-backup-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: 'JSON 文件', extensions: ['json'] }],
        })
        if (result) {
          await api?.file?.writeFile?.(result, content)
          api?.ui.showMessage('success', '文件导出成功')
          return { success: true, path: result }
        }
        return { success: false, message: '用户取消' }
      }
      catch (error) {
        api?.logger.error('导出文件失败', error)
        api?.ui.showMessage('error', `导出文件失败: ${(error as Error).message}`)
        throw error
      }
    })

    api.ui.showMessage('success', '文件管理插件已启动！')
  },

  async deactivate(): Promise<void> {
    api?.logger.info('文件管理插件已停用')
    api = null
  },
}

export default plugin

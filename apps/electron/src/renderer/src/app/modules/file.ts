/**
 * 文件操作 API
 * 通过 IPC 与主进程通信进行文件操作
 * Web 环境下使用浏览器原生 API
 */

import type { FileAPI, SaveFileOptions, SelectFileOptions } from '../types'
import { getIPCRenderer, isElectron } from '../platform'

const ipc = getIPCRenderer()

// Web 端文件存储（模拟文件系统）
const webFileStorage = new Map<string, string>()

/**
 * Web 端选择文件（使用 input[type=file]）
 */
function webSelectFile(options?: SelectFileOptions): Promise<string[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = options?.multiple ?? false
    if (options?.filters?.length) {
      const exts = options.filters.flatMap(f => f.extensions || [])
      input.accept = exts.map(ext => `.${ext}`).join(',')
    }
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const files = Array.from(input.files)
        const paths = files.map((file) => {
          const path = `web:///${file.name}`
          const reader = new FileReader()
          reader.onload = () => {
            webFileStorage.set(path, reader.result as string)
          }
          reader.readAsText(file)
          return path
        })
        resolve(paths)
      }
      else {
        resolve(null)
      }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * Web 端保存文件（使用下载）
 */
function webSaveFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 文件操作 API 实现
 */
export const fileAPI: FileAPI = {
  /**
   * 选择文件
   * @param options 选择选项
   * @returns 选中的文件路径数组，取消返回 null
   */
  async selectFile(options?: SelectFileOptions): Promise<string[] | null> {
    if (!isElectron) {
      return webSelectFile(options)
    }
    return ipc.invoke('dialog:select-file', options) as Promise<string[] | null>
  },

  /**
   * 选择文件夹
   * @returns 选中的文件夹路径，取消返回 null
   */
  async selectFolder(): Promise<string | null> {
    if (!isElectron) {
      console.warn('[Web] selectFolder not supported, use selectFile instead')
      return null
    }
    return ipc.invoke('dialog:select-folder') as Promise<string | null>
  },

  /**
   * 保存文件对话框
   * @param options 保存选项
   * @returns 选择的保存路径，取消返回 null
   */
  async saveFile(options?: SaveFileOptions): Promise<string | null> {
    if (!isElectron) {
      const filename = options?.defaultPath || 'download.txt'
      return `web:///${filename}`
    }
    return ipc.invoke('dialog:save-file', options) as Promise<string | null>
  },

  /**
   * 读取文件内容
   * @param filePath 文件路径
   * @param encoding 编码格式，默认 utf-8，null 表示读取二进制
   * @returns 文件内容
   */
  async readFile(filePath: string, encoding: BufferEncoding | null = 'utf-8'): Promise<string> {
    if (!isElectron) {
      const content = webFileStorage.get(filePath)
      if (content) return content
      console.warn(`[Web] File not found: ${filePath}`)
      return ''
    }
    return ipc.invoke('file:read', filePath, encoding) as Promise<string>
  },

  /**
   * 读取二进制文件内容
   * @param filePath 文件路径
   * @returns Base64 编码的文件内容
   */
  async readFileBinary(filePath: string): Promise<string> {
    return ipc.invoke('file:read', filePath, null) as Promise<string>
  },

  /**
   * 写入文件内容
   * @param filePath 文件路径
   * @param content 文件内容
   * @param encoding 编码格式，默认 utf-8
   */
  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    if (!isElectron) {
      if (filePath.startsWith('web:///')) {
        const filename = filePath.replace('web:///', '')
        webSaveFile(content, filename)
      }
      webFileStorage.set(filePath, content)
      return
    }
    await ipc.invoke('file:write', filePath, content, encoding)
  },

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    return ipc.invoke('file:exists', filePath) as Promise<boolean>
  },

  /**
   * 删除文件
   * @param filePath 文件路径
   */
  async delete(filePath: string): Promise<void> {
    await ipc.invoke('file:delete', filePath)
  },

  /**
   * 打开外部链接
   * @param url 链接地址
   */
  async openExternal(url: string): Promise<void> {
    await ipc.invoke('shell:open-external', url)
  },

  /**
   * 在文件管理器中显示文件
   * @param path 文件或文件夹路径
   */
  async showInFolder(path: string): Promise<void> {
    await ipc.invoke('shell:show-in-folder', path)
  },

  /**
   * 获取工作目录
   * @returns 工作目录路径
   */
  async getWorkDir(): Promise<string> {
    return ipc.invoke('file:get-work-dir') as Promise<string>
  },

  /**
   * 创建唯一的输出目录（out_XXXXXX 格式，6位数字）
   * @param baseDir 基础目录路径
   * @returns 创建的目录路径
   */
  async createOutputDir(baseDir: string): Promise<string> {
    return ipc.invoke('file:create-output-dir', baseDir) as Promise<string>
  },

  /**
   * 删除目录（递归删除）
   * @param dirPath 目录路径
   */
  async deleteDir(dirPath: string): Promise<void> {
    await ipc.invoke('file:delete-dir', dirPath)
  },

  /**
   * 复制文件
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    await ipc.invoke('file:copy-file', sourcePath, targetPath)
  },
}

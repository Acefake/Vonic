/**
 * 文件操作 API
 * 通过 IPC 与主进程通信进行文件操作
 */

import type { FileAPI, SaveFileOptions, SelectFileOptions } from '../types'

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
    return window.electron.ipcRenderer.invoke('dialog:select-file', options)
  },

  /**
   * 选择文件夹
   * @returns 选中的文件夹路径，取消返回 null
   */
  async selectFolder(): Promise<string | null> {
    return window.electron.ipcRenderer.invoke('dialog:select-folder')
  },

  /**
   * 保存文件对话框
   * @param options 保存选项
   * @returns 选择的保存路径，取消返回 null
   */
  async saveFile(options?: SaveFileOptions): Promise<string | null> {
    return window.electron.ipcRenderer.invoke('dialog:save-file', options)
  },

  /**
   * 读取文件内容
   * @param filePath 文件路径
   * @param encoding 编码格式，默认 utf-8，null 表示读取二进制
   * @returns 文件内容
   */
  async readFile(filePath: string, encoding: BufferEncoding | null = 'utf-8'): Promise<string> {
    return window.electron.ipcRenderer.invoke('file:read', filePath, encoding)
  },

  /**
   * 读取二进制文件内容
   * @param filePath 文件路径
   * @returns Base64 编码的文件内容
   */
  async readFileBinary(filePath: string): Promise<string> {
    return window.electron.ipcRenderer.invoke('file:read', filePath, null)
  },

  /**
   * 写入文件内容
   * @param filePath 文件路径
   * @param content 文件内容
   * @param encoding 编码格式，默认 utf-8
   */
  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    await window.electron.ipcRenderer.invoke('file:write', filePath, content, encoding)
  },

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    return window.electron.ipcRenderer.invoke('file:exists', filePath)
  },

  /**
   * 删除文件
   * @param filePath 文件路径
   */
  async delete(filePath: string): Promise<void> {
    await window.electron.ipcRenderer.invoke('file:delete', filePath)
  },

  /**
   * 打开外部链接
   * @param url 链接地址
   */
  async openExternal(url: string): Promise<void> {
    await window.electron.ipcRenderer.invoke('shell:open-external', url)
  },

  /**
   * 在文件管理器中显示文件
   * @param path 文件或文件夹路径
   */
  async showInFolder(path: string): Promise<void> {
    await window.electron.ipcRenderer.invoke('shell:show-in-folder', path)
  },
}

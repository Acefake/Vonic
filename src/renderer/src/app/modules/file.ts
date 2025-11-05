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

  /**
   * 读取 dat 文件内容
   * @param filePath dat 文件路径
   * @returns 文件内容（文本）
   */
  async readDatFile(filePath: string, customDir?: string): Promise<string> {
    return window.electron.ipcRenderer.invoke('file:read-dat', filePath, customDir)
  },

  /**
   * 写入 dat 文件内容
   * @param filePath dat 文件路径
   * @param content 文件内容（文本）
   */
  async writeDatFile(arg1: string | Record<string, unknown>, arg2?: Record<string, unknown>, arg3?: string): Promise<{ code: number, message: string, filePath: string }> {
    // 兼容三种调用方式：
    // 1) writeDatFile(designData)
    // 2) writeDatFile(filePath, designData)
    // 3) writeDatFile(filePath, designData, customDir)
    return window.electron.ipcRenderer.invoke('file:write-dat', arg1, arg2, arg3)
  },

  /**
   * 读取多个方案数据
   * 扫描文件夹中所有包含 Sep_power.dat 的文件，并解析对应的数据
   * @returns 方案数据数组
   */
  async readMultiSchemes(): Promise<Array<{
    index: number
    fileName: string
    angularVelocity: number
    feedFlowRate: number
    feedAxialDisturbance: number
    sepPower: number | null
    sepFactor: number | null
  }>> {
    return window.electron.ipcRenderer.invoke('file:read-multi-schemes')
  },

  /**
   * 获取工作目录
   * @returns 工作目录路径
   */
  async getWorkDir(): Promise<string> {
    return window.electron.ipcRenderer.invoke('file:get-work-dir')
  },

  /**
   * 创建唯一的输出目录（out_XXXXXX 格式，6位数字）
   * @param baseDir 基础目录路径
   * @returns 创建的目录路径
   */
  async createOutputDir(baseDir: string): Promise<string> {
    return window.electron.ipcRenderer.invoke('file:create-output-dir', baseDir)
  },

  /**
   * 删除目录（递归删除）
   * @param dirPath 目录路径
   */
  async deleteDir(dirPath: string): Promise<void> {
    await window.electron.ipcRenderer.invoke('file:delete-dir', dirPath)
  },
}

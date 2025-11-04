import { access, readFile as fsReadFile, unlink, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { ipcMain } from 'electron'
import { readFileData } from '@/main/utils/readFileData'
import { writeDatFile } from '@/main/utils/writeDatFile'
import { ALLOWED_DELETE_EXTENSIONS, ALLOWED_READ_EXTENSIONS, ALLOWED_WRITE_EXTENSIONS } from '@/shared/files-config'

/**
 * 文件管理器类
 */
export class FileManager {
  /**
   * 注册 IPC 处理器
   */
  registerHandlers(): void {
    ipcMain.handle('file:read', this.readFile.bind(this))
    ipcMain.handle('file:write', this.writeFile.bind(this))
    ipcMain.handle('file:exists', this.fileExists.bind(this))
    ipcMain.handle('file:delete', this.deleteFile.bind(this))
    ipcMain.handle('file:read-dat', this.readFileDataIpc.bind(this))
    ipcMain.handle('file:write-dat', this.writeDatFileIpc.bind(this))
  }

  /**
   * 验证文件扩展名是否在白名单中
   * @param filePath 文件路径
   * @param allowedExtensions 允许的扩展名列表
   * @returns 是否允许操作
   */
  private isFileTypeAllowed(filePath: string, allowedExtensions: string[]): boolean {
    const ext = extname(filePath).toLowerCase()
    return allowedExtensions.includes(ext)
  }

  /**
   * 读取文件
   * @param _ IPC 事件对象
   * @param filePath 文件路径
   * @param encoding 编码格式，如果为 null 则返回 Base64 编码的二进制数据
   * @returns 文件内容（文本或 Base64 编码的字符串）
   */
  private async readFile(_: Electron.IpcMainInvokeEvent, filePath: string, encoding: BufferEncoding | null = 'utf-8'): Promise<string> {
    try {
      // 验证文件类型
      if (!this.isFileTypeAllowed(filePath, ALLOWED_READ_EXTENSIONS)) {
        const ext = extname(filePath)
        throw new Error(`不允许读取该类型的文件: ${ext || '(无扩展名)'}。允许的文件类型: ${ALLOWED_READ_EXTENSIONS.join(', ')}`)
      }

      if (encoding === null) {
        // 读取二进制文件，返回 Base64 编码
        const buffer = await fsReadFile(filePath)
        return buffer.toString('base64')
      }
      else {
        // 读取文本文件
        const content = await fsReadFile(filePath, encoding)
        return content
      }
    }
    catch (error) {
      console.error('读取文件失败:', error)
      throw new Error(`读取文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 写入文件
   * @param _ IPC 事件对象
   * @param filePath 文件路径
   * @param content 文件内容
   * @param encoding 编码格式
   */
  private async writeFile(_: Electron.IpcMainInvokeEvent, filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    try {
      // 验证文件类型
      if (!this.isFileTypeAllowed(filePath, ALLOWED_WRITE_EXTENSIONS)) {
        const ext = extname(filePath)
        throw new Error(`不允许写入该类型的文件: ${ext || '(无扩展名)'}。允许的文件类型: ${ALLOWED_WRITE_EXTENSIONS.join(', ')}`)
      }

      await writeFile(filePath, content, encoding)
    }
    catch (error) {
      console.error('写入文件失败:', error)
      throw new Error(`写入文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 检查文件是否存在
   * @param _ IPC 事件对象
   * @param filePath 文件路径
   * @returns 文件是否存在
   */
  private async fileExists(_: Electron.IpcMainInvokeEvent, filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 删除文件
   * @param _ IPC 事件对象
   * @param filePath 文件路径
   */
  private async deleteFile(_: Electron.IpcMainInvokeEvent, filePath: string): Promise<void> {
    try {
      // 验证文件类型
      if (!this.isFileTypeAllowed(filePath, ALLOWED_DELETE_EXTENSIONS)) {
        const ext = extname(filePath)
        throw new Error(`不允许删除该类型的文件: ${ext || '(无扩展名)'}。允许的文件类型: ${ALLOWED_DELETE_EXTENSIONS.join(', ')}`)
      }

      await unlink(filePath)
    }
    catch (error) {
      console.error('删除文件失败:', error)
      throw new Error(`删除文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 读取文件数据
   * @param filePath 文件路径
   * @returns 文件内容（文本）
   */
  private async readFileDataIpc(_: Electron.IpcMainInvokeEvent, filePath: string): Promise<string> {
    const content = await readFileData(filePath)
    return content
  }

  /**
   * 生成 dat 文件内容
   * @param designData 设计数据
   * @returns 操作结果
   */

  private async writeDatFileIpc(_: Electron.IpcMainInvokeEvent, arg1: any, arg2?: any): Promise<{ code: number, message: string, filePath: string }> {
    // 兼容两种调用方式：
    // 1) invoke('file:write-dat', designData)
    // 2) invoke('file:write-dat', fileName, designData)
    const designData = (arg2 !== undefined) ? arg2 : arg1
    return await writeDatFile(designData)
  }
}

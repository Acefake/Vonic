import { Buffer } from 'node:buffer'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs'
import { access, copyFile as fsCopyFile, readFile as fsReadFile, rm, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { ipcMain } from 'electron'
import { ALLOWED_DELETE_EXTENSIONS, ALLOWED_READ_EXTENSIONS, ALLOWED_WRITE_EXTENSIONS } from '@/shared/files-config'

/**
 * 文件管理器类
 * 提供基础的文件操作功能
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
    ipcMain.handle('file:delete-dir', this.deleteDir.bind(this))
    ipcMain.handle('file:copy-file', this.copyFile.bind(this))
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
        // 使用流式读取二进制文件，提高大文件处理效率
        return await this.readFileAsStream(filePath)
      }
      else {
        // 读取文本文件
        const content = await fsReadFile(filePath, encoding)
        return content.toString()
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

      // 确保目录存在
      const dir = dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
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
   * 使用流式读取文件并转换为 Base64
   * @param filePath 文件路径
   * @returns Base64 编码的文件内容
   */
  private async readFileAsStream(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      // 使用流式读取，64KB 块大小，提高大文件处理效率
      const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 })

      stream.on('data', (chunk: string | Buffer) => {
        // 确保是 Buffer 类型
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk)
        }
        else {
          chunks.push(Buffer.from(chunk, 'binary'))
        }
      })

      stream.on('end', () => {
        try {
          // 合并所有块并转换为 Base64
          const buffer = Buffer.concat(chunks)
          resolve(buffer.toString('base64'))
        }
        catch (error) {
          reject(error)
        }
      })

      stream.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * 删除目录（递归删除）
   * @param _ IPC 事件对象
   * @param dirPath 目录路径
   */
  private async deleteDir(_: Electron.IpcMainInvokeEvent, dirPath: string): Promise<void> {
    try {
      // 安全检查：不允许删除根目录或系统目录
      const normalizedPath = dirPath.replace(/\\/g, '/').toLowerCase()
      const dangerousPaths = ['c:/', 'd:/', 'e:/', '/', '/system', '/windows']

      if (dangerousPaths.some(p => normalizedPath === p || normalizedPath.startsWith(`${p}/`))) {
        throw new Error('不允许删除系统目录或根目录')
      }

      await rm(dirPath, { recursive: true, force: true })
    }
    catch (error) {
      console.error('删除目录失败:', error)
      throw new Error(`删除目录失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 复制文件
   * @param _ IPC 事件对象
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   */
  private async copyFile(_: Electron.IpcMainInvokeEvent, sourcePath: string, targetPath: string): Promise<void> {
    try {
      // 验证源文件类型
      if (!this.isFileTypeAllowed(sourcePath, [...ALLOWED_READ_EXTENSIONS, ...ALLOWED_WRITE_EXTENSIONS])) {
        const ext = extname(sourcePath)
        throw new Error(`不允许复制该类型的文件: ${ext || '(无扩展名)'}`)
      }

      // 确保目标目录存在
      const targetDir = dirname(targetPath)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      await fsCopyFile(sourcePath, targetPath)
    }
    catch (error) {
      console.error('复制文件失败:', error)
      throw new Error(`复制文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

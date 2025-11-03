import type { Buffer } from 'node:buffer'
import type { DesignScheme, FeedingMethod } from '../../shared/design-scheme'

import { access, readFile as fsReadFile, unlink, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { Parser } from 'binary-parser'
import { ipcMain } from 'electron'
import iconv from 'iconv-lite'

import JSON5 from 'json5'
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
    ipcMain.handle('file:parse-task-data', this.parseTaskData.bind(this))
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
   * 检测文件是否为二进制格式
   * @param buffer 文件 Buffer
   * @returns 是否为二进制文件
   */
  private isBinaryFile(buffer: Buffer): boolean {
    // 检查前 512 字节中的可打印字符比例
    const sampleSize = Math.min(512, buffer.length)
    let printableCount = 0

    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i]
      // 可打印 ASCII 字符或常见的 Unicode 控制字符（如换行、回车、制表符）
      if ((byte >= 0x20 && byte <= 0x7E) || byte === 0x09 || byte === 0x0A || byte === 0x0D) {
        printableCount++
      }
    }

    // 如果可打印字符比例低于 80%，可能是二进制文件
    return printableCount / sampleSize < 0.8
  }

  /**
   * 检测文件编码
   * @param buffer 文件 Buffer
   * @returns 编码格式
   */
  private detectEncoding(buffer: Buffer): string {
    // 检查 BOM
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8'
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf16le'
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf16be'
    }

    // 尝试使用 iconv-lite 检测编码
    // 默认尝试 utf-8，如果失败再尝试 gbk
    try {
      const utf8Text = iconv.decode(buffer, 'utf8')
      // 简单检查是否包含无效字符
      if (utf8Text.includes('\uFFFD')) {
        // 包含替换字符，可能不是 UTF-8
        return 'gbk'
      }
      return 'utf8'
    }
    catch {
      return 'gbk'
    }
  }

  /**
   * 清理文件内容（去除 BOM 等）
   * @param content 文件内容
   * @returns 清理后的内容
   */
  private cleanContent(content: string): string {
    // 去除 BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      return content.slice(1)
    }
    return content.trim()
  }

  /**
   * 检查内容是否为 JSON/JSON5 格式
   * @param content 文件内容
   * @returns 是否为 JSON/JSON5 格式
   */
  private isJsonLike(content: string): boolean {
    const trimmed = content.trim()
    // JSON 通常以 { 或 [ 开头
    return trimmed.startsWith('{') || trimmed.startsWith('[')
  }

  /**
   * 构建完整的设计方案对象
   * @param data 部分设计方案数据
   * @returns 完整的设计方案对象
   */
  private buildDesignScheme(data: Partial<DesignScheme>): DesignScheme {
    return {
      isMultiScheme: data.isMultiScheme ?? true,
      topLevelParams: {
        angularVelocity: data.topLevelParams?.angularVelocity,
        rotorRadius: data.topLevelParams?.rotorRadius,
        rotorShoulderLength: data.topLevelParams?.rotorShoulderLength,
      },
      operatingParams: {
        rotorSidewallPressure: data.operatingParams?.rotorSidewallPressure,
        gasDiffusionCoefficient: data.operatingParams?.gasDiffusionCoefficient,
        feedFlowRate: data.operatingParams?.feedFlowRate,
        feedingMethod: data.operatingParams?.feedingMethod ?? '点供料',
        splitRatio: data.operatingParams?.splitRatio,
      },
      drivingParams: {
        depletedEndCapTemperature: data.drivingParams?.depletedEndCapTemperature,
        enrichedEndCapTemperature: data.drivingParams?.enrichedEndCapTemperature,
        feedAxialDisturbance: data.drivingParams?.feedAxialDisturbance,
        feedAngularDisturbance: data.drivingParams?.feedAngularDisturbance,
        depletedMechanicalDriveAmount: data.drivingParams?.depletedMechanicalDriveAmount,
      },
      separationComponents: {
        extractionChamberHeight: data.separationComponents?.extractionChamberHeight,
        enrichedBaffleHoleDiameter: data.separationComponents?.enrichedBaffleHoleDiameter,
        feedBoxShockDiskHeight: data.separationComponents?.feedBoxShockDiskHeight,
        depletedExtractionArmRadius: data.separationComponents?.depletedExtractionArmRadius,
        depletedExtractionPortInnerDiameter: data.separationComponents?.depletedExtractionPortInnerDiameter,
        depletedBaffleInnerHoleOuterDiameter: data.separationComponents?.depletedBaffleInnerHoleOuterDiameter,
        enrichedBaffleHoleDistributionCircleDiameter: data.separationComponents?.enrichedBaffleHoleDistributionCircleDiameter,
        depletedExtractionPortOuterDiameter: data.separationComponents?.depletedExtractionPortOuterDiameter,
        depletedBaffleOuterHoleInnerDiameter: data.separationComponents?.depletedBaffleOuterHoleInnerDiameter,
        minAxialDistance: data.separationComponents?.minAxialDistance,
        depletedBaffleAxialPosition: data.separationComponents?.depletedBaffleAxialPosition,
        depletedBaffleOuterHoleOuterDiameter: data.separationComponents?.depletedBaffleOuterHoleOuterDiameter,
      },
      outputResults: {
        separationPower: data.outputResults?.separationPower,
        separationFactor: data.outputResults?.separationFactor,
      },
    }
  }

  /**
   * 解析文本格式的文件内容（支持 JSON 和 JSON5）
   * @param content 文件内容（已解码的文本）
   * @returns 解析后的设计方案对象
   */
  private parseTextContent(content: string): DesignScheme {
    const cleanedContent = this.cleanContent(content)

    // 检查内容是否为空
    if (!cleanedContent) {
      throw new Error('文件内容为空')
    }

    // 检查是否为 JSON/JSON5 格式
    if (!this.isJsonLike(cleanedContent)) {
      throw new Error('文件内容不是 JSON/JSON5 格式。DAT/TXT 文件应包含 JSON 或 JSON5 格式的数据。如果是其他格式，请转换为 JSON 格式或使用 .json 扩展名')
    }

    // 先尝试标准 JSON 解析
    try {
      const data = JSON.parse(cleanedContent) as Partial<DesignScheme>
      return this.buildDesignScheme(data)
    }
    catch {
      // 如果标准 JSON 解析失败，尝试 JSON5
      try {
        const data = JSON5.parse(cleanedContent) as Partial<DesignScheme>
        return this.buildDesignScheme(data)
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`JSON/JSON5 解析失败: ${errorMessage}。请确保文件内容是有效的 JSON 或 JSON5 格式`)
      }
    }
  }

  /**
   * 创建二进制 DAT 文件解析器
   * 注意：这里是一个示例结构，需要根据实际的 DAT 文件二进制格式进行调整
   * @returns Parser 实例
   */
  private createDatBinaryParser(): Parser {
    // 这是一个示例 Parser 结构，需要根据实际的 DAT 文件格式进行调整
    // 假设格式：所有数值都是 double（8字节），字符串以 null 结尾
    // 实际使用时需要根据文件格式规范修改

    return new Parser()
      .uint8('isMultiScheme') // 布尔值：0 或 1
      .doublebe('angularVelocity') // 大端序 double
      .doublebe('rotorRadius')
      .doublebe('rotorShoulderLength')
      .doublebe('rotorSidewallPressure')
      .doublebe('gasDiffusionCoefficient')
      .doublebe('feedFlowRate')
      .uint8('feedingMethod') // 0=点供料, 1=线供料, 2=面供料
      .doublebe('splitRatio')
      .doublebe('depletedEndCapTemperature')
      .doublebe('enrichedEndCapTemperature')
      .doublebe('feedAxialDisturbance')
      .doublebe('feedAngularDisturbance')
      .doublebe('depletedMechanicalDriveAmount')
      .doublebe('extractionChamberHeight')
      .doublebe('enrichedBaffleHoleDiameter')
      .doublebe('feedBoxShockDiskHeight')
      .doublebe('depletedExtractionArmRadius')
      .doublebe('depletedExtractionPortInnerDiameter')
      .doublebe('depletedBaffleInnerHoleOuterDiameter')
      .doublebe('enrichedBaffleHoleDistributionCircleDiameter')
      .doublebe('depletedExtractionPortOuterDiameter')
      .doublebe('depletedBaffleOuterHoleInnerDiameter')
      .doublebe('minAxialDistance')
      .doublebe('depletedBaffleAxialPosition')
      .doublebe('depletedBaffleOuterHoleOuterDiameter')
      .doublebe('separationPower')
      .doublebe('separationFactor')
  }

  /**
   * 解析二进制 DAT 文件
   * @param buffer 文件 Buffer
   * @returns 解析后的设计方案对象
   */
  private parseBinaryDat(buffer: Buffer): DesignScheme {
    try {
      const parser = this.createDatBinaryParser()
      const result = parser.parse(buffer)

      // 将解析结果转换为 DesignScheme
      const feedingMethodMap: FeedingMethod[] = ['点供料', '线供料', '面供料']
      const feedingMethod = feedingMethodMap[result.feedingMethod] ?? '点供料'

      return {
        isMultiScheme: result.isMultiScheme === 1,
        topLevelParams: {
          angularVelocity: result.angularVelocity,
          rotorRadius: result.rotorRadius,
          rotorShoulderLength: result.rotorShoulderLength,
        },
        operatingParams: {
          rotorSidewallPressure: result.rotorSidewallPressure,
          gasDiffusionCoefficient: result.gasDiffusionCoefficient,
          feedFlowRate: result.feedFlowRate,
          feedingMethod,
          splitRatio: result.splitRatio,
        },
        drivingParams: {
          depletedEndCapTemperature: result.depletedEndCapTemperature,
          enrichedEndCapTemperature: result.enrichedEndCapTemperature,
          feedAxialDisturbance: result.feedAxialDisturbance,
          feedAngularDisturbance: result.feedAngularDisturbance,
          depletedMechanicalDriveAmount: result.depletedMechanicalDriveAmount,
        },
        separationComponents: {
          extractionChamberHeight: result.extractionChamberHeight,
          enrichedBaffleHoleDiameter: result.enrichedBaffleHoleDiameter,
          feedBoxShockDiskHeight: result.feedBoxShockDiskHeight,
          depletedExtractionArmRadius: result.depletedExtractionArmRadius,
          depletedExtractionPortInnerDiameter: result.depletedExtractionPortInnerDiameter,
          depletedBaffleInnerHoleOuterDiameter: result.depletedBaffleInnerHoleOuterDiameter,
          enrichedBaffleHoleDistributionCircleDiameter: result.enrichedBaffleHoleDistributionCircleDiameter,
          depletedExtractionPortOuterDiameter: result.depletedExtractionPortOuterDiameter,
          depletedBaffleOuterHoleInnerDiameter: result.depletedBaffleOuterHoleInnerDiameter,
          minAxialDistance: result.minAxialDistance,
          depletedBaffleAxialPosition: result.depletedBaffleAxialPosition,
          depletedBaffleOuterHoleOuterDiameter: result.depletedBaffleOuterHoleOuterDiameter,
        },
        outputResults: {
          separationPower: result.separationPower,
          separationFactor: result.separationFactor,
        },
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`二进制 DAT 文件解析失败: ${errorMessage}。请检查文件格式是否正确`)
    }
  }

  /**
   * 解析任务数据文件
   * @param _ IPC 事件对象
   * @param filePath 文件路径
   * @returns 解析后的设计方案对象
   */
  private async parseTaskData(_: Electron.IpcMainInvokeEvent, filePath: string): Promise<DesignScheme> {
    try {
      // 读取文件为 Buffer
      const buffer = await fsReadFile(filePath)

      // 判断是否为二进制文件
      if (this.isBinaryFile(buffer)) {
        // 二进制格式：使用 Parser 解析
        return this.parseBinaryDat(buffer)
      }
      else {
        // 文本格式：检测编码并解码
        const encoding = this.detectEncoding(buffer)
        const content = iconv.decode(buffer, encoding)
        return this.parseTextContent(content)
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`解析任务数据文件失败: ${errorMessage}`)
    }
  }
}

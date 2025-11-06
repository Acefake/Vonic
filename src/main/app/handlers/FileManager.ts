import { Buffer } from 'node:buffer'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs'
import { access, readFile as fsReadFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { app, ipcMain } from 'electron'
import { parseSepPower } from '@/main/utils/parseSepPower'
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
    ipcMain.handle('file:read-multi-schemes', this.readMultiSchemes.bind(this))
    ipcMain.handle('file:get-work-dir', this.getWorkDir.bind(this))
    ipcMain.handle('file:create-output-dir', this.createOutputDir.bind(this))
    ipcMain.handle('file:delete-dir', this.deleteDir.bind(this))
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
   *c@param encoding 编码格式
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
   * @param _ IPC 事件对象
   * @param filePath 文件路径
   * @returns 文件内容（文本）
   */
  private async readFileDataIpc(_: Electron.IpcMainInvokeEvent, filePath: string, customDir?: string): Promise<string> {
    const content = await readFileData(filePath, customDir)
    return content
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
   * 检测文件编码
   * @param buffer 文件 Buffer
   * @returns 编码格式
   * 生成 dat 文件内容
   * @param designData 设计数据
   * @returns 操作结果
   */

  private async writeDatFileIpc(_: Electron.IpcMainInvokeEvent, arg1: any, arg2?: any, arg3?: any): Promise<{ code: number, message: string, filePath: string }> {
    // 兼容三种调用方式：
    // 1) invoke('file:write-dat', designData)
    // 2) invoke('file:write-dat', fileName, designData)
    // 3) invoke('file:write-dat', fileName, designData, customDir)
    const designData = (arg2 !== undefined) ? arg2 : arg1
    const customDir = arg3
    return await writeDatFile(designData, customDir)
  }

  /**
   * 读取多个方案数据
   * 扫描文件夹中所有包含 Sep_power.dat 的文件，并解析对应的数据
   * @returns 方案数据数组
   */
  private async readMultiSchemes(_: Electron.IpcMainInvokeEvent): Promise<Array<{
    index: number
    fileName: string
    // 第1行：网格数
    radialGridCount: number
    axialGridCount: number
    // 第2行：主要参数
    angularVelocity: number
    rotorRadius: number
    rotorShoulderLength: number
    extractionChamberHeight: number
    rotorSidewallPressure: number
    gasDiffusionCoefficient: number
    // 第3-29行：其他参数
    depletedEndCapTemperature: number
    enrichedEndCapTemperature: number
    depletedMechanicalDriveAmount: number
    depletedExtractionArmRadius: number
    innerBoundaryMirrorPosition: number
    gridGenerationMethod: number
    enrichedBaffleHoleDistributionCircleDiameter: number
    enrichedBaffleHoleDiameter: number
    depletedExtractionPortInnerDiameter: number
    depletedExtractionPortOuterDiameter: number
    minAxialDistance: number
    feedBoxShockDiskHeight: number
    feedFlowRate: number
    splitRatio: number
    feedAngularDisturbance: number
    feedAxialDisturbance: number
    depletedBaffleInnerHoleOuterDiameter: number
    depletedBaffleOuterHoleInnerDiameter: number
    depletedBaffleOuterHoleOuterDiameter: number
    depletedBaffleAxialPosition: number
    bwgRadialProtrusionHeight: number
    bwgAxialHeight: number
    bwgAxialPosition: number
    radialGridRatio: number
    feedingMethod: number
    compensationCoefficient: number
    streamlineData: number
    // 结果
    sepPower: number | null
    sepFactor: number | null
  }>> {
    try {
      // 判断是否为开发环境
      const isDev = fs.existsSync(join(process.cwd(), 'testFile'))
      let targetDir: string

      if (isDev) {
        // 开发环境：读取项目根目录下 testFile 文件夹
        targetDir = join(process.cwd(), 'testFile')
      }
      else {
        // 生产环境：读取应用可执行文件同级目录
        const exeDir = dirname(app.getPath('exe'))
        targetDir = exeDir
      }

      // 读取 out 子目录（out/out_XXXXXX 格式）
      const outDir = join(targetDir, 'out')

      // 收集所有 Sep_power.dat 文件路径
      const sepPowerFiles: Array<{ filePath: string, dirName: string }> = []

      // 检查 out 目录是否存在
      if (fs.existsSync(outDir)) {
        try {
          // 读取 out 目录中的所有文件和子目录
          const entries = await readdir(outDir, { withFileTypes: true })

          // 扫描 out 目录下的 out_XXXXXX 子目录
          for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('out_')) {
              // 扫描 out_XXXXXX 子目录
              try {
                const subDir = join(outDir, entry.name)
                const subFiles = await readdir(subDir)
                for (const subFile of subFiles) {
                  const fileName = subFile.toLowerCase()
                  if (fileName.includes('sep_power') && fileName.endsWith('.dat')) {
                    sepPowerFiles.push({
                      filePath: join(subDir, subFile),
                      dirName: entry.name,
                    })
                  }
                }
              }
              catch (error) {
                console.warn(`读取子目录失败 (${entry.name}):`, error)
              }
            }
          }
        }
        catch (error) {
          console.warn(`读取 out 目录失败:`, error)
        }
      }

      // 解析每个文件
      const schemes: Array<{
        index: number
        fileName: string
        // 第1行：网格数
        radialGridCount: number
        axialGridCount: number
        // 第2行：主要参数
        angularVelocity: number
        rotorRadius: number
        rotorShoulderLength: number
        extractionChamberHeight: number
        rotorSidewallPressure: number
        gasDiffusionCoefficient: number
        // 第3-29行：其他参数
        depletedEndCapTemperature: number
        enrichedEndCapTemperature: number
        depletedMechanicalDriveAmount: number
        depletedExtractionArmRadius: number
        innerBoundaryMirrorPosition: number
        gridGenerationMethod: number
        enrichedBaffleHoleDistributionCircleDiameter: number
        enrichedBaffleHoleDiameter: number
        depletedExtractionPortInnerDiameter: number
        depletedExtractionPortOuterDiameter: number
        minAxialDistance: number
        feedBoxShockDiskHeight: number
        feedFlowRate: number
        splitRatio: number
        feedAngularDisturbance: number
        feedAxialDisturbance: number
        depletedBaffleInnerHoleOuterDiameter: number
        depletedBaffleOuterHoleInnerDiameter: number
        depletedBaffleOuterHoleOuterDiameter: number
        depletedBaffleAxialPosition: number
        bwgRadialProtrusionHeight: number
        bwgAxialHeight: number
        bwgAxialPosition: number
        radialGridRatio: number
        feedingMethod: number
        compensationCoefficient: number
        streamlineData: number
        // 结果
        sepPower: number | null
        sepFactor: number | null
      }> = []

      for (let i = 0; i < sepPowerFiles.length; i++) {
        const { filePath, dirName } = sepPowerFiles[i]
        const fileName = filePath.split(/[/\\]/).pop() || ''

        try {
          // 读取 Sep_power.dat 文件
          const sepPowerContent = await fsReadFile(filePath, 'utf-8')
          const sepPowerData = parseSepPower(sepPowerContent)

          const sepPowerDir = dirname(filePath)
          const inputDatPath = join(sepPowerDir, 'input.dat')

          // 从 input.dat 读取所有参数，默认值为 0
          const inputParams: Record<string, number> = {
            radialGridCount: 0,
            axialGridCount: 0,
            angularVelocity: 0,
            rotorRadius: 0,
            rotorShoulderLength: 0,
            extractionChamberHeight: 0,
            rotorSidewallPressure: 0,
            gasDiffusionCoefficient: 0,
            depletedEndCapTemperature: 0,
            enrichedEndCapTemperature: 0,
            depletedMechanicalDriveAmount: 0,
            depletedExtractionArmRadius: 0,
            innerBoundaryMirrorPosition: 0,
            gridGenerationMethod: 0,
            enrichedBaffleHoleDistributionCircleDiameter: 0,
            enrichedBaffleHoleDiameter: 0,
            depletedExtractionPortInnerDiameter: 0,
            depletedExtractionPortOuterDiameter: 0,
            minAxialDistance: 0,
            feedBoxShockDiskHeight: 0,
            feedFlowRate: 0,
            splitRatio: 0,
            feedAngularDisturbance: 0,
            feedAxialDisturbance: 0,
            depletedBaffleInnerHoleOuterDiameter: 0,
            depletedBaffleOuterHoleInnerDiameter: 0,
            depletedBaffleOuterHoleOuterDiameter: 0,
            depletedBaffleAxialPosition: 0,
            bwgRadialProtrusionHeight: 0,
            bwgAxialHeight: 0,
            bwgAxialPosition: 0,
            radialGridRatio: 0,
            feedingMethod: 0,
            compensationCoefficient: 0,
            streamlineData: 0,
          }

          try {
            if (fs.existsSync(inputDatPath)) {
              const inputContent = await fsReadFile(inputDatPath, 'utf-8')
              const inputLines = inputContent
                .trim()
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)

              // 第 1 行（索引 0）：径向与轴向网格数
              if (inputLines[0]) {
                const line1Values = inputLines[0]
                  .replace(/!.*/, '')
                  .split(',')
                  .map(v => Number.parseFloat(v.trim()))
                  .filter(v => !Number.isNaN(v))
                if (line1Values.length >= 2) {
                  inputParams.radialGridCount = line1Values[0]
                  inputParams.axialGridCount = line1Values[1]
                }
              }

              // 第 2 行（索引 1）：角速度、半径、两肩长、取料腔高度、侧壁压力、扩散系数
              if (inputLines[1]) {
                const line2Values = inputLines[1]
                  .replace(/!.*/, '')
                  .split(',')
                  .map(v => Number.parseFloat(v.trim()))
                  .filter(v => !Number.isNaN(v))
                if (line2Values.length >= 6) {
                  inputParams.angularVelocity = line2Values[0]
                  inputParams.rotorRadius = line2Values[1]
                  inputParams.rotorShoulderLength = line2Values[2]
                  inputParams.extractionChamberHeight = line2Values[3]
                  inputParams.rotorSidewallPressure = line2Values[4]
                  inputParams.gasDiffusionCoefficient = line2Values[5]
                }
              }

              // 第 3-29 行（索引 2-28）：其他参数
              const paramKeys = [
                'depletedEndCapTemperature',
                'enrichedEndCapTemperature',
                'depletedMechanicalDriveAmount',
                'depletedExtractionArmRadius',
                'innerBoundaryMirrorPosition',
                'gridGenerationMethod',
                'enrichedBaffleHoleDistributionCircleDiameter',
                'enrichedBaffleHoleDiameter',
                'depletedExtractionPortInnerDiameter',
                'depletedExtractionPortOuterDiameter',
                'minAxialDistance',
                'feedBoxShockDiskHeight',
                'feedFlowRate',
                'splitRatio',
                'feedAngularDisturbance',
                'feedAxialDisturbance',
                'depletedBaffleInnerHoleOuterDiameter',
                'depletedBaffleOuterHoleInnerDiameter',
                'depletedBaffleOuterHoleOuterDiameter',
                'depletedBaffleAxialPosition',
                'bwgRadialProtrusionHeight',
                'bwgAxialHeight',
                'bwgAxialPosition',
                'radialGridRatio',
                'feedingMethod',
                'compensationCoefficient',
                'streamlineData',
              ]

              for (let i = 0; i < paramKeys.length; i++) {
                const lineIndex = i + 2 // 从第3行开始（索引2）
                if (inputLines[lineIndex]) {
                  const raw = inputLines[lineIndex].replace(/!.*/, '').trim()
                  const val = Number.parseFloat(raw)
                  if (!Number.isNaN(val)) {
                    inputParams[paramKeys[i]] = val
                  }
                }
              }
            }
          }
          catch (error) {
            console.warn(`读取 input.dat 失败 (${inputDatPath}):`, error)
          }

          // 从目录名提取序号（如 scheme_1 -> 1 或 out_000001 -> 1）
          let schemeIndex = i
          if (dirName) {
            if (dirName.startsWith('scheme_')) {
              const match = dirName.match(/scheme_(\d+)/)
              if (match) {
                schemeIndex = Number.parseInt(match[1], 10) - 1 // 转换为0-based索引
              }
            }
            else if (dirName.startsWith('out_')) {
              const match = dirName.match(/^out_(\d+)$/)
              if (match) {
                schemeIndex = Number.parseInt(match[1], 10) - 1 // 转换为0-based索引
              }
            }
          }

          schemes.push({
            index: schemeIndex,
            fileName: dirName || fileName,
            radialGridCount: inputParams.radialGridCount,
            axialGridCount: inputParams.axialGridCount,
            angularVelocity: inputParams.angularVelocity,
            rotorRadius: inputParams.rotorRadius,
            rotorShoulderLength: inputParams.rotorShoulderLength,
            extractionChamberHeight: inputParams.extractionChamberHeight,
            rotorSidewallPressure: inputParams.rotorSidewallPressure,
            gasDiffusionCoefficient: inputParams.gasDiffusionCoefficient,
            depletedEndCapTemperature: inputParams.depletedEndCapTemperature,
            enrichedEndCapTemperature: inputParams.enrichedEndCapTemperature,
            depletedMechanicalDriveAmount: inputParams.depletedMechanicalDriveAmount,
            depletedExtractionArmRadius: inputParams.depletedExtractionArmRadius,
            innerBoundaryMirrorPosition: inputParams.innerBoundaryMirrorPosition,
            gridGenerationMethod: inputParams.gridGenerationMethod,
            enrichedBaffleHoleDistributionCircleDiameter: inputParams.enrichedBaffleHoleDistributionCircleDiameter,
            enrichedBaffleHoleDiameter: inputParams.enrichedBaffleHoleDiameter,
            depletedExtractionPortInnerDiameter: inputParams.depletedExtractionPortInnerDiameter,
            depletedExtractionPortOuterDiameter: inputParams.depletedExtractionPortOuterDiameter,
            minAxialDistance: inputParams.minAxialDistance,
            feedBoxShockDiskHeight: inputParams.feedBoxShockDiskHeight,
            feedFlowRate: inputParams.feedFlowRate,
            splitRatio: inputParams.splitRatio,
            feedAngularDisturbance: inputParams.feedAngularDisturbance,
            feedAxialDisturbance: inputParams.feedAxialDisturbance,
            depletedBaffleInnerHoleOuterDiameter: inputParams.depletedBaffleInnerHoleOuterDiameter,
            depletedBaffleOuterHoleInnerDiameter: inputParams.depletedBaffleOuterHoleInnerDiameter,
            depletedBaffleOuterHoleOuterDiameter: inputParams.depletedBaffleOuterHoleOuterDiameter,
            depletedBaffleAxialPosition: inputParams.depletedBaffleAxialPosition,
            bwgRadialProtrusionHeight: inputParams.bwgRadialProtrusionHeight,
            bwgAxialHeight: inputParams.bwgAxialHeight,
            bwgAxialPosition: inputParams.bwgAxialPosition,
            radialGridRatio: inputParams.radialGridRatio,
            feedingMethod: inputParams.feedingMethod,
            compensationCoefficient: inputParams.compensationCoefficient,
            streamlineData: inputParams.streamlineData,
            sepPower: sepPowerData.actualSepPower,
            sepFactor: sepPowerData.actualSepFactor,
          })
        }
        catch (error) {
          console.error(`读取文件失败 (${fileName}):`, error)
        }
      }

      // 按分离功率降序排序，相同值按序号升序
      schemes.sort((a, b) => {
        const powerA = a.sepPower ?? -Infinity
        const powerB = b.sepPower ?? -Infinity
        if (powerA !== powerB) {
          return powerB - powerA // 降序
        }
        return a.index - b.index // 升序
      })

      // 重新分配序号
      schemes.forEach((scheme, idx) => {
        scheme.index = idx
      })

      // 在所有采样空间数据循环结束后，判断各方案中分离功率最大值所在方案，作为最优方案
      // 获取方案数据插入多方案设计结果表格第一行，序号为 -1（表示最优方案，前端显示为 '*'）
      if (schemes.length > 0) {
        const validPowers = schemes.filter(s => s.sepPower !== null && s.sepPower !== undefined)
        if (validPowers.length > 0) {
          // 找到最大分离功率的方案（排序后第一条就是最大值）
          const optimalScheme = schemes[0]
          // 创建最优方案的副本，序号设为 -1
          const optimalSchemeCopy = {
            ...optimalScheme,
            index: -1, // -1 表示最优方案，前端显示为 '*'
          }
          // 插入到第一行
          schemes.unshift(optimalSchemeCopy)
          // 重新分配其他方案的序号（从 0 开始）
          for (let i = 1; i < schemes.length; i++) {
            schemes[i].index = i - 1
          }
        }
      }

      return schemes
    }
    catch (error) {
      console.error('读取多方案数据失败:', error)
      throw new Error(`读取多方案数据失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取工作目录
   * @returns 工作目录路径
   */
  private getWorkDir(): string {
    const isDev = fs.existsSync(join(process.cwd(), 'testFile'))
    if (isDev) {
      return join(process.cwd(), 'testFile')
    }
    else {
      return dirname(app.getPath('exe'))
    }
  }

  /**
   * 创建唯一的输出目录（out/out_XXXXXX 格式，6位数字，最多支持100万个目录）
   * @param _ IPC 事件对象
   * @param baseDir 基础目录路径
   * @returns 创建的目录路径
   */
  private async createOutputDir(_: Electron.IpcMainInvokeEvent, baseDir: string): Promise<string> {
    try {
      // 确保基础目录存在
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true })
      }

      // 创建 out 子目录（如果不存在）
      const outDir = join(baseDir, 'out')
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }

      // 读取 out 目录中的所有条目
      const entries = await readdir(outDir, { withFileTypes: true })

      // 找出所有 out_ 开头的目录，提取编号
      const existingNumbers: number[] = []
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('out_')) {
          const match = entry.name.match(/^out_(\d+)$/)
          if (match) {
            const num = Number.parseInt(match[1], 10)
            if (!Number.isNaN(num)) {
              existingNumbers.push(num)
            }
          }
        }
      }

      // 找到下一个可用的编号
      let nextNumber = 1
      if (existingNumbers.length > 0) {
        existingNumbers.sort((a, b) => a - b)
        // 找到第一个空缺或最大值+1
        for (let i = 0; i < existingNumbers.length; i++) {
          if (existingNumbers[i] !== i + 1) {
            nextNumber = i + 1
            break
          }
          nextNumber = existingNumbers[i] + 1
        }
      }

      // 生成目录名（6位数字，补零，格式：out_000001）
      const dirName = `out_${String(nextNumber).padStart(6, '0')}`
      const dirPath = join(outDir, dirName)

      // 创建目录
      fs.mkdirSync(dirPath, { recursive: true })

      return dirPath
    }
    catch (error) {
      console.error('创建输出目录失败:', error)
      throw new Error(`创建输出目录失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 删除目录（递归删除）
   * @param _ IPC 事件对象
   * @param dirPath 目录路径
   */
  private async deleteDir(_: Electron.IpcMainInvokeEvent, dirPath: string): Promise<void> {
    try {
      // 检查目录是否存在
      if (!fs.existsSync(dirPath)) {
        return // 目录不存在，直接返回
      }

      // 使用 rm 递归删除目录及其内容
      await rm(dirPath, { recursive: true, force: true })
    }
    catch (error) {
      console.error('删除目录失败:', error)
      throw new Error(`删除目录失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

import { Buffer } from 'node:buffer'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs'
import { access, copyFile, readFile as fsReadFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { app, ipcMain } from 'electron'
import { getProductConfig } from '@/config/product.config'
import { deleteOutFolder } from '@/main/utils/cleanup'
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
    ipcMain.handle('file:copy-file', this.copyFile.bind(this))
    ipcMain.handle('file:find-exe', this.findExe.bind(this))
    ipcMain.handle('file:delete-out-folder', this.deleteOutFolder.bind(this))
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
    const fileName = (typeof arg1 === 'string') ? arg1 : undefined
    const designData = (arg2 !== undefined) ? arg2 : arg1
    const customDir = arg3
    const options = { customDir, fileName }
    return await writeDatFile(designData, options)
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

      // 读取产品配置的结果文件名与输入文件名
      const productConfig = getProductConfig()
      const outputFileName = productConfig.file?.outputFileName || 'Sep_power.dat'
      const inputFileName = productConfig.file?.inputFileName || 'input.dat'

      // 收集所有结果文件路径（匹配配置的文件名与常见候选名，大小写不敏感）
      const resultFiles: Array<{ filePath: string, dirName: string }> = []
      const candidateOutputNames = new Set<string>([
        (outputFileName || '').toLowerCase(),
        'sep_power.dat',
        'output.dat',
      ].filter(Boolean))

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
                  const fileNameLower = subFile.toLowerCase()
                  if (candidateOutputNames.has(fileNameLower)) {
                    resultFiles.push({
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

      // 通用的 key=value 结果解析器（兼容 D/E 科学计数法）
      const parseKeyValueResult = (content: string): Record<string, number> => {
        const lines = content.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
        const result: Record<string, number> = {}
        // 匹配 key = value 形式，value 支持整数/小数/科学计数法(E/D)
        const kvRegex = /([^\s=]+)\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[ed][+-]?\d+)?)/gi
        for (const line of lines) {
          const matches = line.matchAll(kvRegex)
          for (const m of matches) {
            const key = m[1]?.trim()
            const numericRaw = m[2]?.replace(/d/i, 'E')
            const val = Number.parseFloat(numericRaw || '')
            if (key && Number.isFinite(val)) {
              result[key] = val
            }
          }
        }
        return result
      }

      for (let i = 0; i < resultFiles.length; i++) {
        const { filePath, dirName } = resultFiles[i]
        const fileName = filePath.split(/[/\\]/).pop() || ''

        try {
          // 读取结果文件
          const resultContent = await fsReadFile(filePath, 'utf-8')

          // 根据“实际结果文件名”选择解析器：包含 sep_power 用原有解析，否则使用通用解析
          const isSepPowerFormat = fileName.toLowerCase().includes('sep_power')
          const sepPowerData = isSepPowerFormat ? parseSepPower(resultContent) : null
          const genericResult = isSepPowerFormat ? {} : parseKeyValueResult(resultContent)

          const sepPowerDir = dirname(filePath)
          // 选择实际存在的输入文件（支持多产品场景）
          const inputCandidateNames = [
            (inputFileName || '').toLowerCase(),
            'input.dat',
            'input2.txt',
            'input_p.txt',
          ].filter(Boolean)
          let foundInputPath: string | null = null
          for (const name of inputCandidateNames) {
            const p = join(sepPowerDir, name)
            if (fs.existsSync(p)) {
              foundInputPath = p
              break
            }
          }
          const inputPath = foundInputPath ?? join(sepPowerDir, inputFileName)

          // 从输入文件读取参数
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

          // 仅 powerAnalysis: 解析 input2.txt 的 key=value，并映射到前端使用的字段名
          const paParams: Record<string, number> = {
            // 顶层参数
            angularVelocity: 0,
            rotorRadius: 0,
            // 流体参数
            averageTemperature: 0,
            enrichedBaffleTemperature: 0,
            feedFlowRate: 0,
            rotorSidewallPressure: 0,
            // 分离部件
            depletedExtractionPortInnerDiameter: 0,
            depletedExtractionPortOuterDiameter: 0,
            depletedExtractionRootOuterDiameter: 0,
            extractorAngleOfAttack: 0,
            extractionChamberHeight: 0,
            depletedExtractionCenterDistance: 0,
            enrichedExtractionCenterDistance: 0,
            constantSectionStraightPipeLength: 0,
            extractorCuttingAngle: 0,
            enrichedBaffleHoleDiameter: 0,
            variableSectionStraightPipeLength: 0,
            bendRadiusOfCurvature: 0,
            extractorSurfaceRoughness: 0,
            extractorTaperAngle: 0,
            enrichedBaffleHoleDistributionCircleDiameter: 0,
          }

          try {
            if (fs.existsSync(inputPath)) {
              const inputContent = await fsReadFile(inputPath, 'utf-8')
              const lines = inputContent.trim().split('\n').map(l => l.trim()).filter(Boolean)

              // 根据 实际找到的 input 文件名 选择解析方式
              const actualInputName = (inputPath.split(/[/\\]/).pop() || '').toLowerCase()
              if (actualInputName === 'input2.txt') {
                // key=value 解析
                const kv: Record<string, string> = {}
                for (const line of lines) {
                  const eqIdx = line.indexOf('=')
                  if (eqIdx >= 0) {
                    const k = line.slice(0, eqIdx).trim()
                    const v = line.slice(eqIdx + 1).trim()
                    if (k && v !== '')
                      kv[k] = v
                  }
                }
                // 映射为 powerAnalysis 前端字段
                const toNum = (s: string | undefined): number => {
                  if (!s)
                    return 0
                  const n = Number.parseFloat(s)
                  return Number.isFinite(n) ? n : 0
                }
                paParams.angularVelocity = toNum(kv.DegSpeed)
                paParams.rotorRadius = toNum(kv.RotorRadius)
                paParams.averageTemperature = toNum(kv.Temperature)
                paParams.enrichedBaffleTemperature = toNum(kv.RichBaffleTemp)
                paParams.rotorSidewallPressure = toNum(kv.RotorPressure)
                paParams.feedFlowRate = toNum(kv.PowerFlow)
                paParams.depletedExtractionPortInnerDiameter = toNum(kv.PoorTackInnerRadius)
                paParams.depletedExtractionPortOuterDiameter = toNum(kv.PoorTackOuterRadius)
                paParams.depletedExtractionRootOuterDiameter = toNum(kv.PoorTackRootOuterRadius)
                paParams.depletedExtractionCenterDistance = toNum(kv.PoorTackDistance)
                paParams.enrichedExtractionCenterDistance = toNum(kv.RichTackDistance)
                paParams.constantSectionStraightPipeLength = toNum(kv.EvenSectionPipeLength)
                paParams.variableSectionStraightPipeLength = toNum(kv.ChangeSectionPipeLength)
                paParams.bendRadiusOfCurvature = toNum(kv.PipeRadius)
                paParams.extractorSurfaceRoughness = toNum(kv.TackSurfaceRoughness)
                paParams.extractorAngleOfAttack = toNum(kv.TackAttkAngle)
                paParams.extractorCuttingAngle = toNum(kv.TackChamferAngle)
                paParams.extractorTaperAngle = toNum(kv.TackTaperAngle)
                // 业务未给出明确映射，暂用取料腔高度
                paParams.extractionChamberHeight = toNum(kv.TackHeight)
                paParams.enrichedBaffleHoleDiameter = toNum(kv.RichBaffleHoleDiam)
                paParams.enrichedBaffleHoleDistributionCircleDiameter = toNum(kv.RichBaffleArrayHoleDiam)

                // 若本方案目录 input2.txt 为空（全部解析为 0），回退到工作根目录的 input2.txt
                const allZeroPA = Object.values(paParams).every(v => v === 0)
                if (allZeroPA) {
                  const rootInputPath = join(targetDir, actualInputName)
                  if (fs.existsSync(rootInputPath)) {
                    try {
                      const rootContent = await fsReadFile(rootInputPath, 'utf-8')
                      const rootLines = rootContent.trim().split('\n').map(l => l.trim()).filter(Boolean)
                      const rootKv: Record<string, string> = {}
                      for (const line of rootLines) {
                        const eqIdx2 = line.indexOf('=')
                        if (eqIdx2 >= 0) {
                          const k2 = line.slice(0, eqIdx2).trim()
                          const v2 = line.slice(eqIdx2 + 1).trim()
                          if (k2 && v2 !== '')
                            rootKv[k2] = v2
                        }
                      }
                      paParams.angularVelocity = toNum(rootKv.DegSpeed)
                      paParams.rotorRadius = toNum(rootKv.RotorRadius)
                      paParams.averageTemperature = toNum(rootKv.Temperature)
                      paParams.enrichedBaffleTemperature = toNum(rootKv.RichBaffleTemp)
                      paParams.rotorSidewallPressure = toNum(rootKv.RotorPressure)
                      paParams.feedFlowRate = toNum(rootKv.PowerFlow)
                      paParams.depletedExtractionPortInnerDiameter = toNum(rootKv.PoorTackInnerRadius)
                      paParams.depletedExtractionPortOuterDiameter = toNum(rootKv.PoorTackOuterRadius)
                      paParams.depletedExtractionRootOuterDiameter = toNum(rootKv.PoorTackRootOuterRadius)
                      paParams.depletedExtractionCenterDistance = toNum(rootKv.PoorTackDistance)
                      paParams.enrichedExtractionCenterDistance = toNum(rootKv.RichTackDistance)
                      paParams.constantSectionStraightPipeLength = toNum(rootKv.EvenSectionPipeLength)
                      paParams.variableSectionStraightPipeLength = toNum(rootKv.ChangeSectionPipeLength)
                      paParams.bendRadiusOfCurvature = toNum(rootKv.PipeRadius)
                      paParams.extractorSurfaceRoughness = toNum(rootKv.TackSurfaceRoughness)
                      paParams.extractorAngleOfAttack = toNum(rootKv.TackAttkAngle)
                      paParams.extractorCuttingAngle = toNum(rootKv.TackChamferAngle)
                      paParams.extractorTaperAngle = toNum(rootKv.TackTaperAngle)
                      paParams.extractionChamberHeight = toNum(rootKv.TackHeight)
                      paParams.enrichedBaffleHoleDiameter = toNum(rootKv.RichBaffleHoleDiam)
                      paParams.enrichedBaffleHoleDistributionCircleDiameter = toNum(rootKv.RichBaffleArrayHoleDiam)
                    }
                    catch {
                      // 忽略回退失败
                    }
                  }
                }
              }
              else if (actualInputName === 'input_p.txt') {
                // powerAnalysis 的 input_p.txt 行式解析（数值 + 注释）
                const valAt = (lineIdx: number): number => {
                  const raw = lines[lineIdx - 1] || ''
                  const num = Number.parseFloat(raw.replace(/!.*/, '').trim())
                  return Number.isFinite(num) ? num : 0
                }
                paParams.rotorRadius = valAt(1)
                paParams.angularVelocity = valAt(2)
                paParams.averageTemperature = valAt(3)
                paParams.enrichedBaffleTemperature = valAt(4)
                paParams.rotorSidewallPressure = valAt(5)
                paParams.feedFlowRate = valAt(6)
                paParams.depletedExtractionPortInnerDiameter = valAt(8)
                paParams.depletedExtractionPortOuterDiameter = valAt(9)
                paParams.depletedExtractionRootOuterDiameter = valAt(10)
                paParams.depletedExtractionCenterDistance = valAt(11)
                paParams.enrichedExtractionCenterDistance = valAt(12)
                paParams.constantSectionStraightPipeLength = valAt(13)
                paParams.variableSectionStraightPipeLength = valAt(14)
                paParams.bendRadiusOfCurvature = valAt(15)
                paParams.extractorSurfaceRoughness = valAt(16)
                paParams.extractorAngleOfAttack = valAt(17)
                paParams.extractorCuttingAngle = valAt(18)
                paParams.extractorTaperAngle = valAt(19)
                // 第20行为取料腔高度的一半
                paParams.extractionChamberHeight = valAt(20) * 2
                paParams.enrichedBaffleHoleDiameter = valAt(21)
                paParams.enrichedBaffleHoleDistributionCircleDiameter = valAt(24)
              }
              else {
                // mPhysSim 的 input.dat 行式解析
                const inputLines = lines
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
                // 第 2 行（索引 1）
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
                // 第 3-29 行（索引 2-28）
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
                  const lineIndex = i + 2
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
          }
          catch (error) {
            console.warn(`读取 input.dat 失败 (${inputPath}):`, error)
            // 忽略输入文件读取错误，保留默认参数
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

          // 基础方案对象
          const schemeBase: any = {
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
          }

          // 若为 powerAnalysis，附加其表单字段，供多方案界面按字段显示
          if (['input2.txt', 'input_p.txt'].includes(inputFileName.toLowerCase())) {
            Object.assign(schemeBase, paParams)
          }

          // 结果字段：按产品配置 mapping 注入动态字段
          const resultFields = productConfig.resultFields || []
          for (const rf of resultFields) {
            if (!rf.field)
              continue
            if (isSepPowerFormat) {
              // 兼容旧 mPhysSim：保持 sepPower/sepFactor，同时也可按 fileKey 注入
              // 映射 fileKey -> 值（若能从 parseSepPower 推断）
              const map: Record<string, number | null> = {
                'ACTURAL SEPERATIVE POWER': sepPowerData?.actualSepPower ?? null,
                'ACTURAL SEPERATIVE FACTOR': sepPowerData?.actualSepFactor ?? null,
                'ACTUAL SEPERATIVE POWER': sepPowerData?.actualSepPower ?? null,
                'ACTUAL SEPERATIVE FACTOR': sepPowerData?.actualSepFactor ?? null,
              }
              const val = rf.fileKey ? (map[rf.fileKey] ?? null) : null
              schemeBase[rf.field] = val
            }
            else {
              // 通用：从通用解析结果中以 fileKey 取值
              const key = rf.fileKey
              schemeBase[rf.field] = key ? (genericResult[key] ?? null) : null
            }
          }

          // 向后兼容字段（前端老类型）：仅当有 sep_power 格式时赋值
          schemeBase.sepPower = sepPowerData?.actualSepPower ?? null
          schemeBase.sepFactor = sepPowerData?.actualSepFactor ?? null

          schemes.push(schemeBase)
        }
        catch (error) {
          console.error(`读取文件失败 (${fileName}):`, error)
        }
      }

      // 在所有采样空间数据循环结束后，判断各方案中分离功率最大值所在方案，作为最优方案
      // 先找到最优方案，记录其原始序号
      let optimalOriginalIndex = -1
      let optimalScheme: typeof schemes[0] | null = null

      if (schemes.length > 0) {
        // 选择用于“最优方案”比较的字段：优先第一个结果字段，否则回退 sepPower
        const productConfig = getProductConfig()
        const firstResultField = productConfig.resultFields?.[0]?.field || 'sepPower'
        const validPowers = schemes.filter((s: any) => s[firstResultField] !== null && s[firstResultField] !== undefined)
        if (validPowers.length > 0) {
          // 找到最大值的方案
          let maxVal = -Infinity
          for (const scheme of validPowers) {
            const power = (scheme as any)[firstResultField] as number
            // 严格比较：只有值更大时才更新最优方案；相等时取序号更小者
            if (power > maxVal || (power === maxVal && (optimalScheme === null || scheme.index < optimalScheme.index))) {
              maxVal = power
              optimalScheme = scheme
            }
          }
          if (optimalScheme) {
            optimalOriginalIndex = optimalScheme.index
            console.log(`[FileManager] 找到最优方案: 原始序号=${optimalOriginalIndex + 1}, metric=${(optimalScheme as any)[productConfig.resultFields?.[0]?.field || 'sepPower']}`)
          }
        }
      }

      // 按原始序号排序（保持原有顺序）
      schemes.sort((a, b) => a.index - b.index)

      // 如果找到最优方案，创建一个副本放在第一行（index = -1），同时保留原位置的最优方案
      if (optimalOriginalIndex >= 0 && optimalScheme) {
        const originalOptimalScheme = schemes.find(s => s.index === optimalOriginalIndex)
        if (originalOptimalScheme) {
          // 创建最优方案的副本，用于第一行显示（序号为 '*'，绿色背景）
          const optimalCopy = JSON.parse(JSON.stringify(originalOptimalScheme)) as any
          optimalCopy.index = -1 // -1 表示最优方案，前端显示为 '*'
          optimalCopy.originalIndex = optimalOriginalIndex // 保存原始序号
          optimalCopy.isOptimalCopy = true // 标记这是最优方案的副本

          // 将副本插入到数组的第一位
          schemes.unshift(optimalCopy)
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

  /**
   * 复制文件
   * @param _ IPC 事件对象
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   */
  private async copyFile(_: Electron.IpcMainInvokeEvent, sourcePath: string, targetPath: string): Promise<void> {
    try {
      // 检查源文件是否存在
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`源文件不存在: ${sourcePath}`)
      }

      // 确保目标目录存在
      const targetDir = dirname(targetPath)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // 复制文件
      await copyFile(sourcePath, targetPath)
    }
    catch (error) {
      console.error('复制文件失败:', error)
      throw new Error(`复制文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 查找 exe 文件路径
   * @param _ IPC 事件对象
   * @param exeName exe 文件名
   * @returns exe 文件路径，如果不存在则返回 null
   */
  private findExe(_: Electron.IpcMainInvokeEvent, exeName: string): string | null {
    try {
      const isDev = fs.existsSync(join(process.cwd(), 'testFile'))

      if (isDev) {
        // 开发环境：在 testFile 目录查找
        const testFileDir = join(process.cwd(), 'testFile')
        const exePath = join(testFileDir, exeName)
        if (fs.existsSync(exePath)) {
          return exePath
        }
      }
      else {
        // 生产环境：在多个可能的位置查找
        const exeDir = dirname(app.getPath('exe'))
        const candidatePaths = [
          join(exeDir, exeName),
          join(exeDir, 'resources', exeName),
          join(exeDir, 'resources', 'unpacked', exeName),
        ]
        const foundPath = candidatePaths.find(p => fs.existsSync(p))
        if (foundPath) {
          return foundPath
        }
      }

      return null
    }
    catch (error) {
      console.error('查找 exe 文件失败:', error)
      return null
    }
  }

  /**
   * 删除输出目录
   * @param _ IPC 事件对象
   */
  private async deleteOutFolder(_: Electron.IpcMainInvokeEvent): Promise<void> {
    await deleteOutFolder()
  }
}

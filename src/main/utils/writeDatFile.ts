import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'

/**
 * 根据传入的参数和值生成输入文件
 * @param designData 设计数据对象，将被序列化写入文件
 * @param customDirOrOptions 可选：字符串表示自定义目录；或对象 { customDir?, fileName? }
 *  - customDir: 自定义目录路径；若不提供则自动选择（开发：testFile，生产：exe同级/资源目录）
 *  - fileName: 目标文件名，默认 'input.dat'；例如 powerAnalysis 需要 'input2.txt'
 * 生产环境：在同级目录生成文件
 * 开发环境：在项目根目录的 testFile 文件夹生成文件
 * @returns 写入结果
 */
export function writeDatFile(
  designData: any,
  customDirOrOptions?: string | { customDir?: string, fileName?: string },
): { code: number, message: string, filePath: string } {
  try {
    let targetDir: string
    let fileName = 'input.dat'

    if (typeof customDirOrOptions === 'string') {
      // 如果提供了自定义目录，直接使用
      targetDir = customDirOrOptions
    }
    else {
      const customDir = customDirOrOptions?.customDir
      const specifiedName = customDirOrOptions?.fileName
      if (specifiedName && typeof specifiedName === 'string') {
        fileName = specifiedName
      }

      if (customDir) {
        targetDir = customDir
      }
      else {
      // 与 readFileData 保持一致的开发环境判断：以项目根目录是否存在 testFile 目录为准
        const isDev = fs.existsSync(path.join(process.cwd(), 'testFile'))

        if (isDev) {
        // 开发环境：写到项目根目录的 testFile 目录
          targetDir = path.join(process.cwd(), 'testFile')
        }
        else {
        // 生产环境：写到外部程序所在目录（常见：exe 同级 / resources / resources/unpacked）
        // 注意：app.getAppPath() 在打包后会指向 asar 包，不适合写入；应使用 exe 路径或资源目录
          const exeDir = path.dirname(app.getPath('exe'))
          const candidateDirs = [
            exeDir,
            path.join(exeDir, 'resources'),
            path.join(exeDir, 'resources', 'unpacked'),
          ]
          // 优先选择存在 ns-linear.exe 的目录，以确保 Fortran 程序能读取到 input.dat
          const preferredDir = candidateDirs.find(dir => fs.existsSync(path.join(dir, 'ns-linear.exe')))
          targetDir = preferredDir || exeDir
        }
      }
    }

    // 确保目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const filePath = path.join(targetDir, fileName)

    // 根据目标文件名构建内容：
    // - input2.txt 使用 key=value 行（功耗分析导出）
    // - input_p.txt 使用 1-28 数字+注释行（功耗分析程序 PowerLoss.exe 读取）
    // - 其他（如 input.dat）使用分离计算数值行
    const lowerName = fileName.toLowerCase()
    let content: string
    if (lowerName === 'input2.txt') {
      content = buildInput2TxtContent(designData)
    }
    else if (lowerName === 'input_p.txt') {
      content = buildInputPTxtContent(designData)
    }
    else {
      content = buildInputDatContent(designData)
    }

    fs.writeFileSync(filePath, content, 'utf8')

    return {
      code: 200,
      message: '方案提交成功',
      filePath,
    }
  }
  catch (error) {
    return {
      code: 500,
      message: `方案提交失败:${error}`,
      filePath: '',
    }
  }
}

/**
 * 从设计数据中安全获取值，支持扁平结构或分组结构（topLevelParams/operatingParams/drivingParams/separationComponents）
 */
function getVal(designData: any, key: string, defaultValue: number | string = 0): number | string {
  if (designData == null)
    return defaultValue
  if (key in designData && designData[key] !== undefined && designData[key] !== null)
    return designData[key]
  const groups = ['topLevelParams', 'operatingParams', 'drivingParams', 'separationComponents']
  for (const g of groups) {
    if (designData[g] && designData[g][key] !== undefined && designData[g][key] !== null) {
      return designData[g][key]
    }
  }
  return defaultValue
}

function fmtVal(v: number | string): string {
  if (typeof v === 'number' && Number.isFinite(v))
    return String(v)
  // 尝试转换为数字
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : String(v ?? '')
}

function line(values: Array<number | string>, comment: string): string {
  return `${values.map(fmtVal).join(',')}        !${comment}`
}

/**
 * 构建 input.dat 内容（带内联注释），行顺序与现有解析逻辑保持兼容
 */
function buildInputDatContent(designData: any): string {
  // 行 1：径向与轴向网格数（暂用默认值，若未来表单提供则可从 designData 中获取）
  const radialGridCount = getVal(designData, 'radialGridCount', 12)
  const axialGridCount = getVal(designData, 'axialGridCount', 12)
  const l1 = line([radialGridCount, axialGridCount], '径向与轴向网格数')

  // 行 2：六个主参数（为兼容 Fortran 格式，包含取料腔高度；解析时多出的值会被忽略）
  const angularVelocity = getVal(designData, 'angularVelocity', 0)
  const rotorRadius = getVal(designData, 'rotorRadius', 0)
  const rotorShoulderLength = getVal(designData, 'rotorShoulderLength', 0)
  const extractionChamberHeight = getVal(designData, 'extractionChamberHeight', 0)
  const rotorSidewallPressure = getVal(designData, 'rotorSidewallPressure', 0)
  const gasDiffusionCoefficient = getVal(designData, 'gasDiffusionCoefficient', 0)
  const l2 = line([
    angularVelocity,
    rotorRadius,
    rotorShoulderLength,
    extractionChamberHeight,
    rotorSidewallPressure,
    gasDiffusionCoefficient,
  ], '角速度HZ,半径mm,两肩长mm,取料腔高度mm,侧壁压力Pa,扩散系数')

  // 后续参数行（与界面表单字段一一对应，顺序与解析逻辑保持一致）
  const l3 = line([getVal(designData, 'depletedEndCapTemperature', 0)], '贫料端盖温度K')
  const l4 = line([getVal(designData, 'enrichedEndCapTemperature', 0)], '精料盖温度K')
  const l5 = line([getVal(designData, 'depletedMechanicalDriveAmount', 0)], '贫料机械驱动mm')
  const l6 = line([getVal(designData, 'depletedExtractionArmRadius', 0)], '贫料取料支臂半径mm')
  const l7 = line([getVal(designData, 'innerBoundaryMirrorPosition', 0)], '内边界镜像位置mm')
  const l8 = line([getVal(designData, 'gridGenerationMethod', 0)], '网格生成方式')
  const l9 = line([getVal(designData, 'enrichedBaffleHoleDistributionCircleDiameter', 0)], '精挡板孔分布圆直径mm')
  const l10 = line([getVal(designData, 'enrichedBaffleHoleDiameter', 0)], '精挡板孔直径mm')
  const l11 = line([getVal(designData, 'depletedExtractionPortInnerDiameter', 0)], '贫取料口部内径mm')
  const l12 = line([getVal(designData, 'depletedExtractionPortOuterDiameter', 0)], '贫取料口部外径mm')
  const l13 = line([getVal(designData, 'minAxialDistance', 0)], '供料箱与贫取料器最近轴向间距mm')
  const l14 = line([getVal(designData, 'feedBoxShockDiskHeight', 0)], '供料箱激波盘高度mm')
  const l15 = line([getVal(designData, 'feedFlowRate', 0)], '供料流量kg/s')
  const l16 = line([getVal(designData, 'splitRatio', 0)], '分流比')
  const l17 = line([getVal(designData, 'feedAngularDisturbance', 0)], '供料角向扰动')
  const l18 = line([getVal(designData, 'feedAxialDisturbance', 0)], '供料轴向扰动')
  const l19 = line([getVal(designData, 'depletedBaffleInnerHoleOuterDiameter', 0)], '贫料挡板内孔外径mm')
  const l20 = line([getVal(designData, 'depletedBaffleOuterHoleInnerDiameter', 0)], '贫料挡板外孔内径mm')
  const l21 = line([getVal(designData, 'depletedBaffleOuterHoleOuterDiameter', 0)], '贫料挡板外孔外径mm')
  const l22 = line([getVal(designData, 'depletedBaffleAxialPosition', 0)], '贫料挡板轴向位置mm')
  const l23 = line([getVal(designData, 'bwgRadialProtrusionHeight', 0)], 'BWG径向凸起高度mm')
  const l24 = line([getVal(designData, 'bwgAxialHeight', 0)], 'BWG轴向高度mm')
  const l25 = line([getVal(designData, 'bwgAxialPosition', 0)], 'BWG轴向位置mm从贫取料器至BWG中间')
  const l26 = line([getVal(designData, 'radialGridRatio', 0)], '径向网格比')

  // 供料方式：可能是字符串或枚举，尝试输出数字，无法转换则原样输出
  let feedingMethod = getVal(designData, 'feedingMethod', 0)
  const feedingMethodNum = Number(feedingMethod)
  feedingMethod = Number.isFinite(feedingMethodNum) ? feedingMethodNum : feedingMethod
  const l27 = line([feedingMethod], '供料方式')

  const l28 = line([getVal(designData, 'compensationCoefficient', 0)], '补偿系数')
  const l29 = line([getVal(designData, 'streamlineData', 0)], '流线数据')

  return [
    l1,
    l2,
    l3,
    l4,
    l5,
    l6,
    l7,
    l8,
    l9,
    l10,
    l11,
    l12,
    l13,
    l14,
    l15,
    l16,
    l17,
    l18,
    l19,
    l20,
    l21,
    l22,
    l23,
    l24,
    l25,
    l26,
    l27,
    l28,
    l29,
  ].join('\n')
}

/**
 * 构建 powerAnalysis 的 input2.txt 内容（key=value，每行一个参数）
 * 对于缺省值输出为空值，以便与示例格式一致（例如 PoorTackInnerRadius=）
 */
function buildInput2TxtContent(designData: any): string {
  const keysInOrder = [
    'DegSpeed',
    'RotorRadius',
    'Temperature',
    'RichBaffleTemp',
    'RotorPressure',
    'PowerFlow',
    'PoorTackInnerRadius',
    'PoorTackOuterRadius',
    'PoorTackRootOuterRadius',
    'PoorTackDistance',
    'RichTackDistance',
    'EvenSectionPipeLength',
    'ChangeSectionPipeLength',
    'PipeRadius',
    'TackSurfaceRoughness',
    'TackAttkAngle',
    'TackChamferAngle',
    'TackTaperAngle',
    'TackHeight',
    'RichBaffleHoleDiam',
    'RichBaffleArrayHoleDiam',
  ]

  // 将 input2.txt 所需键映射到前端表单字段名
  const srcFieldByKey: Record<string, string> = {
    DegSpeed: 'angularVelocity',
    RotorRadius: 'rotorRadius',
    Temperature: 'averageTemperature',
    RichBaffleTemp: 'enrichedBaffleTemperature',
    RotorPressure: 'rotorSidewallPressure',
    PowerFlow: 'feedFlowRate',
    PoorTackInnerRadius: 'depletedExtractionPortInnerDiameter',
    PoorTackOuterRadius: 'depletedExtractionPortOuterDiameter',
    PoorTackRootOuterRadius: 'depletedExtractionRootOuterDiameter',
    PoorTackDistance: 'depletedExtractionCenterDistance',
    RichTackDistance: 'enrichedExtractionCenterDistance',
    EvenSectionPipeLength: 'constantSectionStraightPipeLength',
    ChangeSectionPipeLength: 'variableSectionStraightPipeLength',
    PipeRadius: 'bendRadiusOfCurvature',
    TackSurfaceRoughness: 'extractorSurfaceRoughness',
    TackAttkAngle: 'extractorAngleOfAttack',
    TackChamferAngle: 'extractorCuttingAngle',
    TackTaperAngle: 'extractorTaperAngle',
    TackHeight: 'extractionChamberHeight',
    RichBaffleHoleDiam: 'enrichedBaffleHoleDiameter',
    RichBaffleArrayHoleDiam: 'enrichedBaffleHoleDistributionCircleDiameter',
  }

  const getOptional = (obj: any, key: string): string => {
    if (!obj)
      return ''
    // 1) 优先：直接同名键（兼容已是目标键名的输入）
    const direct = obj[key]
    if (direct !== undefined && direct !== null && direct !== '')
      return String(direct)

    // 2) 其次：映射到前端字段名再取值
    const mappedField = srcFieldByKey[key]
    if (mappedField) {
      const mappedVal = obj[mappedField]
      if (mappedVal !== undefined && mappedVal !== null && mappedVal !== '')
        return String(mappedVal)
    }

    // 3) 再次：支持分组对象（如 topLevelParams/operatingParams/...）
    const groups = ['topLevelParams', 'operatingParams', 'drivingParams', 'separationComponents']
    for (const g of groups) {
      const groupObj = obj[g]
      if (!groupObj)
        continue
      // 3.1 组内同名键
      if (groupObj[key] !== undefined && groupObj[key] !== null && groupObj[key] !== '') {
        return String(groupObj[key])
      }
      // 3.2 组内映射后的字段名
      if (mappedField && groupObj[mappedField] !== undefined && groupObj[mappedField] !== null && groupObj[mappedField] !== '') {
        return String(groupObj[mappedField])
      }
    }
    return ''
  }

  const lines = keysInOrder.map(k => `${k}=${getOptional(designData, k)}`)
  return lines.join('\n')
}

/**
 * 构建功耗分析程序所需的 input_p.txt 内容（28 行：数值 + 中文注释）
 * 字段来源与前端 PowerAnalysisDesign 中的 buildInputTxtContent 对齐
 */
function buildInputPTxtContent(designData: any): string {
  const val = (key: string, dft = 0): number => {
    const raw = getVal(designData, key, dft)
    const n = Number(raw as any)
    return Number.isFinite(n) ? n : dft
  }

  const lines: string[] = []
  // 1. 半径
  lines.push(`${val('rotorRadius')}    !半径`)
  // 2. 转速
  lines.push(`${val('angularVelocity')}    !转速`)
  // 3. T0
  lines.push(`${val('averageTemperature')}    !T0`)
  // 4. 精料挡板温度
  lines.push(`${val('enrichedBaffleTemperature')}    !精料挡板温度`)
  // 5. Pw_w
  lines.push(`${val('rotorSidewallPressure')}    !Pw_w`)
  // 6. 供料流量
  lines.push(`${val('feedFlowRate')}    !供料流量`)
  // 7. 贫料流量（无此字段，置 0）
  lines.push(`0    !贫料流量`)
  // 8. ds
  lines.push(`${val('depletedExtractionPortInnerDiameter')}    !ds`)
  // 9. ds1
  lines.push(`${val('depletedExtractionPortOuterDiameter')}    !ds1`)
  // 10. ds0
  lines.push(`${val('depletedExtractionRootOuterDiameter')}    !ds0`)
  // 11. rw
  lines.push(`${val('depletedExtractionCenterDistance')}    !rw`)
  // 12. rp
  lines.push(`${val('enrichedExtractionCenterDistance')}    !rp`)
  // 13. Ls
  lines.push(`${val('constantSectionStraightPipeLength')}    !Ls`)
  // 14. Lss
  lines.push(`${val('variableSectionStraightPipeLength')}    !Lss`)
  // 15. rss
  lines.push(`${val('bendRadiusOfCurvature')}    !rss`)
  // 16. Hr_Scoop=roughness 取料器镀镍后的表面粗糙度
  lines.push(`${val('extractorSurfaceRoughness')}    !Hr_Scoop=roughness 取料器镀镍后的表面粗糙度`)
  // 17. angle_angle(1)
  lines.push(`${val('extractorAngleOfAttack')}    !angle_angle(1)`)
  // 18. angle_angle(2)
  lines.push(`${val('extractorCuttingAngle')}    !angle_angle(2)`)
  // 19. angle_angle(3)
  lines.push(`${val('extractorTaperAngle')}    !angle_angle(3)`)
  // 20. hs 取料腔高度的一半
  const fullHeight = val('extractionChamberHeight')
  lines.push(`${fullHeight / 2}    !hs取料腔高度的一半`)
  // 21. holedia_p
  const holeDia = val('enrichedBaffleHoleDiameter')
  lines.push(`${holeDia}    !holedia_p`)
  // 22. sigma_p 单孔面积
  const sigmaP = holeDia > 0 ? Math.PI * (holeDia / 2) ** 2 : 0
  lines.push(`${sigmaP}    !sigma_p精料挡板孔的面积(单个)`)
  // 23. ka 参数k（未知，置 0）
  lines.push(`0    !ka最大流量公式对应的值域与气体料类有关的参数k`)
  // 24. rk_p 精料挡板孔的中心距
  lines.push(`${val('enrichedBaffleHoleDistributionCircleDiameter')}    !rk_p精料挡板空的中心距`)
  // 25. Ma_x 孔板气体马赫数
  lines.push(`0    !Ma_x孔板气体马赫数`)
  // 26. w_prot
  lines.push(`0    !w_prot`)
  // 27. cpipe1
  lines.push(`0    !cpipe1`)
  // 28. pws
  lines.push(`0    !pws`)

  return lines.join('\n')
}

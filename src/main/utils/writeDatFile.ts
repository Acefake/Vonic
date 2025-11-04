import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'

/**
 * 根据传入的参数和值生成input.dat
 * @param designData 设计数据对象，将被序列化写入文件
 * 生产环境：在同级目录生成 input.dat 文件
 * 开发环境：在项目根目录的testFile文件夹生成 input.dat 文件
 * @returns res 写入成功返回 true，失败返回 false
 */
export function writeDatFile(designData: any): { code: number, message: string, filePath: string } {
  try {
    // 与 readFileData 保持一致的开发环境判断：以项目根目录是否存在 testFile 目录为准
    const isDev = fs.existsSync(path.join(process.cwd(), 'testFile'))

    let targetDir: string
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

    // 确保目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const filePath = path.join(targetDir, 'input.dat')

    // 构建符合 Fortran 程序要求的 input.dat 内容
    const content = buildInputDatContent(designData)

    fs.writeFileSync(filePath, content, 'utf8')

    return {
      code: 200,
      message: 'input.dat文件写入成功',
      filePath,
    }
  }
  catch (error) {
    return {
      code: 500,
      message: `input.dat文件写入失败:${error}`,
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

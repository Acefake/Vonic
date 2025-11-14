import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 供料方式类型 - 使用数值类型
 */
export type FeedingMethod = 0 | 1

/**
 * 供料方式映射
 */
export const FEEDING_METHOD_MAP = [
  { label: '点供料', value: 0 },
  { label: '均匀供料', value: 1 },
]

/**
 * 扁平化的设计表单字段接口
 * 将原来的顶层参数/运行参数/驱动参数/分离部件四个分组合并为一个对象
 */
export interface DesignFormData {
  // 顶层参数
  angularVelocity?: number
  rotorRadius?: number
  rotorShoulderLength?: number
  // 运行参数
  rotorSidewallPressure?: number
  gasDiffusionCoefficient?: number
  feedFlowRate?: number
  feedingMethod: FeedingMethod
  splitRatio?: number
  // 驱动参数
  depletedEndCapTemperature?: number
  enrichedEndCapTemperature?: number
  feedAxialDisturbance?: number
  feedAngularDisturbance?: number
  depletedMechanicalDriveAmount?: number
  // 分离部件
  extractionChamberHeight?: number
  enrichedBaffleHoleDiameter?: number
  feedBoxShockDiskHeight?: number
  depletedExtractionArmRadius?: number
  depletedExtractionPortInnerDiameter?: number
  depletedBaffleInnerHoleOuterDiameter?: number
  enrichedBaffleHoleDistributionCircleDiameter?: number
  depletedExtractionPortOuterDiameter?: number
  depletedBaffleOuterHoleInnerDiameter?: number
  minAxialDistance?: number
  depletedBaffleAxialPosition?: number
  depletedBaffleOuterHoleOuterDiameter?: number
  innerBoundaryMirrorPosition?: number
  gridGenerationMethod?: number
  bwgRadialProtrusionHeight?: number
  bwgAxialHeight?: number
  bwgAxialPosition?: number
  radialGridRatio?: number
  compensationCoefficient?: number
  streamlineData?: number
}

/**
 * 输出结果接口
 */
export interface OutputResults {
  /** 分离功率 (W) */
  sepPower?: number
  /** 分离系数 */
  sepFactor?: number
}

/**
 * 设计方案完整接口
 */
export interface DesignScheme {
  /** 是否多方案 */
  isMultiScheme: boolean
  /** 扁平化的表单数据 */
  formData: DesignFormData
  /** 输出结果 */
  outputResults: OutputResults
}

/**
 * 方案设计 Store
 * 通过 syncPlugin 自动实现多窗口同步
 */
export const useDesignStore = defineStore('design', () => {
  /** 是否多方案 */
  const isMultiScheme = ref<boolean>(false)

  /** 扁平化的表单数据 */
  const formData = ref<DesignFormData>({
    // 顶层参数
    angularVelocity: undefined,
    rotorRadius: undefined,
    rotorShoulderLength: undefined,
    // 运行参数
    rotorSidewallPressure: undefined,
    gasDiffusionCoefficient: undefined,
    feedFlowRate: undefined,
    feedingMethod: 0,
    splitRatio: undefined,
    // 驱动参数
    depletedEndCapTemperature: undefined,
    enrichedEndCapTemperature: undefined,
    feedAxialDisturbance: undefined,
    feedAngularDisturbance: undefined,
    depletedMechanicalDriveAmount: undefined,
    // 分离部件
    extractionChamberHeight: undefined,
    enrichedBaffleHoleDiameter: undefined,
    feedBoxShockDiskHeight: undefined,
    depletedExtractionArmRadius: undefined,
    depletedExtractionPortInnerDiameter: undefined,
    depletedBaffleInnerHoleOuterDiameter: undefined,
    enrichedBaffleHoleDistributionCircleDiameter: undefined,
    depletedExtractionPortOuterDiameter: undefined,
    depletedBaffleOuterHoleInnerDiameter: undefined,
    minAxialDistance: undefined,
    depletedBaffleAxialPosition: undefined,
    depletedBaffleOuterHoleOuterDiameter: undefined,
    innerBoundaryMirrorPosition: undefined,
    gridGenerationMethod: undefined,
    bwgRadialProtrusionHeight: undefined,
    bwgAxialHeight: undefined,
    bwgAxialPosition: undefined,
    radialGridRatio: undefined,
    compensationCoefficient: undefined,
    streamlineData: undefined,
  })

  /** 输出结果 */
  const outputResults = ref<OutputResults>({
    sepPower: undefined,
    sepFactor: undefined,
  })

  /**
   * 获取完整的设计方案
   */
  const getDesignScheme = computed((): DesignScheme => ({
    isMultiScheme: isMultiScheme.value,
    formData: formData.value,
    outputResults: outputResults.value,
  }))

  /**
   * 检查表单是否完整
   * 只检查必需的字段，不包括输出结果和可选字段
   */
  function isFormValid(): boolean {
    // 必需的顶层参数 - 使用文件字段名
    const requiredTopLevel = ['DegSpeed', 'RotorRadius', 'RotorLength'] as const
    const topLevelValid = requiredTopLevel.every(key => formData.value[key] !== undefined && formData.value[key] !== null)

    // 必需的运行参数 - 使用文件字段名（FeedMethod 有默认值，不需要检查）
    const requiredOperating = ['RotorPressure', 'GasParam', 'FeedFlow', 'SplitRatio'] as const
    const operatingValid = requiredOperating.every(key => formData.value[key] !== undefined && formData.value[key] !== null)

    // 必需的驱动参数 - 使用文件字段名
    const requiredDriving = [
      'PoorCoverTemp',
      'RichCoverTemp',
      'FeedAxialDist',
      'FeedDegDist',
      'PoorDrive',
    ] as const
    const drivingValid = requiredDriving.every(key => formData.value[key] !== undefined && formData.value[key] !== null)

    // 必需的分离部件参数 - 使用文件字段名（排除可选字段）
    const requiredSeparation = [
      'TackHeight',
      'RichBaffleHoleDiam',
      'FeedBoxHeight',
      'PoorArmRadius',
      'PoorTackInnerRadius',
      'PoorBaffleInnerHoleOuterRadius',
      'RichBaffleArrayHoleDiam',
      'PoorTackOuterRadius',
      'PoorBaffleOuterHoleInnerRadius',
      'FeedBoxAndPoorInterval',
      'PoorBaffleAxialSpace',
      'PoorBaffleOuterHoleOuterRadius',
    ] as const
    const separationValid = requiredSeparation.every(key => formData.value[key] !== undefined && formData.value[key] !== null)

    return topLevelValid && operatingValid && drivingValid && separationValid
  }

  /**
   * 设置是否多方案
   */
  function setIsMultiScheme(value: boolean): void {
    isMultiScheme.value = value
  }

  /**
   * 更新顶层参数
   */
  /**
   * 更新扁平化表单字段
   */
  function updateFormData(params: Partial<DesignFormData>): void {
    formData.value = { ...formData.value, ...params }
  }

  /**
   * 更新输出结果
   */
  function updateOutputResults(results: Partial<OutputResults>): void {
    outputResults.value = { ...outputResults.value, ...results }
  }

  /**
   * 设置完整的设计方案
   */
  function setDesignScheme(scheme: DesignScheme): void {
    isMultiScheme.value = scheme.isMultiScheme
    formData.value = { ...scheme.formData }
    outputResults.value = { ...scheme.outputResults }
  }

  /**
   * 重置所有数据
   */
  function reset(): void {
    isMultiScheme.value = true
    formData.value = {
      // 顶层参数
      angularVelocity: undefined,
      rotorRadius: undefined,
      rotorShoulderLength: undefined,
      // 运行参数
      rotorSidewallPressure: undefined,
      gasDiffusionCoefficient: undefined,
      feedFlowRate: undefined,
      feedingMethod: 0,
      splitRatio: undefined,
      // 驱动参数
      depletedEndCapTemperature: undefined,
      enrichedEndCapTemperature: undefined,
      feedAxialDisturbance: undefined,
      feedAngularDisturbance: undefined,
      depletedMechanicalDriveAmount: undefined,
      // 分离部件
      extractionChamberHeight: undefined,
      enrichedBaffleHoleDiameter: undefined,
      feedBoxShockDiskHeight: undefined,
      depletedExtractionArmRadius: undefined,
      depletedExtractionPortInnerDiameter: undefined,
      depletedBaffleInnerHoleOuterDiameter: undefined,
      enrichedBaffleHoleDistributionCircleDiameter: undefined,
      depletedExtractionPortOuterDiameter: undefined,
      depletedBaffleOuterHoleInnerDiameter: undefined,
      minAxialDistance: undefined,
      depletedBaffleAxialPosition: undefined,
      depletedBaffleOuterHoleOuterDiameter: undefined,
      innerBoundaryMirrorPosition: undefined,
      gridGenerationMethod: undefined,
      bwgRadialProtrusionHeight: undefined,
      bwgAxialHeight: undefined,
      bwgAxialPosition: undefined,
      radialGridRatio: undefined,
      compensationCoefficient: undefined,
      streamlineData: undefined,
    }
    outputResults.value = {
      sepPower: undefined,
      sepFactor: undefined,
    }
  }

  return {
    // 状态
    isMultiScheme,
    formData,
    outputResults,

    // 计算属性
    getDesignScheme,
    isFormValid,

    // 方法
    setIsMultiScheme,
    updateFormData,
    updateOutputResults,
    setDesignScheme,
    reset,
  }
}, {
  persist: {
    key: 'design-store',
    storage: sessionStorage,
  },
})

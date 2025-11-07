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
 * 顶层参数接口
 */
export interface TopLevelParams {
  /** 角速度 (Hz) */
  angularVelocity?: number
  /** 转子半径 (mm) */
  rotorRadius?: number
  /** 转子两肩长 (mm) */
  rotorShoulderLength?: number
}

/**
 * 运行参数接口
 */
export interface OperatingParams {
  /** 转子侧壁压强 (Pa) */
  rotorSidewallPressure?: number
  /** 气体扩散系数 */
  gasDiffusionCoefficient?: number
  /** 供料流量 (Kg/s) */
  feedFlowRate?: number
  /** 供料方式 */
  feedingMethod: FeedingMethod
  /** 分流比 */
  splitRatio?: number
}

/**
 * 驱动参数接口
 */
export interface DrivingParams {
  /** 贫料端盖温度 (K) */
  depletedEndCapTemperature?: number
  /** 精料端盖温度 (K) */
  enrichedEndCapTemperature?: number
  /** 供料轴向扰动 (mm) */
  feedAxialDisturbance?: number
  /** 供料角向扰动 (mm) */
  feedAngularDisturbance?: number
  /** 贫料机械驱动量 (mm) */
  depletedMechanicalDriveAmount?: number
}

/**
 * 分离部件接口
 */
export interface SeparationComponents {
  /** 取料腔高度 (mm) */
  extractionChamberHeight?: number
  /** 精挡板孔直径 (mm) */
  enrichedBaffleHoleDiameter?: number
  /** 供料箱激波盘高度 (mm) */
  feedBoxShockDiskHeight?: number
  /** 贫料取料支臂半径 (mm) */
  depletedExtractionArmRadius?: number
  /** 贫取料口部内径 (mm) */
  depletedExtractionPortInnerDiameter?: number
  /** 贫料挡板内孔外径 (mm) */
  depletedBaffleInnerHoleOuterDiameter?: number
  /** 精挡板孔分布圆直径 (mm) */
  enrichedBaffleHoleDistributionCircleDiameter?: number
  /** 贫取料口部外径 (mm) */
  depletedExtractionPortOuterDiameter?: number
  /** 贫料挡板外孔内径 (mm) */
  depletedBaffleOuterHoleInnerDiameter?: number
  /** 供料箱与贫取料器最近轴向间距 (mm) */
  minAxialDistance?: number
  /** 贫料挡板轴向位置 (mm) */
  depletedBaffleAxialPosition?: number
  /** 贫料挡板外孔外径 (mm) */
  depletedBaffleOuterHoleOuterDiameter?: number
}

/**
 * 输出结果接口
 */
export interface OutputResults {
  /** 分离功率 (W) */
  separationPower?: number
  /** 分离系数 */
  separationFactor?: number
}

/**
 * 设计方案完整接口
 */
export interface DesignScheme {
  /** 是否多方案 */
  isMultiScheme: boolean
  /** 顶层参数 */
  topLevelParams: TopLevelParams
  /** 运行参数 */
  operatingParams: OperatingParams
  /** 驱动参数 */
  drivingParams: DrivingParams
  /** 分离部件 */
  separationComponents: SeparationComponents
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

  /** 顶层参数 */
  const topLevelParams = ref<TopLevelParams>({
    angularVelocity: undefined,
    rotorRadius: undefined,
    rotorShoulderLength: undefined,
  })

  /** 运行参数 */
  const operatingParams = ref<OperatingParams>({
    rotorSidewallPressure: undefined,
    gasDiffusionCoefficient: undefined,
    feedFlowRate: undefined,
    feedingMethod: 0,
    splitRatio: undefined,
  })

  /** 驱动参数 */
  const drivingParams = ref<DrivingParams>({
    depletedEndCapTemperature: undefined,
    enrichedEndCapTemperature: undefined,
    feedAxialDisturbance: undefined,
    feedAngularDisturbance: undefined,
    depletedMechanicalDriveAmount: undefined,
  })

  /** 分离部件 */
  const separationComponents = ref<SeparationComponents>({
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
  })

  /** 输出结果 */
  const outputResults = ref<OutputResults>({
    separationPower: undefined,
    separationFactor: undefined,
  })

  /**
   * 获取完整的设计方案
   */
  const getDesignScheme = computed((): DesignScheme => ({
    isMultiScheme: isMultiScheme.value,
    topLevelParams: topLevelParams.value,
    operatingParams: operatingParams.value,
    drivingParams: drivingParams.value,
    separationComponents: separationComponents.value,
    outputResults: outputResults.value,
  }))

  /**
   * 检查表单是否完整
   */
  const isFormValid = computed((): boolean => {
    // 所有参数都已填写，且没有未填写的参数
    return Object.values(topLevelParams.value).every(value => value !== undefined)
      && Object.values(operatingParams.value).every(value => value !== undefined)
      && Object.values(drivingParams.value).every(value => value !== undefined)
      && Object.values(separationComponents.value).every(value => value !== undefined)
      && Object.values(outputResults.value).every(value => value !== undefined)
  })

  /**
   * 设置是否多方案
   */
  function setIsMultiScheme(value: boolean): void {
    isMultiScheme.value = value
  }

  /**
   * 更新顶层参数
   */
  function updateTopLevelParams(params: Partial<TopLevelParams>): void {
    topLevelParams.value = { ...topLevelParams.value, ...params }
  }

  /**
   * 更新运行参数
   */
  function updateOperatingParams(params: Partial<OperatingParams>): void {
    operatingParams.value = { ...operatingParams.value, ...params }
  }

  /**
   * 更新驱动参数
   */
  function updateDrivingParams(params: Partial<DrivingParams>): void {
    drivingParams.value = { ...drivingParams.value, ...params }
  }

  /**
   * 更新分离部件
   */
  function updateSeparationComponents(params: Partial<SeparationComponents>): void {
    separationComponents.value = { ...separationComponents.value, ...params }
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
    topLevelParams.value = { ...scheme.topLevelParams }
    operatingParams.value = { ...scheme.operatingParams }
    drivingParams.value = { ...scheme.drivingParams }
    separationComponents.value = { ...scheme.separationComponents }
    outputResults.value = { ...scheme.outputResults }
  }

  /**
   * 重置所有数据
   */
  function reset(): void {
    isMultiScheme.value = true
    topLevelParams.value = {
      angularVelocity: undefined,
      rotorRadius: undefined,
      rotorShoulderLength: undefined,
    }
    operatingParams.value = {
      rotorSidewallPressure: undefined,
      gasDiffusionCoefficient: undefined,
      feedFlowRate: undefined,
      feedingMethod: 0,
      splitRatio: undefined,
    }
    drivingParams.value = {
      depletedEndCapTemperature: undefined,
      enrichedEndCapTemperature: undefined,
      feedAxialDisturbance: undefined,
      feedAngularDisturbance: undefined,
      depletedMechanicalDriveAmount: undefined,
    }
    separationComponents.value = {
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
    }
    outputResults.value = {
      separationPower: undefined,
      separationFactor: undefined,
    }
  }

  return {
    // 状态
    isMultiScheme,
    topLevelParams,
    operatingParams,
    drivingParams,
    separationComponents,
    outputResults,

    // 计算属性
    getDesignScheme,
    isFormValid,

    // 方法
    setIsMultiScheme,
    updateTopLevelParams,
    updateOperatingParams,
    updateDrivingParams,
    updateSeparationComponents,
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

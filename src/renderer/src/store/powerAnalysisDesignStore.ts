import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface PowerAnalysisFormData {
  // 顶层参数

  /** 角速度 (Hz) */
  angularVelocity?: number
  /** 转子半径 (m) */
  rotorRadius?: number

  // 流体参数

  /** 平均温度 (K) */
  averageTemperature?: number
  /** 富集区温度 (K) */
  enrichedBaffleTemperature?: number
  /** 流量 (m^3/s) */
  feedFlowRate?: number
  /** 转子侧壁压力 (Pa) */
  rotorSidewallPressure?: number

  // 分离部件

  /** 贫取料器内径 (m) */
  depletedExtractionPortInnerDiameter?: number
  /** 贫取料器外径 (m) */
  depletedExtractionPortOuterDiameter?: number
  /** 贫取料器根外径 (m) */
  depletedExtractionRootOuterDiameter?: number
  extractorAngleOfAttack?: number
  /** 取料腔高度 (m) */
  extractionChamberHeight?: number
  /** 贫取料器中心距离 (m) */
  depletedExtractionCenterDistance?: number
  /** 富集区中心距离 (m) */
  enrichedExtractionCenterDistance?: number
  /** 常数段直管长度 (m) */
  constantSectionStraightPipeLength?: number
  /** 取料器切割角度 (°) */
  extractorCuttingAngle?: number
  /** 富集区隔板孔径 (m) */
  enrichedBaffleHoleDiameter?: number
  /** 变数段直管长度 (m) */
  variableSectionStraightPipeLength?: number
  /** 弯曲半径 (m) */
  bendRadiusOfCurvature?: number
  /** 取料器表面粗糙度 (m) */
  extractorSurfaceRoughness?: number
  /** 取料器锥角 (°) */
  extractorTaperAngle?: number
  /** 富集区隔板孔分布圆直径 (m) */
  enrichedBaffleHoleDistributionCircleDiameter?: number
}

/**
 * 功率分析输出结果接口
 */
export interface PowerAnalysisOutputResults {
  /** 贫取料器功耗 (W) */
  poorTackPower?: number
  /** 取料器总功耗 (W) */
  tackPower?: number
}

/**
 * 功率分析设计方案完整接口
 */
export interface PowerAnalysisDesignScheme {
  /** 是否多方案 */
  isMultiScheme: boolean
  /** 扁平化的表单数据 */
  formData: PowerAnalysisFormData
  /** 输出结果 */
  outputResults: PowerAnalysisOutputResults
}

/**
 * 功率分析方案设计 Store
 * 独立于 mPhysSim 的设计 Store，确保两个产品互不影响
 */
export const usePowerAnalysisDesignStore = defineStore('powerAnalysisDesign', () => {
  /** 是否多方案 */
  const isMultiScheme = ref<boolean>(false)

  /** 表单数据 */
  const formData = ref<PowerAnalysisFormData>({
    angularVelocity: undefined,
    rotorRadius: undefined,
    averageTemperature: undefined,
    enrichedBaffleTemperature: undefined,
    feedFlowRate: undefined,
    rotorSidewallPressure: undefined,
    depletedExtractionPortInnerDiameter: undefined,
    depletedExtractionPortOuterDiameter: undefined,
    depletedExtractionRootOuterDiameter: undefined,
    extractorAngleOfAttack: undefined,
    extractionChamberHeight: undefined,
    depletedExtractionCenterDistance: undefined,
    enrichedExtractionCenterDistance: undefined,
    constantSectionStraightPipeLength: undefined,
    extractorCuttingAngle: undefined,
    enrichedBaffleHoleDiameter: undefined,
    variableSectionStraightPipeLength: undefined,
    bendRadiusOfCurvature: undefined,
    extractorSurfaceRoughness: undefined,
    extractorTaperAngle: undefined,
    enrichedBaffleHoleDistributionCircleDiameter: undefined,
  })

  /** 输出结果 */
  const outputResults = ref<PowerAnalysisOutputResults>({
    poorTackPower: undefined,
    tackPower: undefined,
  })

  /**
   * 获取完整的设计方案
   */
  const getDesignScheme = computed((): PowerAnalysisDesignScheme => ({
    isMultiScheme: isMultiScheme.value,
    formData: formData.value,
    outputResults: outputResults.value,
  }))

  /**
   * 检查表单是否完整
   */
  const isFormValid = (): boolean => {
    // 必填字段校验
    const requiredFields: Array<keyof PowerAnalysisFormData> = [
      'angularVelocity',
      'rotorRadius',
      'averageTemperature',
      'enrichedBaffleTemperature',
      'feedFlowRate',
      'rotorSidewallPressure',
      'depletedExtractionPortInnerDiameter',
      'depletedExtractionPortOuterDiameter',
      'depletedExtractionRootOuterDiameter',
      'extractorAngleOfAttack',
      'extractionChamberHeight',
      'depletedExtractionCenterDistance',
      'enrichedExtractionCenterDistance',
      'constantSectionStraightPipeLength',
      'extractorCuttingAngle',
      'enrichedBaffleHoleDiameter',
      'variableSectionStraightPipeLength',
      'bendRadiusOfCurvature',
      'extractorSurfaceRoughness',
      'extractorTaperAngle',
      'enrichedBaffleHoleDistributionCircleDiameter',
    ]

    return requiredFields.every(
      key => formData.value[key] !== undefined && formData.value[key] !== null,
    )
  }

  /**
   * 设置是否多方案
   */
  function setIsMultiScheme(value: boolean): void {
    isMultiScheme.value = value
  }

  /**
   * 更新表单数据
   */
  function updateFormData(params: Partial<PowerAnalysisFormData>): void {
    formData.value = { ...formData.value, ...params }
  }

  /**
   * 更新输出结果
   */
  function updateOutputResults(results: Partial<PowerAnalysisOutputResults>): void {
    outputResults.value = { ...outputResults.value, ...results }
  }

  /**
   * 设置完整的设计方案
   */
  function setDesignScheme(scheme: PowerAnalysisDesignScheme): void {
    isMultiScheme.value = scheme.isMultiScheme
    formData.value = { ...scheme.formData }
    outputResults.value = { ...scheme.outputResults }
  }

  /**
   * 重置所有数据
   */
  function reset(): void {
    isMultiScheme.value = false
    formData.value = {
      angularVelocity: undefined,
      rotorRadius: undefined,
      averageTemperature: undefined,
      enrichedBaffleTemperature: undefined,
      feedFlowRate: undefined,
      rotorSidewallPressure: undefined,
      depletedExtractionPortInnerDiameter: undefined,
      depletedExtractionPortOuterDiameter: undefined,
      depletedExtractionRootOuterDiameter: undefined,
      extractorAngleOfAttack: undefined,
      extractionChamberHeight: undefined,
      depletedExtractionCenterDistance: undefined,
      enrichedExtractionCenterDistance: undefined,
      constantSectionStraightPipeLength: undefined,
      extractorCuttingAngle: undefined,
      enrichedBaffleHoleDiameter: undefined,
      variableSectionStraightPipeLength: undefined,
      bendRadiusOfCurvature: undefined,
      extractorSurfaceRoughness: undefined,
      extractorTaperAngle: undefined,
      enrichedBaffleHoleDistributionCircleDiameter: undefined,
    }
    outputResults.value = {
      poorTackPower: undefined,
      tackPower: undefined,
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
    key: 'power-analysis-design-store',
    storage: sessionStorage,
  },
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 功率分析-扁平化设计表单数据
 * 合并顶层参数、流体参数、分离部件为一个对象
 */
export interface PowerAnalysisFormData {
  // 顶层参数
  angularVelocity?: number
  rotorRadius?: number

  // 流体参数
  averageTemperature?: number
  enrichedBaffleTemperature?: number
  feedFlowRate?: number
  rotorSidewallPressure?: number

  // 分离部件
  depletedExtractionPortInnerDiameter?: number
  depletedExtractionPortOuterDiameter?: number
  depletedExtractionRootOuterDiameter?: number
  extractorAngleOfAttack?: number
  extractionChamberHeight?: number
  depletedExtractionCenterDistance?: number
  enrichedExtractionCenterDistance?: number
  constantSectionStraightPipeLength?: number
  extractorCuttingAngle?: number
  enrichedBaffleHoleDiameter?: number
  variableSectionStraightPipeLength?: number
  bendRadiusOfCurvature?: number
  extractorSurfaceRoughness?: number
  extractorTaperAngle?: number
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

  /** 扁平化的表单数据 */
  const formData = ref<PowerAnalysisFormData>({
    // 顶层参数
    angularVelocity: undefined,
    rotorRadius: undefined,
    // 流体参数
    averageTemperature: undefined,
    enrichedBaffleTemperature: undefined,
    feedFlowRate: undefined,
    rotorSidewallPressure: undefined,
    // 分离部件
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
  const isFormValid = computed((): boolean => {
    // 这里可以根据业务需求添加验证逻辑
    return true
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
  /**
   * 更新扁平化的表单字段
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
      // 顶层参数
      angularVelocity: undefined,
      rotorRadius: undefined,
      // 流体参数
      averageTemperature: undefined,
      enrichedBaffleTemperature: undefined,
      feedFlowRate: undefined,
      rotorSidewallPressure: undefined,
      // 分离部件
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

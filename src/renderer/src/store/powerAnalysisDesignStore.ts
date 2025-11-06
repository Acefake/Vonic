import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 功率分析顶层参数接口
 */
export interface PowerAnalysisTopLevelParams {
  /** 角速度 (Hz) */
  angularVelocity?: number
  /** 转子半径 (mm) */
  rotorRadius?: number
}

/**
 * 功率分析流体参数接口
 */
export interface PowerAnalysisFluidParams {
  /** 平均温度 (K) */
  averageTemperature?: number
  /** 精料挡板温度 (K) */
  enrichedBaffleTemperature?: number
  /** 供料流量 (Kg/s) */
  feedFlowRate?: number
  /** 转子侧壁压强 (Pa) */
  rotorSidewallPressure?: number
}

/**
 * 功率分析分离部件接口
 */
export interface PowerAnalysisSeparationComponents {
  /** 贫取料口部内径 (mm) */
  depletedExtractionPortInnerDiameter?: number
  /** 贫取料口部外径 (mm) */
  depletedExtractionPortOuterDiameter?: number
  /** 贫取料根部外径 (mm) */
  depletedExtractionRootOuterDiameter?: number
  /** 取料器攻角 (rad) */
  extractorAngleOfAttack?: number
  /** 取料腔高度 (mm) */
  extractionChamberHeight?: number
  /** 贫取料中心距 (mm) */
  depletedExtractionCenterDistance?: number
  /** 精取料中心距 (mm) */
  enrichedExtractionCenterDistance?: number
  /** 等截面直管段长度 (mm) */
  constantSectionStraightPipeLength?: number
  /** 取料器切角 (rad) */
  extractorCuttingAngle?: number
  /** 精挡板孔直径 (mm) */
  enrichedBaffleHoleDiameter?: number
  /** 变截面直管段长度 (mm) */
  variableSectionStraightPipeLength?: number
  /** 弯管弧度半径 (mm) */
  bendRadiusOfCurvature?: number
  /** 取料器表面粗糙度 (mm) */
  extractorSurfaceRoughness?: number
  /** 取料器锥角 (rad) */
  extractorTaperAngle?: number
  /** 精挡板孔分布圆直径 (mm) */
  enrichedBaffleHoleDistributionCircleDiameter?: number
}

/**
 * 功率分析输出结果接口
 */
export interface PowerAnalysisOutputResults {
  /** 贫取料器功耗 (W) */
  depletedExtractorPowerConsumption?: number
  /** 取料器总功耗 (W) */
  totalExtractorPowerConsumption?: number
}

/**
 * 功率分析设计方案完整接口
 */
export interface PowerAnalysisDesignScheme {
  /** 是否多方案 */
  isMultiScheme: boolean
  /** 顶层参数 */
  topLevelParams: PowerAnalysisTopLevelParams
  /** 流体参数 */
  fluidParams: PowerAnalysisFluidParams
  /** 分离部件 */
  separationComponents: PowerAnalysisSeparationComponents
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

  /** 顶层参数 */
  const topLevelParams = ref<PowerAnalysisTopLevelParams>({
    angularVelocity: undefined,
    rotorRadius: undefined,
  })

  /** 流体参数 */
  const fluidParams = ref<PowerAnalysisFluidParams>({
    averageTemperature: undefined,
    enrichedBaffleTemperature: undefined,
    feedFlowRate: undefined,
    rotorSidewallPressure: undefined,
  })

  /** 分离部件 */
  const separationComponents = ref<PowerAnalysisSeparationComponents>({
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
    depletedExtractorPowerConsumption: undefined,
    totalExtractorPowerConsumption: undefined,
  })

  /**
   * 获取完整的设计方案
   */
  const getDesignScheme = computed((): PowerAnalysisDesignScheme => ({
    isMultiScheme: isMultiScheme.value,
    topLevelParams: topLevelParams.value,
    fluidParams: fluidParams.value,
    separationComponents: separationComponents.value,
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
  function updateTopLevelParams(params: Partial<PowerAnalysisTopLevelParams>): void {
    topLevelParams.value = { ...topLevelParams.value, ...params }
  }

  /**
   * 更新流体参数
   */
  function updateFluidParams(params: Partial<PowerAnalysisFluidParams>): void {
    fluidParams.value = { ...fluidParams.value, ...params }
  }

  /**
   * 更新分离部件
   */
  function updateSeparationComponents(params: Partial<PowerAnalysisSeparationComponents>): void {
    separationComponents.value = { ...separationComponents.value, ...params }
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
    topLevelParams.value = { ...scheme.topLevelParams }
    fluidParams.value = { ...scheme.fluidParams }
    separationComponents.value = { ...scheme.separationComponents }
    outputResults.value = { ...scheme.outputResults }
  }

  /**
   * 重置所有数据
   */
  function reset(): void {
    isMultiScheme.value = false
    topLevelParams.value = {
      angularVelocity: undefined,
      rotorRadius: undefined,
    }
    fluidParams.value = {
      averageTemperature: undefined,
      enrichedBaffleTemperature: undefined,
      feedFlowRate: undefined,
      rotorSidewallPressure: undefined,
    }
    separationComponents.value = {
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
      depletedExtractorPowerConsumption: undefined,
      totalExtractorPowerConsumption: undefined,
    }
  }

  return {
    // 状态
    isMultiScheme,
    topLevelParams,
    fluidParams,
    separationComponents,
    outputResults,

    // 计算属性
    getDesignScheme,
    isFormValid,

    // 方法
    setIsMultiScheme,
    updateTopLevelParams,
    updateFluidParams,
    updateSeparationComponents,
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

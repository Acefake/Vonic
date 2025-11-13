import type { powerAnalysisConfigFormModel } from '../../../shared/form-model'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { powerAnalysisFields } from '../../../shared/form-model'

// 前端表单数据类型 - 直接使用文件字段名，所有字段可选
export type PowerAnalysisFormData = Partial<powerAnalysisConfigFormModel>

// 获取所有 PowerAnalysis 字段的键名
export const powerAnalysisFormFields = powerAnalysisFields

// 创建空的表单数据对象
function createEmptyFormData(): PowerAnalysisFormData {
  const emptyData: PowerAnalysisFormData = {}
  powerAnalysisFormFields.forEach((field) => {
    emptyData[field] = undefined
  })
  return emptyData
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
  const formData = ref<PowerAnalysisFormData>(createEmptyFormData())

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
    // 使用统一映射的字段作为必填字段
    const requiredFields = powerAnalysisFormFields

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
    formData.value = createEmptyFormData()
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

import type { mPhysSimConfigFormModel } from '../../../shared/form-model'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mPhysSimFields } from '../../../shared/form-model'

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

// 前端表单数据类型 - 直接使用文件字段名，所有字段可选
export type MPhysSimFormData = Partial<mPhysSimConfigFormModel>

// 获取所有 mPhysSim 字段的键名
export const mPhysSimFormFields = mPhysSimFields

// 创建空的表单数据对象
function createEmptyFormData(): MPhysSimFormData {
  const emptyData: MPhysSimFormData = {}
  mPhysSimFormFields.forEach((field) => {
    emptyData[field] = undefined
  })
  return emptyData
}

/**
 * 多物理场数值模拟仿真计算输出结果接口
 */
export interface MPhysSimOutputResults {
  /** 分离功率 (W) */
  sepPower?: number
  /** 分离系数 */
  sepFactor?: number
}

/**
 * 多物理场数值模拟仿真计算设计方案完整接口
 */
export interface MPhysSimDesignScheme {
  /** 是否多方案 */
  isMultiScheme: boolean
  /** 扁平化的表单数据 */
  formData: MPhysSimFormData
  /** 输出结果 */
  outputResults: MPhysSimOutputResults
}

/**
 * 多物理场数值模拟仿真计算方案设计 Store
 * 独立于 PowerAnalysis 的设计 Store，确保两个产品互不影响
 */
export const useMPhysSimDesignStore = defineStore('mPhysSimDesign', () => {
  /** 是否多方案 */
  const isMultiScheme = ref<boolean>(false)

  /** 表单数据 */
  const formData = ref<MPhysSimFormData>(createEmptyFormData())

  /** 输出结果 */
  const outputResults = ref<MPhysSimOutputResults>({
    sepPower: undefined,
    sepFactor: undefined,
  })

  /**
   * 获取完整的设计方案
   */
  const getDesignScheme = computed((): MPhysSimDesignScheme => ({
    isMultiScheme: isMultiScheme.value,
    formData: formData.value,
    outputResults: outputResults.value,
  }))

  /**
   * 检查表单是否完整
   */
  const isFormValid = (): boolean => {
    // 只检查核心必需字段，不包括可选字段
    const requiredFields: Array<keyof MPhysSimFormData> = [
      'DegSpeed',
      'RotorRadius',
      'RotorLength',
      'RotorPressure',
      'GasParam',
      'FeedFlow',
      'SplitRatio',
      'PoorCoverTemp',
      'RichCoverTemp',
      'TackHeight',
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
  function updateFormData(params: Partial<MPhysSimFormData>): void {
    formData.value = { ...formData.value, ...params }
  }

  /**
   * 更新输出结果
   */
  function updateOutputResults(results: Partial<MPhysSimOutputResults>): void {
    outputResults.value = { ...outputResults.value, ...results }
  }

  /**
   * 设置完整的设计方案
   */
  function setDesignScheme(scheme: MPhysSimDesignScheme): void {
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
    key: 'mphys-sim-design-store',
    storage: sessionStorage,
  },
})

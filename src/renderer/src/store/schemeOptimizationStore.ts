import type { DesignFactor, SampleData } from '../views/SchemeOptimization/type'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useSchemeOptimizationStore = defineStore('schemeOptimization', () => {
  /** 设计因子列表 */
  const designFactors = ref<DesignFactor[]>([])

  /** 样本空间数据 */
  const sampleSpaceData = ref<SampleData[]>([])

  /** 当前优化算法 */
  const optimizationAlgorithm = ref<'NSGA-II' | 'MOPSO'>('NSGA-II')

  /** 样本点数（NSGA-II使用）或默认值 */
  const samplePointCount = ref<number>(50)

  /** 采样准则（NSGA-II使用） */
  const samplingCriterion = ref<string>('center')

  /** 获取设计因子列表 */
  const getDesignFactor = computed(() => designFactors.value)

  /** 获取样本空间数据 */
  const getSampleSpaceData = computed(() => sampleSpaceData.value)

  /** 因子数量（由设计因子长度推导） */
  const factorCount = computed(() => designFactors.value.length)

  /** 设置算法并做必要的状态重置 */
  function setAlgorithm(algo: 'NSGA-II' | 'MOPSO') {
    optimizationAlgorithm.value = algo
    // 切换算法后，清空设计因子，避免不同算法的参数互相污染
    designFactors.value = []
    // 同时清空样本空间，避免残留旧数据与新算法/新因子不一致
    sampleSpaceData.value = []
    // 切换到 MOPSO 时，样本点数使用默认 50
    if (algo === 'MOPSO') {
      samplePointCount.value = 50
    }
  }

  /** 设置设计因子列表 */
  function setDesignFactors(list: DesignFactor[]) {
    designFactors.value = list
  }

  /** 更新指定设计因子（按 id） */
  function updateDesignFactorById(id: number, patch: Partial<DesignFactor>) {
    const idx = designFactors.value.findIndex(f => f.id === id)
    if (idx !== -1) {
      designFactors.value[idx] = { ...designFactors.value[idx], ...patch }
    }
  }

  /** 设置样本空间数据 */
  function setSampleSpaceData(list: SampleData[]) {
    sampleSpaceData.value = list
  }

  /** 清空样本空间数据 */
  function clearSampleSpace() {
    sampleSpaceData.value = []
  }

  return {
    designFactors,
    sampleSpaceData,
    optimizationAlgorithm,
    samplePointCount,
    samplingCriterion,
    getDesignFactor,
    getSampleSpaceData,
    factorCount,
    setAlgorithm,
    setDesignFactors,
    updateDesignFactorById,
    setSampleSpaceData,
    clearSampleSpace,
  }
}, {
  persist: {
    key: 'schemeOptimization-store',
    storage: sessionStorage,
  },
})

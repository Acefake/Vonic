import { useDesignStore, usePowerAnalysisDesignStore } from '@/renderer/store'

const designStoreRef = useDesignStore()
const powerAnalysisDesignStore = usePowerAnalysisDesignStore()

const designStore = app.productConfig.id === 'powerAnalysis' ? powerAnalysisDesignStore : designStoreRef

export function useTake(): {
  fillFormFromScheme: (scheme: any) => void
} {
  // 监听 selectedScheme 变化，自动填充表单
  function fillFormFromScheme(scheme: any): void {
    if (!scheme)
      return

    // 更新 store 中的各个参数
    designStore.updateFormData({
      ...scheme,
    })

    console.log('fillFormFromScheme', designStore.formData)

    app.message.success('已填充选中方案数据')
  }

  return {
    fillFormFromScheme,
  }
}

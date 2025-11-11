import { onUnmounted, ref } from 'vue'

/**
 * 进度条状态类型
 */
export type ProgressStatus = 'normal' | 'active' | 'exception' | 'success'

/**
 * 进度条 Hook 返回类型
 */
export interface UseProgressReturn {
  /** 进度条是否可见 */
  progressVisible: ReturnType<typeof ref<boolean>>
  /** 进度百分比 */
  progressPercent: ReturnType<typeof ref<number>>
  /** 进度状态 */
  progressStatus: ReturnType<typeof ref<ProgressStatus>>
  /** 开始进度 */
  startProgress: () => void
  /** 完成进度 */
  completeProgress: (isSuccess: boolean) => void
  /** 停止进度 */
  stopProgress: () => void
}

/**
 * 使用进度条的 Hook
 *
 * 提供进度条的显示、更新和完成功能。
 * 进度条会渐进式推进到 95%，等待完成事件后再到 100%。
 *
 * @returns UseProgressReturn Hook 返回的对象
 *
 * @example
 * ```typescript
 * const { progressVisible, progressPercent, progressStatus, startProgress, completeProgress, stopProgress } = useProgress()
 * ```
 */
export function useProgress(): UseProgressReturn {
  const progressVisible = ref(false)
  const progressPercent = ref(0)
  const progressStatus = ref<ProgressStatus>('normal')
  let progressTimer: number | null = null

  function startProgress(): void {
    progressVisible.value = true
    progressStatus.value = 'active'
    progressPercent.value = 0

    // 清理旧定时器
    if (progressTimer != null) {
      window.clearInterval(progressTimer)
      progressTimer = null
    }
    // 逐步前进到 95%，等待关闭事件后再到 100%
    progressTimer = window.setInterval(() => {
      if (progressPercent.value < 95) {
        // 渐进式推进，越接近95越慢
        const delta = Math.max(1, Math.round((95 - progressPercent.value) * 0.05))
        progressPercent.value = Math.min(95, progressPercent.value + delta)
      }
      else {
        if (progressTimer != null) {
          window.clearInterval(progressTimer)
          progressTimer = null
        }
      }
    }, 300)
  }

  function completeProgress(isSuccess: boolean): void {
    if (progressTimer != null) {
      window.clearInterval(progressTimer)
      progressTimer = null
    }
    progressPercent.value = 100
    progressStatus.value = isSuccess ? 'success' : 'exception'
    // 稍微停留一下再隐藏
    window.setTimeout(() => {
      progressVisible.value = false
      progressPercent.value = 0
      progressStatus.value = 'normal'
    }, 1000)
  }

  function stopProgress(): void {
    if (progressTimer != null) {
      window.clearInterval(progressTimer)
      progressTimer = null
    }
    progressVisible.value = false
    progressPercent.value = 0
    progressStatus.value = 'normal'
  }

  // 组件卸载时清理定时器
  onUnmounted(() => {
    stopProgress()
  })

  return {
    progressVisible,
    progressPercent,
    progressStatus,
    startProgress,
    completeProgress,
    stopProgress,
  }
}

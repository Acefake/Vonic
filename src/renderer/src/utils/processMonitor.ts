/**
 * 进程监控工具
 * 用于监控挂起的进程和调试卡住问题
 */

export interface ProcessDebugInfo {
  sampleId: number
  workDir: string
  isResolved: boolean
  retryCount: number
  hasEventResolve: boolean
  hasTimeout: boolean
  startTime?: number
  elapsedTime?: number
}

/**
 * 生成进程调试信息
 */
export function generateDebugInfo(
  pendingInfos: Map<string, any>,
  currentTime: number = Date.now(),
): ProcessDebugInfo[] {
  const debugInfos: ProcessDebugInfo[] = []

  for (const [workDir, info] of pendingInfos.entries()) {
    const elapsedTime = info.startTime ? currentTime - info.startTime : undefined

    debugInfos.push({
      sampleId: info.sampleId,
      workDir,
      isResolved: info.isResolved,
      retryCount: info.retryCount,
      hasEventResolve: !!info.eventResolve,
      hasTimeout: !!info.timeoutId,
      startTime: info.startTime,
      elapsedTime,
    })
  }

  // 按样本ID排序
  return debugInfos.sort((a, b) => a.sampleId - b.sampleId)
}

/**
 * 格式化调试信息为字符串
 */
export function formatDebugInfo(debugInfos: ProcessDebugInfo[]): string {
  if (debugInfos.length === 0) {
    return '没有待处理的样本'
  }

  const lines: string[] = ['待处理样本详情:']

  for (const info of debugInfos) {
    const timeStr = info.elapsedTime ? `${(info.elapsedTime / 1000).toFixed(1)}s` : 'N/A'
    const status = [
      `样本${info.sampleId}`,
      `resolved=${info.isResolved}`,
      `retry=${info.retryCount}`,
      `hasResolve=${info.hasEventResolve}`,
      `hasTimeout=${info.hasTimeout}`,
      `elapsed=${timeStr}`,
    ].join(', ')

    lines.push(`  - ${status}`)
  }

  return lines.join('\n')
}

/**
 * 检测可能卡住的进程
 * @param debugInfos 调试信息
 * @param maxElapsedTime 最大允许执行时间（毫秒）
 */
export function detectStuckProcesses(
  debugInfos: ProcessDebugInfo[],
  maxElapsedTime: number = 300000, // 默认5分钟
): ProcessDebugInfo[] {
  return debugInfos.filter((info) => {
    // 🔧 关键修复：排除还没开始执行的样本（startTime 为空）
    // 这些样本在队列中等待，不是卡住
    if (!info.startTime) {
      return false
    }

    // 如果有执行时间且超过最大时间，才认为是卡住
    if (info.elapsedTime && info.elapsedTime > maxElapsedTime) {
      return true
    }

    // 如果已标记为resolved但还在待处理队列中（状态异常）
    if (info.isResolved) {
      return true
    }

    // 🔧 修复：只有已经启动（有startTime）但没有eventResolve和timeout的才是异常
    // 正常情况下，启动后应该设置这两个值
    if (info.startTime && !info.hasEventResolve && !info.hasTimeout) {
      // 再检查是否已经运行了很长时间（至少30秒）
      if (info.elapsedTime && info.elapsedTime > 30000) {
        return true
      }
    }

    return false
  })
}

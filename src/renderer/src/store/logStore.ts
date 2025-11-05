import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * 日志级别类型
 */
export type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG'

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: number
  level: LogLevel
  message: string
  timestamp: string
  details?: string
}

/**
 * 日志过滤器类型
 */
export type LogFilter = LogLevel | 'all'

export const useLogStore = defineStore('log', () => {
  /** 日志列表 */
  const logs = ref<LogEntry[]>([])

  /** 日志计数器 */
  let logIdCounter = 0

  /** 是否暂停日志滚动 */
  const isPaused = ref(false)

  /** 日志过滤级别 */
  const filterLevel = ref<LogFilter>('all')

  /** 最大日志条数 */
  const MAX_LOGS = 1000

  /**
   * 过滤后的日志列表
   */
  const filteredLogs = computed(() => {
    if (filterLevel.value === 'all') {
      return logs.value
    }
    return logs.value.filter(log => log.level === filterLevel.value)
  })

  /**
   * 日志总数
   */
  const totalCount = computed(() => logs.value.length)

  /**
   * 过滤后的日志数量
   */
  const filteredCount = computed(() => filteredLogs.value.length)

  /**
   * 各级别日志数量统计
   */
  const logCountByLevel = computed(() => {
    const counts = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
      debug: 0,
    }

    logs.value.forEach((log) => {
      counts[log.level]++
    })

    return counts
  })

  /**
   * 添加日志
   * @param level 日志级别
   * @param message 日志消息
   * @param details 详细信息（可选）
   */
  function addLog(level: LogLevel, message: string, details?: string): void {
    const log: LogEntry = {
      id: logIdCounter++,
      level,
      message,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      details,
    }

    logs.value.push(log)

    // 限制日志数量，超出后删除最早的日志
    if (logs.value.length > MAX_LOGS) {
      logs.value.shift()
    }
  }

  /**
   * 添加信息日志
   * @param message 日志消息
   * @param details 详细信息（可选）
   */
  function info(message: string, details?: string): void {
    addLog('INFO', message, details)
  }

  /**
   * 添加成功日志
   * @param message 日志消息
   * @param details 详细信息（可选）
   */
  function success(message: string, details?: string): void {
    addLog('SUCCESS', message, details)
  }

  /**
   * 添加警告日志
   * @param message 日志消息
   * @param details 详细信息（可选）
   */
  function warning(message: string, details?: string): void {
    addLog('WARNING', message, details)
  }

  /**
   * 添加错误日志
   * @param message 日志消息
   * @param details 详细信息（可选）
   */
  function error(message: string, details?: string): void {
    addLog('ERROR', message, details)
  }

  /**
   * 添加调试日志
   * @param message 日志消息
   * @param details 详细信息（可选）
   */
  function debug(message: string, details?: string): void {
    addLog('DEBUG', message, details)
  }

  /**
   * 清空所有日志
   */
  function clearLogs(): void {
    logs.value = []
    logIdCounter = 0
  }

  /**
   * 设置过滤级别
   * @param level 日志级别
   */
  function setFilterLevel(level: LogFilter): void {
    // 如果值相同，不更新，避免触发循环更新
    if (filterLevel.value === level) {
      return
    }
    filterLevel.value = level
  }

  /**
   * 切换暂停状态
   */
  function togglePause(): void {
    isPaused.value = !isPaused.value
  }

  /**
   * 设置暂停状态
   * @param paused 是否暂停
   */
  function setPaused(paused: boolean): void {
    isPaused.value = paused
  }

  /**
   * 导出日志为文本
   * @returns 日志文本内容
   */
  function exportLogsAsText(): string {
    return logs.value
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.details ? `\n${log.details}` : ''}`)
      .join('\n')
  }

  /**
   * 导出日志为 JSON
   * @returns 日志 JSON 字符串
   */
  function exportLogsAsJson(): string {
    return JSON.stringify(logs.value, null, 2)
  }

  /**
   * 批量添加日志
   * @param logEntries 日志条目数组
   */
  function addLogBatch(logEntries: Array<{ level: LogLevel, message: string, details?: string }>): void {
    logEntries.forEach(({ level, message, details }) => {
      addLog(level, message, details)
    })
  }

  /**
   * 获取指定级别的日志
   * @param level 日志级别
   * @returns 该级别的日志列表
   */
  function getLogsByLevel(level: LogLevel): LogEntry[] {
    return logs.value.filter(log => log.level === level)
  }

  /**
   * 获取最近的 N 条日志
   * @param count 日志数量
   * @returns 最近的日志列表
   */
  function getRecentLogs(count: number): LogEntry[] {
    return logs.value.slice(-count)
  }

  return {
    logs,
    isPaused,
    filterLevel,

    filteredLogs,
    totalCount,
    filteredCount,
    logCountByLevel,

    addLog,
    info,
    success,
    warning,
    error,
    debug,
    clearLogs,
    setFilterLevel,
    togglePause,
    setPaused,
    exportLogsAsText,
    exportLogsAsJson,
    addLogBatch,
    getLogsByLevel,
    getRecentLogs,
  }
}, {
  persist: {
    key: 'log-store',
    storage: localStorage,
  },
})

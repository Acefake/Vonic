/**
 * 共享常量定义
 * 主进程和渲染进程都可以使用
 */

/**
 * 窗口名称枚举
 */
export enum WindowName {
  MAIN = 'main',
  LOADING = 'loading',
  WINDOW_EXAMPLE = 'windowExample',
  SETTINGS = 'settings',
  EMBEDDED = 'embedded',
}

/**
 * IPC 通道名称
 */
export const IPC_CHANNELS = {
  WINDOW_CREATE: 'window:create',
  WINDOW_CREATE_ASYNC: 'window:create-async',
  WINDOW_CLOSE: 'window:close',
  WINDOW_CLOSE_WITH_RESULT: 'window:close-with-result',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:toggle-maximize',
  WINDOW_GET_DATA: 'window:get-data',
  WINDOW_UPDATE_DATA: 'window:update-data',
  WINDOW_COUNT: 'window:count',
  WINDOW_COUNT_BY_TYPE: 'window:count-by-type',
  WINDOW_DATA: 'window:data',
} as const

/**
 * API 常量
 */
export const API_CONSTANTS = {
  /** 默认端口 */
  DEFAULT_PORT: 8090,
  /** 默认超时时间 */
  DEFAULT_TIMEOUT: 30000,
  /** 重试次数 */
  MAX_RETRIES: 3,
} as const

/**
 * 窗口常量
 */
export const WINDOW_CONSTANTS = {
  /** 最小宽度 */
  MIN_WIDTH: 1024,
  /** 最小高度 */
  MIN_HEIGHT: 768,
  /** 默认宽度 */
  DEFAULT_WIDTH: 1600,
  /** 默认高度 */
  DEFAULT_HEIGHT: 900,
} as const

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const

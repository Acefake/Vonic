/**
 * 窗口名称枚举
 */
export enum WindowName {
  MAIN = 'main',
  LOADING = 'loading',
  WINDOW_EXAMPLE = 'windowExample',
  SETTINGS = 'settings',
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
  DEFAULT_PORT: 8090,
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const

/**
 * 窗口常量
 */
export const WINDOW_CONSTANTS = {
  MIN_WIDTH: 1024,
  MIN_HEIGHT: 768,
  DEFAULT_WIDTH: 1600,
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

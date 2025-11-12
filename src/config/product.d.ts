/**
 * 产品配置
 * 根据环境变量 VITE_APP_PRODUCT 加载不同的产品配置
 */
export interface ProductConfig {
  /** 产品标识 */
  id: string
  /** 产品名称 */
  name: string
  /** 版本号 */
  version: string
  /** 主题颜色 */
  themeColor: string
  /** API 配置 */
  api: {
    /** API 基础 URL */
    baseUrl: string
    /** API 端口 */
    port: number
    /** 请求超时时间 */
    timeout?: number
  }
  /** 功能开关 */
  features: {
    /** 初步设计 */
    initialDesign?: boolean
    /** 方案优化 */
    schemeOptimization?: boolean
    /** 多方案设计 */
    multiScheme?: boolean
    /** 试验数据统计 */
    experimentalData?: boolean
    /** 数据对比 */
    dataComparison?: boolean
    [key: string]: boolean | undefined
  }
  /** DOE 服务配置 */
  doe?: {
    /** DOE 服务端口 */
    port?: number
    /** 启动超时时间 */
    startupTimeout?: number
    /** 是否启用 DOE 服务 */
    enabled?: boolean
  }
  /** 服务管理配置 */
  services?: {
    /** 启动模式：parallel（并行）或 sequential（顺序） */
    startupMode?: 'parallel' | 'sequential'
    /** 错误处理策略：stop-all（停止所有）或 continue（继续运行） */
    errorStrategy?: 'stop-all' | 'continue'
  }
  /** 文件配置 */
  file?: {
    /** 可执行文件名称 */
    exeName?: string
    /** 功耗分析读取文件名称 */
    inputFileName?: string
    /** Fortran读取的文件名称 */
    inputFileName_fortran?: string
    /** Fortran运行后生成结果文件名称 */
    outputFileName?: string
    /** 提交任务文件名称 */
    submitFileName?: string
  }
  /** 结果字段配置 */
  resultFields?: {
    /** 字段名 */
    field: string
    /** 结果文件中的键名（用于解析） */
    fileKey?: string
    /** 显示标签 */
    label: string
    /** 单位 */
    unit?: string
  }[]
  optimizationTarget?: {
    /** 目标字段名 */
    field: string
    /** 优化方向：minimize（最小化）或 maximize（最大化） */
    direction: 'minimize' | 'maximize'
  }
  /** 其他自定义配置 */
  [key: string]: unknown
}

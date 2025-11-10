/**
 * 实验数据统计模块类型定义
 */

/**
 * 统计方法类型
 */
export type StatisticalMethod = '均方差' | '最大偏差'

/**
 * 曲线类型
 */
export type ChartType = '散点图' | '雷达图' | '曲线图' | '折线图'

/**
 * 表格列定义
 */
export interface TableColumn {
  title: string
  dataIndex: string
  key: string
  width?: number | string
}

/**
 * 表格数据行
 */
export interface TableDataRow {
  key: string
  _uid?: string
  序号?: string | number
  [key: string]: string | number | undefined
}

/**
 * Excel 数据结构
 */
export interface ExcelData {
  headers: string[] // 表头
  rows: Array<Record<string, string | number>> // 数据行
}

/**
 * 图表配置
 */
export interface ChartConfig {
  xAxis: string // X轴数据列
  yAxis: string // Y轴数据列
  chartType: ChartType // 图表类型
  lineColor: string // 试验曲线颜色
  simulationLineColor?: string // 仿真曲线颜色（可选，仅在数据对比页面使用）
  titleText: string // 标题文本
  titleColor: string // 标题颜色
  titleFont?: string // 标题字体
}

/**
 * 图表数据点（用于散点图和曲线图）
 */
export type ChartDataPoint = [number, number] // [x, y]

/**
 * 雷达图数据（单数据源）
 */
export interface RadarChartData {
  indicators: Array<{ name: string, max: number }> // 雷达图维度
  values: number[] // 雷达图数据值
}

/**
 * 单个系列的数据（散点图/曲线图）
 */
export interface SeriesData {
  name: string // 系列名称
  data: ChartDataPoint[] // 数据点
  color: string // 颜色
}

/**
 * 处理后的图表数据
 */
export interface ProcessedChartData {
  type: 'scatter' | 'line' | 'radar'
  scatterData?: ChartDataPoint[] // 散点图/曲线图数据
  radarData?: RadarChartData // 雷达图数据（单系列）
  series?: SeriesData[] // 多系列（散点/曲线）
  xAxisName?: string // X轴名称
  yAxisName?: string // Y轴名称
}

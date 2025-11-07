/**
 * 因子类型
 */
export type FactorType = '实数' | '整数' | '离散'

/**
 * 设计因子接口
 */
export interface DesignFactor {
  /** 序号 */
  id: number
  /** 名称 */
  name: string
  /** 类型 */
  type: FactorType
  /** 下限 */
  lowerLimit?: number | null
  /** 上限 */
  upperLimit?: number | null
  /** 水平数 */
  levelCount?: number | null
  /** 取值 */
  values?: string | null
}

/**
 * 样本数据接口
 */
export interface SampleData {
  /** 序号 */
  id: number
  /** 各因子值 */
  [key: string]: number | string
}

/** 样本取样接口返回数据  */
export interface SampleSpaceData {
  /** 状态 */
  status: string
  errorMessage: string | null
  /** 行数 */
  experimentCount: number
  /** 列数 */
  factorCount: number
  /** 因子名称 表头 */
  factorNames: Array<string>
  metadata: any
  /** 列 样本矩阵 */
  sampleMatrix: Array<number>
}

/**
 * 算法类型枚举
 */
export enum AlgorithmType {
  /** 混合因子 */
  FULL_FACTORIAL_MIXED = 'FULL_FACTORIAL_MIXED',
  /** 拉丁超立方 */
  LATIN_HYPERCUBE = 'LATIN_HYPERCUBE',
  /** BOX_BEHNKEN 设计法 */
  BOX_BEHNKEN = 'BOX_BEHNKEN',
}

/**
 * 参数类型枚举
 */

export enum ParameterType {
  /** 连续参数 */
  CONTINUOUS_FACTOR = 'continuousFactor',
  /** 离散参数 */
  DISCRETE_FACTOR = 'discreteFactor',
}

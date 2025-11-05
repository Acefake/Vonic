// 响应值列表
export const RESPONSE_VALUES: { id: number, name: string }[] = [
  {
    id: 1,
    name: '分离功率',
  },
  {
    id: 2,
    name: '分离系数',
  },
]

/**
 * 优化算法选项
 */
export const ALGORITHM_OPTIONS: { label: string, value: string }[] = [
  { label: 'NSGA-II', value: 'NSGA-II' },
  { label: 'MOPSO', value: 'MOPSO' },
]

/**
 * 采样准则选项
 */
export const SAMPLING_CRITERION_OPTIONS: { label: string, value: string }[] = [
  { label: 'center', value: 'center' },
  { label: 'maximin', value: 'maximin' },
  { label: 'centermaximin', value: 'centermaximin' },
  { label: 'correlation', value: 'correlation' },
  { label: 'lhsmu', value: 'lhsmu' },
]

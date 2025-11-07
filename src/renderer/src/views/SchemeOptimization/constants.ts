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
 * 是否禁用 禁用置灰 禁用不可选
 */
export const ALGORITHM_OPTIONS: { label: string, value: string, isDisabled: boolean }[] = [
  { label: 'NSGA-II', value: 'NSGA-II', isDisabled: false },
  { label: 'MOPSO', value: 'MOPSO', isDisabled: false },
  { label: 'SGA', value: 'SGA', isDisabled: true },
  { label: 'NLPQLP', value: 'NLPQLP', isDisabled: true },
  { label: 'SQP', value: 'SQP', isDisabled: true },
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

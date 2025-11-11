import type { DesignFactor } from './type'

/**
 * 错误提示回调函数类型
 */
export type ErrorCallback = (message: string) => void

type FieldName = 'lowerLimit' | 'upperLimit' | 'levelCount'

/**
 * 检查值是否为空（undefined 或 null）
 */
function isNullOrUndefined(val: unknown): val is null | undefined {
  return val === undefined || val === null
}

/**
 * 检查字段是否有值
 */
function hasFieldValue(factor: DesignFactor, field: FieldName): boolean {
  const value = factor[field]
  return value !== undefined && value !== null
}

/**
 * 同时设置 factor 和 record 的字段值
 */
function setFieldValue(
  factor: DesignFactor,
  record: DesignFactor,
  field: FieldName,
  value: number | undefined | null,
): void {
  factor[field] = value as any
  record[field] = value as any
}

/**
 * 恢复 factor 和 record 的字段值
 */
function restoreFieldValue(
  factor: DesignFactor,
  record: DesignFactor,
  field: FieldName,
  prevValue: number | undefined,
): void {
  setFieldValue(factor, record, field, prevValue)
}

/**
 * 格式化错误消息
 */
function formatError(factor: DesignFactor, message: string): string {
  return `${factor.name}${message}`
}

/**
 * 清空 MOPSO 关联字段（下限、上限、水平数）
 */
function clearMOPSORelatedFields(factor: DesignFactor, record: DesignFactor): void {
  setFieldValue(factor, record, 'lowerLimit', undefined)
  setFieldValue(factor, record, 'upperLimit', undefined)
  setFieldValue(factor, record, 'levelCount', undefined)
}

/**
 * 将值转换为数字（如果可能）
 * 支持数字类型和可转换为数字的字符串
 * @returns 转换后的数字，如果无法转换则返回原值
 */
function toNumber(val: unknown): number | unknown {
  if (typeof val === 'number') {
    return val
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed === '') {
      return val
    }
    const num = Number(trimmed)
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return num
    }
  }
  return val
}

/**
 * 校验是否为有效数字（包括 0）
 * 支持数字类型和可转换为数字的字符串
 */
export function isValidNumber(val: unknown): val is number {
  // 如果是数字类型，直接校验
  if (typeof val === 'number') {
    return !Number.isNaN(val) && Number.isFinite(val)
  }

  // 如果是字符串，尝试转换为数字
  if (typeof val === 'string') {
    const trimmed = val.trim()
    // 空字符串不算有效数字
    if (trimmed === '') {
      return false
    }
    const num = Number(trimmed)
    return !Number.isNaN(num) && Number.isFinite(num)
  }

  return false
}

/**
 * 校验数字输入格式，只允许数字
 * @returns 如果输入无效返回 true（已处理，需要停止后续流程），否则返回 false（输入有效，继续处理）
 */
export function validateNumberInput(
  factor: DesignFactor,
  newVal: number | undefined | null,
  fieldName: 'lowerLimit' | 'upperLimit' | 'levelCount',
  record: DesignFactor,
  showError: ErrorCallback,
): boolean {
  // 允许为空
  if (isNullOrUndefined(newVal)) {
    return false // 输入有效，继续处理
  }

  // 校验是否为有效数字
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    setFieldValue(factor, record, fieldName, null)
    return true // 返回 true 表示已处理，需要停止后续流程
  }

  return false // 输入有效，继续处理
}

/**
 * 校验下限和上限的关系
 */
function validateBoundsRelation(
  lower: number,
  upper: number,
  factor: DesignFactor,
  showError: ErrorCallback,
): boolean {
  if (lower >= upper) {
    showError(formatError(factor, '下限应小于其上限'))
    return false
  }
  return true
}

/**
 * 检查因子是否设置了取值
 */
export function hasValues(factor: DesignFactor): boolean {
  const v = (factor.values ?? '').toString().trim()
  return v.length > 0
}

/**
 * 互斥逻辑判断：是否设置了下限/上限/水平数中的任一项
 * 注意：如果已经有取值，则返回 false（取值的优先级更高）
 */
export function hasBoundsOrLevels(factor: DesignFactor): boolean {
  // 如果已经有取值，则不应该认为"有范围或水平数"（取值优先级更高）
  if (hasValues(factor)) {
    return false
  }
  return hasFieldValue(factor, 'lowerLimit') || hasFieldValue(factor, 'upperLimit') || hasFieldValue(factor, 'levelCount')
}

/**
 * NSGA-II 算法：校验下限
 */
export function validateLowerLimitNSGAII(
  factor: DesignFactor,
  newVal: number | undefined,
  prev: number | undefined,
  showError: ErrorCallback,
  record?: DesignFactor,
): boolean {
  // 清空时不触发必填校验，允许清空
  if (isNullOrUndefined(newVal)) {
    return true
  }
  // 校验是否为有效数字（允许 0）
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    if (record && prev !== undefined) {
      restoreFieldValue(factor, record, 'lowerLimit', prev)
    }
    else {
      factor.lowerLimit = null
      if (record) {
        record.lowerLimit = null
      }
    }
    return false
  }
  // 将字符串转换为数字（如果可能）
  const numVal = toNumber(newVal) as number
  // 下限应小于上限
  if (hasFieldValue(factor, 'upperLimit') && numVal >= factor.upperLimit!) {
    showError(formatError(factor, '下限应小于其上限'))
    if (record && prev !== undefined) {
      restoreFieldValue(factor, record, 'lowerLimit', prev)
    }
    else {
      factor.lowerLimit = null
      if (record) {
        record.lowerLimit = null
      }
    }
    return false
  }
  return true
}

/**
 * NSGA-II 算法：校验上限
 */
export function validateUpperLimitNSGAII(
  factor: DesignFactor,
  newVal: number | undefined,
  prev: number | undefined,
  showError: ErrorCallback,
  record?: DesignFactor,
): boolean {
  // 清空时不触发必填校验，允许清空
  if (isNullOrUndefined(newVal)) {
    return true
  }
  // 校验是否为有效数字（允许 0）
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    if (record && prev !== undefined) {
      restoreFieldValue(factor, record, 'upperLimit', prev)
    }
    else {
      factor.upperLimit = null
      if (record) {
        record.upperLimit = null
      }
    }
    return false
  }
  // 将字符串转换为数字（如果可能）
  const numVal = toNumber(newVal) as number
  // 上限应大于下限
  if (hasFieldValue(factor, 'lowerLimit') && numVal <= factor.lowerLimit!) {
    showError(formatError(factor, '上限应大于其下限'))
    if (record && prev !== undefined) {
      restoreFieldValue(factor, record, 'upperLimit', prev)
    }
    else {
      factor.upperLimit = null
      if (record) {
        record.upperLimit = null
      }
    }
    return false
  }
  return true
}

/**
 * MOPSO 算法：校验下限/上限/水平数的关联性
 * 如果某个有值，则这三个都不能为空
 * 注意：此函数用于实时校验，只在校验失败时返回 false 并恢复数据
 */
export function validateMOPSOBounds(factor: DesignFactor, showError: ErrorCallback): boolean {
  const hasLower = hasFieldValue(factor, 'lowerLimit')
  const hasUpper = hasFieldValue(factor, 'upperLimit')

  // 如果下限和上限都有值，进行数值关系校验
  // 注意：完整校验（包括水平数）在样本取样时进行
  if (hasLower && hasUpper) {
    const lower = factor.lowerLimit!
    const upper = factor.upperLimit!

    // 校验下限 < 上限
    if (!validateBoundsRelation(lower, upper, factor, showError)) {
      return false
    }
  }

  return true
}

/**
 * 处理输入值为 0 的情况（所有字段通用）
 * @deprecated 已改为 validateNumberInput，保留此函数以保持兼容性
 */
export function handleZeroInput(
  factor: DesignFactor,
  newVal: number | undefined,
  fieldName: 'lowerLimit' | 'upperLimit' | 'levelCount',
  record: DesignFactor,
  showError: ErrorCallback,
): boolean {
  return validateNumberInput(factor, newVal, fieldName, record, showError)
}

/**
 * MOPSO 算法：处理下限更新
 */
export function handleMOPSOLowerLimitUpdate(
  factor: DesignFactor,
  record: DesignFactor,
  newVal: number | undefined,
  prev: number | undefined,
  showError: ErrorCallback,
): boolean {
  // 允许为空，但如果填写了则需要校验关联性
  if (isNullOrUndefined(newVal)) {
    setFieldValue(factor, record, 'lowerLimit', undefined)
    // 检查是否需要清空其他字段
    if (!hasBoundsOrLevels(factor)) {
      clearMOPSORelatedFields(factor, record)
    }
    return true // 返回 true 表示已处理
  }

  // 校验是否为有效数字（允许 0）
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    restoreFieldValue(factor, record, 'lowerLimit', prev)
    return false
  }

  // 将字符串转换为数字（如果可能）
  const numVal = toNumber(newVal) as number

  // 如果上限已填写，校验下限 < 上限
  if (hasFieldValue(factor, 'upperLimit') && numVal >= factor.upperLimit!) {
    showError(formatError(factor, '下限应小于其上限'))
    restoreFieldValue(factor, record, 'lowerLimit', prev)
    return false
  }

  setFieldValue(factor, record, 'lowerLimit', numVal)
  factor.values = undefined
  // 校验关联性
  return validateMOPSOBounds(factor, showError)
}

/**
 * MOPSO 算法：处理上限更新
 */
export function handleMOPSOUpperLimitUpdate(
  factor: DesignFactor,
  record: DesignFactor,
  newVal: number | undefined,
  prev: number | undefined,
  showError: ErrorCallback,
): boolean {
  // 允许为空，但如果填写了则需要校验关联性
  if (isNullOrUndefined(newVal)) {
    setFieldValue(factor, record, 'upperLimit', undefined)
    // 检查是否需要清空其他字段
    if (!hasBoundsOrLevels(factor)) {
      clearMOPSORelatedFields(factor, record)
    }
    return true // 返回 true 表示已处理
  }

  // 校验是否为有效数字（允许 0）
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'upperLimit', prev)
    }
    else {
      setFieldValue(factor, record, 'upperLimit', null)
    }
    return false
  }

  // 将字符串转换为数字（如果可能）
  const numVal = toNumber(newVal) as number

  // 如果下限已填写，校验上限 > 下限
  if (hasFieldValue(factor, 'lowerLimit') && numVal <= factor.lowerLimit!) {
    showError(formatError(factor, '上限应大于其下限'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'upperLimit', prev)
    }
    else {
      setFieldValue(factor, record, 'upperLimit', null)
    }
    return false
  }

  setFieldValue(factor, record, 'upperLimit', numVal)
  factor.values = undefined
  // 校验关联性
  return validateMOPSOBounds(factor, showError)
}

/**
 * NSGA-II 算法：处理水平数更新
 */
export function handleNSGAIILevelCountUpdate(
  factor: DesignFactor,
  record: DesignFactor,
  newVal: number | undefined,
  prev: number | undefined,
  showError: ErrorCallback,
): boolean {
  // 允许为空（仅离散类型需要）
  if (isNullOrUndefined(newVal)) {
    setFieldValue(factor, record, 'levelCount', undefined)
    return true
  }

  // 校验是否为有效数字（允许 0）
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'levelCount', prev)
    }
    else {
      setFieldValue(factor, record, 'levelCount', null)
    }
    return false
  }

  // 将字符串转换为数字（如果可能）
  const numVal = toNumber(newVal) as number

  // 校验是否为整数（允许 0）
  if (!Number.isInteger(numVal)) {
    showError(formatError(factor, '水平数应为整数'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'levelCount', prev)
    }
    else {
      setFieldValue(factor, record, 'levelCount', null)
    }
    return false
  }

  // 校验水平数不能小于3
  if (numVal < 3) {
    showError(formatError(factor, '水平数不能小于3'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'levelCount', prev)
    }
    else {
      setFieldValue(factor, record, 'levelCount', null)
    }
    return false
  }

  setFieldValue(factor, record, 'levelCount', numVal)
  return true
}

/**
 * MOPSO 算法：处理水平数更新
 */
export function handleMOPSOLevelCountUpdate(
  factor: DesignFactor,
  record: DesignFactor,
  newVal: number | undefined,
  prev: number | undefined,
  showError: ErrorCallback,
): boolean {
  // 允许为空，但如果填写了则需要校验关联性
  if (isNullOrUndefined(newVal)) {
    setFieldValue(factor, record, 'levelCount', undefined)
    // 检查是否需要清空其他字段
    if (!hasBoundsOrLevels(factor)) {
      clearMOPSORelatedFields(factor, record)
    }
    return true
  }

  // 校验是否为有效数字（允许 0）
  if (!isValidNumber(newVal)) {
    showError(formatError(factor, '参数不合法'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'levelCount', prev)
    }
    else {
      setFieldValue(factor, record, 'levelCount', null)
    }
    return false
  }

  // 将字符串转换为数字（如果可能）
  const numVal = toNumber(newVal) as number

  // 校验是否为整数（允许 0）
  if (!Number.isInteger(numVal)) {
    showError(formatError(factor, '水平数应为整数'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'levelCount', prev)
    }
    else {
      setFieldValue(factor, record, 'levelCount', null)
    }
    return false
  }

  // 校验水平数不能小于3
  if (numVal < 3) {
    showError(formatError(factor, '水平数不能小于3'))
    if (prev !== undefined) {
      restoreFieldValue(factor, record, 'levelCount', prev)
    }
    else {
      setFieldValue(factor, record, 'levelCount', null)
    }
    return false
  }

  setFieldValue(factor, record, 'levelCount', numVal)
  factor.values = undefined
  // 校验关联性
  return validateMOPSOBounds(factor, showError)
}

/**
 * 格式化批量校验错误消息
 */
function formatBatchError(factorName: string, message: string): string {
  return `${factorName}${message}`
}

/**
 * 校验数值是否有效（有限数）
 */
function isValidFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val)
}

/**
 * 校验连续因子的下限和上限（公共逻辑）
 */
function validateContinuousBounds(
  lower: number | null | undefined,
  upper: number | null | undefined,
  factorName: string,
  errors: string[],
): boolean {
  // 检查是否为空
  if (isNullOrUndefined(lower)) {
    errors.push(formatBatchError(factorName, '下限为必填项'))
    return false
  }
  if (isNullOrUndefined(upper)) {
    errors.push(formatBatchError(factorName, '上限为必填项'))
    return false
  }

  // 检查数值有效性（允许 0）
  if (!isValidFiniteNumber(lower) || !isValidFiniteNumber(upper)) {
    errors.push(formatBatchError(factorName, '下限/上限必须为有效数值'))
    return false
  }

  // 校验下限 < 上限
  if (upper <= lower) {
    errors.push(formatBatchError(factorName, '下限应小于上限'))
    return false
  }

  return true
}

/**
 * NSGA-II 算法：批量校验所有因子
 * @param factors 设计因子数组
 * @returns 错误消息数组，如果校验通过则返回空数组
 */
export function validateNSGAIIFactors(factors: DesignFactor[]): string[] {
  const errors: string[] = []

  for (const factor of factors) {
    const lower = factor.lowerLimit
    const upper = factor.upperLimit

    if (!validateContinuousBounds(lower, upper, factor.name, errors)) {
      continue
    }
  }

  return errors
}

/**
 * 解析离散取值输入文本的结果类型
 */
export interface ParseDiscreteValuesResult {
  arr: Array<string | number>
  isJson: boolean
}

/**
 * 解析离散取值输入文本，支持严格JSON和简化格式 [a,2,3]
 * @param text 输入文本
 * @returns 解析结果或 null
 */
export function tryParseDiscreteValuesText(text: string): ParseDiscreteValuesResult | null {
  const trimmed = text.trim()
  // 必须是数组格式
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']'))
    return null

  // 优先尝试严格的 JSON
  try {
    const arr = JSON.parse(trimmed)
    const valid = Array.isArray(arr) && arr.length > 0 && arr.every(v => typeof v === 'string' || typeof v === 'number')
    if (valid)
      return { arr, isJson: true }
  }
  catch { }

  // 退化为简化解析：用逗号分割，去除两端引号，数字字符串转为数字
  const inner = trimmed.slice(1, -1).trim()
  const tokens = inner.length === 0 ? [] : inner.split(',').map(t => t.trim()).filter(t => t.length > 0)
  const arr = tokens.map((t) => {
    const unquoted = t.replace(/^['"]|['"]$/g, '')
    const num = Number(unquoted)
    return Number.isFinite(num) && unquoted === String(num) ? num : unquoted
  })
  const valid = Array.isArray(arr) && arr.length > 0 && arr.every(v => typeof v === 'string' || typeof v === 'number')
  if (!valid)
    return null
  return { arr, isJson: false }
}

/**
 * MOPSO 算法：批量校验所有因子
 * @param factors 设计因子数组
 * @returns 错误消息数组，如果校验通过则返回空数组
 */
export function validateMOPSOFactors(factors: DesignFactor[]): string[] {
  const errors: string[] = []

  for (const factor of factors) {
    const name = factor.name?.trim()
    if (!name) {
      errors.push('存在未命名的设计因子')
      continue
    }

    const valuesText = (factor.values ?? '').toString().trim()
    if (valuesText.length > 0) {
      const parsed = tryParseDiscreteValuesText(valuesText)
      if (!parsed) {
        errors.push(formatBatchError(name, '取值格式错误，应为非空数组，元素为字符串或数字，如： [10,12,33]'))
        continue
      }
      const arr = parsed.arr
      if (arr.length === 0) {
        errors.push(formatBatchError(name, '取值不能为空'))
        continue
      }

      if (arr.length < 3) {
        errors.push(formatBatchError(name, '取值数量应为大于2的正整数，如： [10,12,33]'))
        continue
      }
      // 校验通过，可以继续处理该因子
      continue
    }

    // 无"取值"，看是否设置了范围/水平数 -> 连续
    const lower = factor.lowerLimit
    const upper = factor.upperLimit
    const level = factor.levelCount

    // MOPSO: 如果下限/上限/水平数某个有值，则这三个都不能为空
    const hasLower = !isNullOrUndefined(lower)
    const hasUpper = !isNullOrUndefined(upper)
    const hasLevel = !isNullOrUndefined(level)

    if (hasLower || hasUpper || hasLevel) {
      // 某个有值，则这三个都不能为空
      if (!hasLower || !hasUpper || !hasLevel) {
        errors.push(formatBatchError(name, '下限、上限、水平数必须同时填写'))
        continue
      }

      // 校验连续因子的下限和上限
      if (!validateContinuousBounds(lower, upper, name, errors)) {
        continue
      }

      // 校验水平数（不能小于3）
      if (!isValidFiniteNumber(level) || !Number.isInteger(level) || level < 3) {
        errors.push(formatBatchError(name, '水平数应为大于2的正整数'))
        continue
      }

      // 校验通过，可以继续处理该因子
    }
    else {
      // 如果既没有取值，也没有下限/上限/水平数，则报错
      errors.push(formatBatchError(name, '因子参数不能为空'))
    }
  }

  return errors
}

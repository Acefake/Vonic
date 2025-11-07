/**
 * 解析 Sep_power.dat 文件内容
 * 使用安全的字符串分割方式，避免正则回溯问题
 * @param content 文件内容字符串
 * @returns 解析后的数据对象，包含所有 key-value 对
 */
export function parseSepPowerFile(content: string): Record<string, number> {
  const lineArr = content
    .replace(/\r\n/g, '\n') // 统一换行符为 \n（兼容 Windows 环境）
    .split('\n') // 按换行符拆分
    .map(line => line.trim()) // 去除前后空格
    .filter(line => line !== '') // 过滤空行

  const result: Record<string, number> = {}
  lineArr.forEach((line) => {
    // 使用 split 分割，避免正则回溯问题
    const equalIndex = line.indexOf('=')
    if (equalIndex === -1)
      return

    const key = line.substring(0, equalIndex).trim() // 指标名（去除前后空格）
    const valueStr = line.substring(equalIndex + 1).trim() // 数值部分（去除前后空格）

    // 解析数值（支持整数和小数）
    const value = Number(valueStr)
    if (!Number.isNaN(value) && Number.isFinite(value)) {
      result[key] = value
    }
  })

  return result
}

/**
 * 从解析结果中查找值（支持多个可能的 key 和大小写不敏感匹配）
 * @param result 解析结果对象
 * @param keys 可能的 key 列表（按优先级排序）
 * @returns 找到的值，如果未找到则返回 undefined
 */
export function findValue(result: Record<string, number>, keys: string[]): number | undefined {
  for (const key of keys) {
    // 先尝试精确匹配
    if (result[key] !== undefined)
      return result[key]
    // 再尝试大小写不敏感匹配
    const upperKey = key.toUpperCase()
    for (const [k, v] of Object.entries(result)) {
      if (k.toUpperCase() === upperKey)
        return v
    }
  }
  return undefined
}

/**
 * 解析 Sep_power.dat 文件内容，返回常用的分离功率和分离系数
 * @param content 文件内容字符串
 * @returns 包含分离功率和分离系数的对象
 */
export function parseSepPower(content: string): {
  actualSepPower: number | null
  actualSepFactor: number | null
} {
  const result = parseSepPowerFile(content)

  return {
    // 兼容 ACTURAL/ACTUAL 拼写，以及大小写
    actualSepPower: findValue(result, ['ACTURAL SEPERATIVE POWER', 'ACTUAL SEPERATIVE POWER']) ?? null,
    actualSepFactor: findValue(result, ['ACTURAL SEPERATIVE FACTOR', 'ACTUAL SEPERATIVE FACTOR']) ?? null,
  }
}

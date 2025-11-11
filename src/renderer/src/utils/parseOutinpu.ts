// beta  =0.22
// total_scoop=   23.33      total_accele =   22
// W_wscoop =    33      W_waccele =   34
// Wf =   44      Ws = 44

// 参数名称
// output中字段
// 贫取料器功耗
// W_waccele
// 取料器总功耗
// total_accele

/**
 * 解析 output.dat 文件内容
 * @param content 输入文件内容
 * @returns 解析后的数据对象
 */
function parseOutputFile(content: string): Record<string, number> {
  const lineArr = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')

  const result: Record<string, number> = {}
  lineArr.forEach((line) => {
    const keyValuePattern = /(\w+)\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[ed][+-]?\d+)?)/gi
    const matches = line.matchAll(keyValuePattern)
    for (const match of matches) {
      const [, rawKey, rawValue] = match
      if (!rawKey || !rawValue)
        continue
      const key = rawKey.trim()
      const numericRaw = rawValue.replace(/d/i, 'E')
      const value = Number.parseFloat(numericRaw)
      if (!Number.isNaN(value) && Number.isFinite(value))
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
 * 解析 output.dat 文件内容，返回常用的贫取料器功耗和取料器总功耗
 * @param content 文件内容字符串
 * @returns 包含贫取料器功耗和取料器总功耗的对象
 */
export function parseOutput(content: string): {
  poorTackPower: number | null
  tackPower: number | null
} {
  const result = parseOutputFile(content)
  return {
    poorTackPower: findValue(result, ['W_waccele']) ?? null,
    tackPower: findValue(result, ['total_accele']) ?? null,
  }
}

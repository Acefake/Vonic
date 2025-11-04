/**
 * 解析 Sep_power.dat 文件内容
 * 参考 InitialDesign 中的 replaceSepPowerParams 函数逻辑
 * @param content 文件内容字符串
 * @returns 解析后的数据对象
 */
export interface SepPowerData {
  /** 最大分离功率 */
  maxSepPower: number | null
  /** 实际分离系数 */
  actualSepFactor: number | null
  /** 实际分离功率 */
  actualSepPower: number | null
  /** 分离效率 */
  sepEfficiency: number | null
}

export function parseSepPower(content: string): SepPowerData {
  // 统一换行符为 \n（兼容 Windows 环境）
  const lineArr = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => line.trim() !== '') // 过滤空行

  // 使用与 InitialDesign 相同的正则表达式
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const regex = /^\s*([^=]+?)\s*=\s*(\d+)\s*$/
  const result: Record<string, number> = {}

  lineArr.forEach((line) => {
    const match = line.match(regex)
    if (match) {
      const key = match[1].trim() // 指标名（去除前后空格）
      const value = Number(match[2]) // 数值（转为 Number 类型，避免字符串）
      result[key] = value
    }
  })

  return {
    maxSepPower: result['MAXINMUM SEPERATIVE POWER seperative power'] ?? result['MAXIMUM SEPERATIVE POWER seperative power'] ?? null,
    actualSepFactor: result['ACTURAL SEPERATIVE FACTOR'] ?? result['ACTUAL SEPERATIVE FACTOR'] ?? null,
    actualSepPower: result['ACTURAL SEPERATIVE POWER'] ?? result['ACTUAL SEPERATIVE POWER'] ?? null,
    sepEfficiency: result['SEPERATIVE EFFICOENCY'] ?? result['SEPERATIVE EFFICIENCY'] ?? null,
  }
}

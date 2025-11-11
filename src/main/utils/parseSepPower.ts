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

  // 允许整数、小数、科学计数法（E/D）的数值匹配，并允许数字后跟随注释/单位
  // 示例：117、117.25、.25、1.1725e+2、-3.5E-1、1.23D+04、966.19   ! comment
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const regex = /^\s*([^=]+?)\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[ed][+-]?\d+)?)(?:\s+(?:\S.*)?)?$/i
  const result: Record<string, number> = {}

  lineArr.forEach((line) => {
    const match = line.match(regex)
    if (match) {
      const key = match[1].trim() // 指标名（去除前后空格）
      // 兼容 Fortran/科学计数法中的 D 作为指数标记（如 1.23D+04）
      const numericRaw = match[2].replace(/d/i, 'E')
      const value = Number.parseFloat(numericRaw) // 数值可为小数或科学计数法
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

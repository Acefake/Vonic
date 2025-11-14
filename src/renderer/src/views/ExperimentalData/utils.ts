/**
 * 实验数据统计工具函数
 */

import type { StatisticalMethod, TableColumn, TableDataRow } from './types'

import * as XLSX from 'xlsx'

/**
 * 计算均方差（标准差）
 * 均方差 = 标准差 = √[Σ(xi - μ)² / n]
 * @param values - 数值数组
 * @returns 均方差（标准差）
 */
function calculateMeanSquareDeviation(values: number[]): number {
  if (values.length === 0)
    return 0

  // 1. 计算平均值
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length

  // 2. 计算每个值与平均值的差的平方
  const squaredDifferences = values.map(val => (val - mean) ** 2)

  // 3. 计算方差（差的平方的平均值）
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length

  // 4. 计算标准差（均方差）= 方差的平方根
  const standardDeviation = Math.sqrt(variance)

  return standardDeviation
}

/**
 * 计算最大偏差
 * @param values - 数值数组
 * @returns 最大偏差
 */
function calculateMaxDeviation(values: number[]): number {
  if (values.length === 0)
    return 0

  // 1. 计算平均值
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length

  // 2. 计算每个值与平均值的差
  const deviations = values.map(val => Math.abs(val - mean))

  // 3. 取最大值
  const maxDev = Math.max(...deviations)

  return maxDev
}

/**
 * 计算统计结果
 * @param data - 表格数据
 * @param headers - 表头
 * @param method - 统计方法
 * @returns 统计结果行
 */
export function calculateStatistics(
  data: TableDataRow[],
  headers: string[],
  method: StatisticalMethod,
): TableDataRow {
  const result: TableDataRow = {
    key: `stat-${Date.now()}`,
    序号: method,
  }

  // 过滤掉序号列，对其他列进行统计
  const dataColumns = headers.filter(h => h !== '序号')

  dataColumns.forEach((header) => {
    // 提取该列的所有数值
    const values = data
      .map(row => row[header])
      .filter(val => val !== '' && val !== undefined && val !== null)
      .map(val => Number(val))
      .filter(val => !Number.isNaN(val))

    if (values.length === 0) {
      result[header] = ''
      return
    }

    // 根据统计方法计算结果
    if (method === '均方差') {
      result[header] = calculateMeanSquareDeviation(values)
    }
    else if (method === '最大偏差') {
      result[header] = calculateMaxDeviation(values)
    }
  })

  return result
}

/**
 * 获取数值列（用于图表）
 * @param data - 表格数据
 * @param column - 列名
 * @returns 数值数组
 */
export function getColumnValues(data: TableDataRow[], column: string): number[] {
  console.log(`[getColumnValues] 获取列 "${column}" 的值`)
  console.log(`[getColumnValues] 输入数据行数: ${data.length}`)
  console.log(`[getColumnValues] 第一行数据:`, data[0])

  const values = data
    .map((row) => {
      const val = row[column]
      console.log(`[getColumnValues] 行序号=${row.序号}, ${column}=${val}, 类型=${typeof val}`)
      return val
    })
    .filter(val => val !== '' && val !== undefined && val !== null)
    .map(val => Number(val))
    .filter(val => !Number.isNaN(val))

  console.log(`[getColumnValues] 最终提取的数值:`, values)
  return values
}

/**
 * 通用 Excel 解析函数（防止中文乱码 - WPS 兼容）
 * @param arrayBuffer - ArrayBuffer 格式的文件数据
 * @returns 表格列和数据
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer): Promise<{ columns: TableColumn[], data: TableDataRow[] }> {
  return new Promise((resolve, reject) => {
    try {
      const data = new Uint8Array(arrayBuffer)

      // 直接使用 GBK 编码解析（兼容 WPS 和标准 Excel）
      const workbook = XLSX.read(data, {
        type: 'array',
        codepage: 936, // 强制使用 GBK 编码
      })

      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        reject(new Error('Excel 文件中没有工作表'))
        return
      }

      const worksheet = workbook.Sheets[firstSheetName]

      // 转为 JSON（defval 防止空单元格丢列）
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false, // 格式化日期等单元格
      })

      if (jsonData.length === 0) {
        resolve({ columns: [], data: [] })
        return
      }

      // 获取所有列名，过滤掉 __EMPTY 占位符
      const rawKeys = Object.keys(jsonData[0])
      const validCols = rawKeys.filter(key => key && !key.startsWith('__EMPTY'))

      if (validCols.length === 0) {
        resolve({ columns: [], data: [] })
        return
      }

      // 检查是否有序号列
      const hasIndexColumn = validCols[0] === '序号' || validCols[0] === '编号'
      const finalCols = hasIndexColumn ? validCols : ['序号', ...validCols]

      // 转换数据
      const tableData: TableDataRow[] = jsonData.map((row, i) => {
        const obj: TableDataRow = {
          key: `row-${i + 1}`,
          _uid: `row_${i}_${Date.now()}`,
        }

        // 添加序号列（如果需要）
        if (!hasIndexColumn) {
          obj.序号 = i + 1
        }

        // 复制所有有效列的数据
        validCols.forEach((colName) => {
          const value = row[colName]
          if (value !== undefined && value !== null) {
            // 确保类型正确：字符串或数字
            if (typeof value === 'number') {
              obj[colName] = value
            }
            else {
              obj[colName] = String(value)
            }
          }
          else {
            obj[colName] = ''
          }
        })

        return obj
      })

      // 生成表格列配置
      const columns: TableColumn[] = finalCols.map(col => ({
        title: col,
        dataIndex: col,
        key: col,
        width: col === '序号' ? 80 : undefined,
      }))

      resolve({ columns, data: tableData })
    }
    catch (err) {
      reject(err)
    }
  })
}

<script setup lang="ts">
import type { ChartConfig, ProcessedChartData, SeriesData, TableColumn, TableDataRow } from '../ExperimentalData/types'
import { FilterOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, toRefs, watch } from 'vue'
import app from '../../app/index'
import { useDesignStore, useExperimentalDataStore, useLogStore, useSchemeOptimizationStore } from '../../store'
import { getFieldLabel } from '../../utils/field-labels'

import DataChart from '../ExperimentalData/DataChart.vue'

const experimentalDataStore = useExperimentalDataStore()
const { tableColumns, tableData } = toRefs(experimentalDataStore)
const designStore = useDesignStore()
const { formData, isMultiScheme } = toRefs(designStore)
const schemeOptimizationStore = useSchemeOptimizationStore()
const { sampleSpaceData } = toRefs(schemeOptimizationStore)
console.log(sampleSpaceData.value, 'sampleSpaceData---------------')
const logStore = useLogStore()
console.log(tableColumns.value, 'tableColumns')
console.log(tableData.value, 'tableData')
console.log(formData.value, 'formData')
// =====================
// 数据状态
// =====================
// 试验数据（从 store 获取）
const experimentalTableColumns = tableColumns

/**
 * 过滤后的试验数据
 * 去除均方差和最大偏差统计行
 */
const experimentalTableData = computed(() => {
  return tableData.value.filter((row) => {
    const seqNum = row.序号
    // 过滤掉统计行
    return seqNum !== '均方差' && seqNum !== '最大偏差'
  })
})

// 存储多方案的结果数据（分离功率和分离系数）
const multiSchemeResultsData = ref<Array<{ sepPower: number | null, sepFactor: number | null }>>([])

/**
 * 多方案仿真数据的表格列配置（基于样本空间数据，添加分离功率和分离系数）
 */
const multiSchemeSimulationColumns = computed<TableColumn[]>(() => {
  // 如果没有样本空间数据，返回空数组（不显示任何列）
  if (!sampleSpaceData.value || sampleSpaceData.value.length === 0) {
    return []
  }

  const columns: TableColumn[] = [
    { title: '序号', dataIndex: '序号', key: '序号', width: 80 },
  ]

  // 从样本空间数据中提取字段作为列（去除空格）
  const firstSample = sampleSpaceData.value[0]
  Object.keys(firstSample).forEach((key) => {
    const trimmedKey = key.trim()
    if (trimmedKey !== 'id' && trimmedKey !== '序号') {
      columns.push({
        title: trimmedKey,
        dataIndex: trimmedKey,
        key: trimmedKey,
        width: calculateColumnWidth(trimmedKey),
      })
    }
  })

  // 添加分离功率和分离系数列（只有成功加载数据且有有效值时才添加）
  const hasValidResults = multiSchemeResultsData.value.length > 0
    && multiSchemeResultsData.value.some(item => item.sepPower !== null || item.sepFactor !== null)

  if (hasValidResults) {
    columns.push(
      {
        title: '分离功率',
        dataIndex: '分离功率',
        key: '分离功率',
        width: 120,
      },
      {
        title: '分离系数',
        dataIndex: '分离系数',
        key: '分离系数',
        width: 120,
      },
    )
  }

  return columns
})

// 数据对比内容选择
const selectedCompareFields = ref<string[]>([])

// 保存仿真表格的筛选条件（用于多方案表格筛选）- 改为数组支持多选
const simulationTableFilters = ref<Record<string, string[]>>({})

/**
 * 多方案仿真数据的表格数据（基于样本空间数据，合并分离功率和分离系数）
 */
const multiSchemeSimulationData = computed<TableDataRow[]>(() => {
  return sampleSpaceData.value.map((sample, index) => {
    // 创建新对象，字段名去除空格
    const row: TableDataRow = {
      key: `sample-${sample.id}`,
      序号: index + 1,
    }

    // 将原始数据的字段名去除空格后添加
    Object.keys(sample).forEach((key) => {
      const trimmedKey = key.trim()
      if (trimmedKey !== 'id') {
        row[trimmedKey] = sample[key]
      }
    })

    // 合并分离功率和分离系数（从 multiSchemeResultsData 中获取对应索引的数据）
    const resultData = multiSchemeResultsData.value[index]
    if (resultData) {
      row['分离功率'] = resultData.sepPower !== null ? resultData.sepPower : undefined
      row['分离系数'] = resultData.sepFactor !== null ? resultData.sepFactor : undefined
    }

    return row
  })
})

/**
 * 加载多方案结果数据（分离功率和分离系数）
 */
async function loadMultiSchemeResults() {
  // 非多方案模式时，清空结果数据
  if (!isMultiScheme.value) {
    multiSchemeResultsData.value = []
    return
  }

  // 如果没有样本空间数据，清空结果数据
  if (!sampleSpaceData.value || sampleSpaceData.value.length === 0) {
    multiSchemeResultsData.value = []
    return
  }

  try {
    const data = await app.file.readMultiSchemes()
    // 提取分离功率和分离系数，去掉最优方案行（index === -1）
    multiSchemeResultsData.value = data
      .filter(item => item.index !== -1)
      .map(item => ({
        sepPower: item.sepPower,
        sepFactor: item.sepFactor,
      }))
    console.log('多方案结果数据加载成功:', multiSchemeResultsData.value)
  }
  catch (error) {
    console.error('加载多方案结果数据失败:', error)
    multiSchemeResultsData.value = []
  }
}

/**
 * 获取每列的唯一值（用于多方案仿真数据表格的筛选）
 */
function getColumnUniqueValues(columnKey: string): string[] {
  if (!isMultiScheme.value || !multiSchemeSimulationData.value || multiSchemeSimulationData.value.length === 0) {
    return []
  }

  // 提取该列的所有值
  const values = multiSchemeSimulationData.value
    .map(row => row[columnKey])
    .filter(val => val !== undefined && val !== null && val !== '')
    .map(val => String(val))

  // 去重并排序
  return [...new Set(values)].sort((a, b) => {
    // 尝试转为数字比较，如果不是数字则按字符串比较
    const numA = Number(a)
    const numB = Number(b)
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b)
  })
}

/**
 * 图表配置
 * 包含试验曲线颜色和仿真曲线颜色
 */
const chartConfig = ref<ChartConfig>({
  xAxis: '', // X轴不设置默认值
  yAxis: '', // Y轴不设置默认值
  chartType: '散点图', // 默认展示散点图
  lineColor: '#1890ff', // 试验曲线颜色（默认蓝色）
  simulationLineColor: '#00ff00', // 仿真曲线颜色（默认绿色）
  titleText: '试验仿真数据对比曲线',
  titleColor: '#000000', //
  titleFont: '宋体',
})

// 监听方案类型切换
watch(isMultiScheme, (newValue) => {
  const schemeType = newValue ? '多方案' : '单方案'
  logStore.info('切换方案类型', `当前方案类型: ${schemeType}`)

  // 如果切换到多方案，加载结果数据
  if (newValue) {
    loadMultiSchemeResults()
  }
  else {
    // 切换到单方案时，清空多方案结果数据
    multiSchemeResultsData.value = []
  }
})

// 监听样本空间数据变化
watch(() => sampleSpaceData.value, (newData) => {
  if (isMultiScheme.value) {
    // 如果样本空间数据被清空，也清空结果数据
    if (!newData || newData.length === 0) {
      multiSchemeResultsData.value = []
    }
    else {
      // 有新数据时，重新加载结果数据
      loadMultiSchemeResults()
    }
  }
}, { deep: true })

// 监听数据对比字段选择
watch(selectedCompareFields, (newFields) => {
  if (newFields.length > 0) {
    logStore.info('选择对比字段', `字段: ${newFields.join(', ')}`)
  }
})

// 监听图表配置变化
watch(() => chartConfig.value.chartType, (newType) => {
  logStore.info('切换图表类型', `类型: ${newType}`)
})

watch(() => chartConfig.value.xAxis, (newAxis) => {
  if (newAxis) {
    logStore.info('选择X轴', `X轴: ${newAxis}`)
  }
})

watch(() => chartConfig.value.yAxis, (newAxis) => {
  if (newAxis) {
    logStore.info('选择Y轴', `Y轴: ${newAxis}`)
  }
})

// =====================
// 计算属性
// =====================
/**
 * 合并设计参数数据
 * 将 topLevelParams、operatingParams、drivingParams、separationComponents、outputResults 合并成一个对象
 */
const mergedDesignData = computed(() => {
  // 合并所有参数对象，outputResults 放在最后，确保分离功率和分离系数显示在最后两列
  return {
    ...formData.value,
  }
})

/**
 * 根据文字长度计算列宽
 * @param text 文字内容
 * @returns 计算后的宽度（像素）
 */
function calculateColumnWidth(text: string): number {
  const minWidth = 80 // 最小宽度
  const maxWidth = 250 // 最大宽度
  const charWidth = 14 // 每个字符的平均宽度（中文字符）
  const padding = 32 // 列的内边距

  const calculatedWidth = text.length * charWidth + padding
  // 限制在最小和最大宽度之间
  return Math.min(Math.max(calculatedWidth, minWidth), maxWidth)
}

/**
 * 单方案仿真数据的表格列配置
 * 将每个参数作为一列（横向显示），列宽根据表头内容自动适应
 */
const singleSchemeSimulationColumns = computed<TableColumn[]>(() => {
  const data = mergedDesignData.value
  console.log(data, 'data---------------')

  // 检查是否有任何有效数据
  const hasValidData = Object.values(data).some(value => value !== undefined && value !== null)

  // 如果没有有效数据，返回空数组（不显示任何列，包括序号列）
  if (!hasValidData) {
    return []
  }

  const columns: TableColumn[] = [
    { title: '序号', dataIndex: '序号', key: '序号', width: 80 },
  ]

  // 为每个参数创建一列，根据表头文字长度自动计算列宽
  Object.keys(data).forEach((key) => {
    const title = getFieldLabel(key) // 使用中文标签作为列标题
    columns.push({
      title,
      dataIndex: key,
      key,
      width: calculateColumnWidth(title), // 根据表头文字长度计算宽度
    })
  })

  return columns
})

/**
 * 单方案仿真数据的表格数据
 * 所有参数值合并为一条数据（横向显示）
 */
const singleSchemeSimulationData = computed<TableDataRow[]>(() => {
  const data = mergedDesignData.value

  // 检查是否有任何有效数据（非 undefined 的值）
  const hasValidData = Object.values(data).some(value => value !== undefined && value !== null)

  // 如果没有任何有效数据，返回空数组
  if (!hasValidData) {
    return []
  }

  // 创建一条数据行，包含所有参数
  const row: TableDataRow = {
    key: 'design-params-row-1',
    序号: 1,
    ...data, // 将所有参数展开到一行中
  }

  return [row] // 只返回一条数据
})

// 数据对比内容选项
const compareFieldOptions = computed(() => {
  if (isMultiScheme.value) {
    // 多方案：样本空间表头 + 试验数据表头 + 分离功率 + 分离系数，去重
    // 从样本空间数据中提取字段名（排除 id，并去除空格）
    const sampleFields: string[] = []
    if (sampleSpaceData.value.length > 0) {
      const firstSample = sampleSpaceData.value[0]
      Object.keys(firstSample).forEach((key) => {
        const trimmedKey = key.trim()
        if (trimmedKey !== 'id' && trimmedKey !== '序号') {
          sampleFields.push(trimmedKey)
        }
      })
    }

    // 试验数据表头（去除空格）
    const experimentalFields = experimentalTableColumns.value
      .filter(col => col.dataIndex !== '序号')
      .map(col => (typeof col.dataIndex === 'string' ? col.dataIndex.trim() : col.dataIndex))

    // 合并去重（都已经去除空格）
    const allFields = [...new Set([...sampleFields, ...experimentalFields])]

    // 添加分离功率和分离系数（只有成功加载数据且有有效值时才添加）
    const hasValidResults = multiSchemeResultsData.value.length > 0
      && multiSchemeResultsData.value.some(item => item.sepPower !== null || item.sepFactor !== null)

    console.log('多方案结果数据检查:', {
      length: multiSchemeResultsData.value.length,
      data: multiSchemeResultsData.value,
      hasValidResults,
    })

    if (hasValidResults) {
      allFields.push('分离功率', '分离系数')
    }

    return allFields.map(field => ({
      label: field,
      value: field,
    }))
  }
  else {
    // 单方案：只显示试验数据表头
    return experimentalTableColumns.value
      .filter(col => col.dataIndex !== '序号')
      .map(col => ({
        label: col.title,
        value: col.dataIndex,
      }))
  }
})

/**
 * 过滤后的仿真数据表格列
 * 单方案时：根据选中的字段过滤设计参数列（通过中文标签匹配）
 * 多方案时：根据选中的字段过滤仿真数据列，并支持搜索
 */
const filteredSimulationColumns = computed<TableColumn[]>(() => {
  // ===== 处理仿真数据表格的列过滤逻辑 =====
  // 单方案：使用设计参数的列配置，并根据选中字段过滤
  if (!isMultiScheme.value) {
    // 如果没有选择任何字段，显示所有列
    if (selectedCompareFields.value.length === 0) {
      return singleSchemeSimulationColumns.value
    }

    // 获取选中字段对应的中文标签（试验数据表头的 title）
    // 因为试验数据的 dataIndex 是中文，而设计参数的 dataIndex 是英文
    // 所以需要通过中文标签（title）来匹配两个表格的列
    const selectedTitles = selectedCompareFields.value.map((fieldDataIndex) => {
      const col = experimentalTableColumns.value.find(c => c.dataIndex === fieldDataIndex)
      // 去除首尾空格，避免匹配失败
      return (col?.title || fieldDataIndex).trim()
    })

    // 通过中文标签匹配设计参数表格的列（仿真数据表格）
    // 同样去除表格列标题的首尾空格进行匹配
    const filtered = singleSchemeSimulationColumns.value.filter((col) => {
      return selectedTitles.includes(col.title.trim())
    })

    return [
      singleSchemeSimulationColumns.value[0], // 序号列
      ...filtered,
    ]
  }

  // 多方案：使用样本空间数据的列配置和过滤逻辑
  const baseColumns = selectedCompareFields.value.length === 0
    ? multiSchemeSimulationColumns.value
    : [
        multiSchemeSimulationColumns.value[0], // 序号列
        ...multiSchemeSimulationColumns.value.filter(col =>
          selectedCompareFields.value.includes(col.dataIndex),
        ),
      ]

  // 多方案时，为非序号列添加筛选功能（复选框列表）
  return baseColumns.map((col) => {
    if (col.dataIndex === '序号') {
      return col
    }

    const dataIndex = col.dataIndex as string

    return {
      ...col,
      customFilterDropdown: true,
      filteredValue: simulationTableFilters.value[dataIndex] || null,
      onFilter: (value: string, record: TableDataRow) => {
        const recordValue = String(record[dataIndex] || '')
        return recordValue === value
      },
    }
  })
})

/**
 * 过滤后的仿真数据表格数据
 * 单方案时：显示合并的设计参数数据
 * 多方案时：显示样本空间数据
 */
const filteredSimulationData = computed(() => {
  // 单方案：使用设计参数数据
  if (!isMultiScheme.value) {
    return singleSchemeSimulationData.value
  }

  // 多方案：使用样本空间数据和过滤逻辑
  if (selectedCompareFields.value.length === 0) {
    return multiSchemeSimulationData.value
  }

  return multiSchemeSimulationData.value.map((row) => {
    const filteredRow: TableDataRow = { key: row.key, 序号: row.序号 }

    selectedCompareFields.value.forEach((field) => {
      filteredRow[field] = row[field] !== undefined ? row[field] : ''
    })

    return filteredRow
  })
})
console.log(filteredSimulationData.value, '仿真数据表格数据---------------')

// 保存仿真表格实际显示的数据（应用了复选框筛选后的数据）
const actualSimulationTableData = computed<TableDataRow[]>(() => {
  // 单方案：直接返回 filteredSimulationData
  if (!isMultiScheme.value) {
    return filteredSimulationData.value
  }

  // 多方案：根据筛选条件过滤数据
  const filters = simulationTableFilters.value
  const hasFilters = Object.keys(filters).some(key => filters[key] && filters[key].length > 0)

  if (!hasFilters) {
    // 没有筛选条件，返回所有数据
    return filteredSimulationData.value
  }

  // 应用筛选条件（多选复选框）
  return filteredSimulationData.value.filter((row) => {
    // 检查每个筛选条件
    for (const [columnKey, filterValues] of Object.entries(filters)) {
      if (!filterValues || filterValues.length === 0)
        continue // 跳过空筛选值

      const cellValue = String(row[columnKey] || '')

      // 该列的值必须在选中的筛选值列表中
      if (!filterValues.includes(cellValue)) {
        return false // 不匹配，过滤掉这一行
      }
    }
    return true // 所有筛选条件都匹配
  })
})

// 过滤后的试验数据表格列
const filteredExperimentalColumns = computed(() => {
  // 如果没有试验数据，返回空数组（不显示任何列）
  if (!experimentalTableData.value || experimentalTableData.value.length === 0) {
    return []
  }

  const addWidth = (cols: TableColumn[]) => {
    return cols.map(col => ({
      ...col,
      width: col.dataIndex === '序号' ? 80 : 110,
    }))
  }

  if (selectedCompareFields.value.length === 0) {
    return addWidth(experimentalTableColumns.value)
  }

  // 序号列 + 选中的字段列（匹配时去除空格）
  const sequenceCol = experimentalTableColumns.value.find(col => col.dataIndex === '序号')
  // 对选中的字段也去除空格，确保匹配准确
  const trimmedSelectedFields = selectedCompareFields.value.map(field =>
    typeof field === 'string' ? field.trim() : field,
  )
  const selectedCols = experimentalTableColumns.value.filter((col) => {
    const colDataIndex = typeof col.dataIndex === 'string' ? col.dataIndex.trim() : col.dataIndex
    return trimmedSelectedFields.includes(colDataIndex)
  })

  const cols = sequenceCol ? [sequenceCol, ...selectedCols] : selectedCols
  return addWidth(cols)
})

// 过滤后的试验数据表格数据
const filteredExperimentalData = computed(() => {
  if (selectedCompareFields.value.length === 0) {
    return experimentalTableData.value
  }

  // 将选中的字段去除空格
  const trimmedSelectedFields = selectedCompareFields.value.map(field =>
    typeof field === 'string' ? field.trim() : field,
  )

  return experimentalTableData.value.map((row) => {
    const filteredRow: TableDataRow = { key: row.key }

    if (row.序号 !== undefined) {
      filteredRow.序号 = row.序号
    }

    // 遍历选中的字段，从 row 中查找匹配的数据
    trimmedSelectedFields.forEach((trimmedField) => {
      // 遍历 row 的所有键，找到去除空格后匹配的键
      const matchedKey = Object.keys(row).find(key =>
        typeof key === 'string' && key.trim() === trimmedField,
      )

      if (matchedKey) {
        // 使用匹配到的原始键名作为 filteredRow 的键
        filteredRow[matchedKey] = row[matchedKey]
      }
    })

    return filteredRow
  })
})

/**
 * 处理数据对比图表数据
 * - 散点/曲线：使用 X/Y 轴，每个点是 (x, y)
 */
const processedComparisonChartData = computed<ProcessedChartData | null>(() => {
  const xAxis = chartConfig.value.xAxis
  const yAxis = chartConfig.value.yAxis

  if (!xAxis || !yAxis) {
    return null
  }

  // ===== 散点图/曲线图：X-Y 坐标点 =====

  const series: SeriesData[] = []

  // 使用实际表格显示的数据（包含搜索筛选后的结果）
  const simulationData = actualSimulationTableData.value
  const simulationColumns = filteredSimulationColumns.value

  console.log('[图表数据] 使用的数据源:', {
    isMultiScheme: isMultiScheme.value,
    filters: simulationTableFilters.value,
    simulationDataLength: simulationData.length,
    data: simulationData,
  })

  const simXCol = simulationColumns.find((col) => {
    const dataIndex = typeof col.dataIndex === 'string' ? col.dataIndex.trim() : col.dataIndex
    const title = typeof col.title === 'string' ? col.title.trim() : col.title
    return dataIndex === xAxis.trim() || title === xAxis.trim()
  })
  const simYCol = simulationColumns.find((col) => {
    const dataIndex = typeof col.dataIndex === 'string' ? col.dataIndex.trim() : col.dataIndex
    const title = typeof col.title === 'string' ? col.title.trim() : col.title
    return dataIndex === yAxis.trim() || title === yAxis.trim()
  })

  if (simXCol && simYCol && simulationData.length > 0) {
    const points: [number, number][] = []
    simulationData.forEach((row) => {
      const xVal = row[simXCol.dataIndex as string]
      const yVal = row[simYCol.dataIndex as string]

      if (xVal != null && yVal != null && !Number.isNaN(Number(xVal)) && !Number.isNaN(Number(yVal))) {
        points.push([Number(xVal), Number(yVal)])
      }
    })

    if (points.length > 0) {
      series.push({
        name: '仿真数据',
        data: points,
        color: chartConfig.value.simulationLineColor || '#ff6b6b',
      })
    }
  }

  const experimentalData = filteredExperimentalData.value
  const experimentalColumns = filteredExperimentalColumns.value

  const expXCol = experimentalColumns.find((col) => {
    const dataIndex = typeof col.dataIndex === 'string' ? col.dataIndex.trim() : col.dataIndex
    return dataIndex === xAxis.trim() || col.title?.trim() === xAxis.trim()
  })
  const expYCol = experimentalColumns.find((col) => {
    const dataIndex = typeof col.dataIndex === 'string' ? col.dataIndex.trim() : col.dataIndex
    return dataIndex === yAxis.trim() || col.title?.trim() === yAxis.trim()
  })

  if (expXCol && expYCol && experimentalData.length > 0) {
    const points: [number, number][] = []
    experimentalData.forEach((row) => {
      const xVal = row[expXCol.dataIndex as string]
      const yVal = row[expYCol.dataIndex as string]

      if (xVal != null && yVal != null && !Number.isNaN(Number(xVal)) && !Number.isNaN(Number(yVal))) {
        points.push([Number(xVal), Number(yVal)])
      }
    })

    if (points.length > 0) {
      series.push({
        name: '试验数据',
        data: points,
        color: chartConfig.value.lineColor,
      })
    }
  }

  if (series.length === 0) {
    return null
  }

  return {
    type: chartConfig.value.chartType === '曲线图' || chartConfig.value.chartType === '折线图' ? 'line' : 'scatter',
    series,
    xAxisName: xAxis,
    yAxisName: yAxis,
  }
})

// =====================
// 事件处理函数
// =====================

// =====================
// 数据检查
// =====================
/**
 * 检查数据完整性并给出提示
 */
function checkDataCompleteness() {
  const hasExperimentalData = experimentalTableData.value && experimentalTableData.value.length > 0
  const hasSimulationData = isMultiScheme.value
    ? (multiSchemeSimulationData.value && multiSchemeSimulationData.value.length > 0)
    : (singleSchemeSimulationData.value && singleSchemeSimulationData.value.length > 0)

  if (!hasExperimentalData && !hasSimulationData) {
    message.warning('请先导入试验数据并设置方案参数')
  }
  else if (!hasExperimentalData) {
    message.warning('请先导入试验数据文件')
  }
  else if (!hasSimulationData) {
    if (isMultiScheme.value) {
      message.warning('请先在方案优化模块生成样本空间数据')
    }
    else {
      message.warning('请先在方案设计模块填写设计参数')
    }
  }
}

// =====================
// 生命周期钩子
// =====================
onMounted(() => {
  // 如果初始状态是多方案，加载结果数据
  if (isMultiScheme.value) {
    loadMultiSchemeResults()
  }

  // 进入页面时检查数据完整性并提示
  setTimeout(() => {
    checkDataCompleteness()
  }, 500)
})
</script>

<template>
  <div class="data-comparison-container">
    <!-- 顶部配置区域 -->
    <div class="config-section">
      <div class="config-row">
        <!-- 数据对比内容 -->
        <div class="config-item">
          <span class="label">数据对比内容：</span>
          <a-select
            v-model:value="selectedCompareFields"
            mode="multiple"
            placeholder="请选择对比字段"
            style="min-width: 300px"
            :options="compareFieldOptions"
            not-found-content="暂无数据"
          />
        </div>
      </div>
    </div>

    <!-- 数据表格区域 -->
    <div class="tables-and-chart-wrapper">
      <div class="tables-section">
        <!-- 仿真数据表格 -->
        <div class="table-container">
          <div class="table-header">
            <span class="table-title">仿真数据</span>
            <span v-if="isMultiScheme" class="table-subtitle">（多方案）</span>
            <span v-else class="table-subtitle">（单方案）</span>
          </div>
          <a-table
            :columns="filteredSimulationColumns"
            :data-source="filteredSimulationData"
            :scroll="{ x: 'max-content', y: 400 }"
            :pagination="false"
            bordered
            size="small"
            row-key="key"
          >
            <!-- 自定义列筛选（复选框列表） -->
            <template
              v-if="isMultiScheme"
              #customFilterDropdown="{ setSelectedKeys, selectedKeys, confirm, clearFilters, column }"
            >
              <div class="custom-filter-dropdown">
                <div class="filter-buttons">
                  <a-button
                    size="small"
                    block
                    @click="() => {
                      const columnKey = (column as any)?.dataIndex as string
                      if (columnKey) {
                        simulationTableFilters[columnKey] = []
                      }
                      clearFilters()
                      confirm()
                    }"
                  >
                    重置
                  </a-button>
                </div>
                <div class="filter-checkbox-list">
                  <a-checkbox-group
                    :value="selectedKeys"
                    @change="(checkedValues: any) => {
                      setSelectedKeys(checkedValues)
                      const columnKey = (column as any)?.dataIndex as string
                      if (columnKey) {
                        simulationTableFilters[columnKey] = checkedValues as string[]
                      }
                      confirm()
                    }"
                  >
                    <div
                      v-for="value in getColumnUniqueValues((column as any)?.dataIndex)"
                      :key="value"
                      class="filter-checkbox-item"
                    >
                      <a-checkbox :value="value">
                        {{ value }}
                      </a-checkbox>
                    </div>
                  </a-checkbox-group>
                </div>
              </div>
            </template>

            <!-- 自定义列筛选图标 -->
            <template v-if="isMultiScheme" #customFilterIcon="{ filtered }">
              <FilterOutlined :class="{ 'filter-icon-active': filtered }" />
            </template>

            <template #emptyText>
              <div class="empty-state">
                <a-empty description="暂无数据，请选择方案或上传数据文件" />
              </div>
            </template>
          </a-table>
        </div>

        <!-- 试验数据表格 -->
        <div class="table-container">
          <div class="table-header">
            <span class="table-title">试验数据</span>
          </div>
          <a-table
            :columns="filteredExperimentalColumns"
            :data-source="filteredExperimentalData"
            :scroll="{ x: 'max-content', y: 400 }"
            :pagination="false"
            bordered
            size="small"
            row-key="key"
          >
            <template #emptyText>
              <div class="empty-state">
                <a-empty description="暂无数据，请上传试验数据文件" />
              </div>
            </template>
          </a-table>
        </div>
      </div>

      <!-- 对比图表区域 -->
      <div class="chart-section">
        <div class="section-title">
          数据对比曲线
        </div>
        <DataChart
          v-model:chart-config="chartConfig"
          :table-columns="compareFieldOptions"
          :chart-data="processedComparisonChartData"
          :show-simulation-color="true"
          :hide-radar-chart="true"
          :show-polyline-chart="true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-comparison-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.config-section {
  background: #fff;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.config-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.label {
  white-space: nowrap;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  font-size: 14px;
}

.tables-and-chart-wrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.tables-section {
  display: flex;
  gap: 5px;
  width: 100%;
}

.table-container {
  flex: 1;
  min-width: 0;
  background: #fff;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
}

.table-container :deep(.ant-table) {
  width: 100%;
}

.table-container :deep(.ant-table-wrapper) {
  width: 100%;
}

.table-container :deep(.ant-table-thead > tr > th) {
  white-space: nowrap;
}

.table-container :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
}

.table-container :deep(.ant-table-content) {
  overflow-x: auto !important;
}

.table-header {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.table-subtitle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.empty-state {
  padding: 40px 0;
}

.chart-section {
  background: #fff;
  padding: 5px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  min-height: 600px;
  width: 100%;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 5px;
}

/* 自定义列筛选样式（复选框列表） */
.custom-filter-dropdown {
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  min-width: 150px;
  max-width: 250px;
}

.filter-buttons {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-checkbox-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
}

.filter-checkbox-item {
  padding: 4px 8px;
  transition: background-color 0.2s;
}

.filter-checkbox-item:hover {
  background-color: #f5f5f5;
}

.filter-checkbox-item :deep(.ant-checkbox-wrapper) {
  width: 100%;
  display: flex;
  align-items: center;
}

.filter-icon-active {
  color: #1890ff;
}
</style>

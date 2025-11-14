<script setup lang="ts">
import type { ChartConfig, ProcessedChartData, SeriesData, TableColumn, TableDataRow } from '../ExperimentalData/types'
import { FilterOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useMultiSchemeStore } from '@/renderer/store/msStore'
import { usePowerAnalysisDesignStore } from '@/renderer/store/powerAnalysisDesignStore'
import { useExperimentalDataStore } from '../../store'
import { FEEDING_METHOD_MAP, useMPhysSimDesignStore } from '../../store/mPhysSimDesignStore'
import { getFieldLabel } from '../../utils/field-labels'
import DataChart from '../ExperimentalData/DataChart.vue'

const experimentalDataStore = useExperimentalDataStore()
const { tableColumns, tableData } = storeToRefs(experimentalDataStore)
const designStore = app.productConfig.id === 'mPhysSim' ? useMPhysSimDesignStore() : usePowerAnalysisDesignStore()
const { formData, isMultiScheme, outputResults } = storeToRefs(designStore)

const multiSchemeStore = useMultiSchemeStore()
const { schemes, columns: multiSchemeColumns } = storeToRefs(multiSchemeStore)

// 供料方式转换函数
function getFeedingMethodLabel(value: number | undefined): string {
  if (value === undefined || value === null)
    return ''
  const method = FEEDING_METHOD_MAP.find(item => item.value === value)
  return method ? method.label : String(value)
}

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

// 数据对比内容选择
const selectedCompareFields = ref<string[]>([])

// 保存仿真表格的筛选条件（用于多方案表格筛选）- 改为数组支持多选
const simulationTableFilters = ref<Record<string, string[]>>({})

// 不需要在表格中显示的字段列表
const EXCLUDE_FIELDS = [
  'index',
  'fileName',
  'originalIndex',
  'isOptimalCopy',
  'radialGridCount',
  'axialGridCount',
  'innerBoundaryMirrorPosition',
  'gridGenerationMethod',
  'radialGridRatio',
  'compensationCoefficient',
  'streamlineData',
  'bwgRadialProtrusionHeight',
  'bwgAxialHeight',
  'bwgAxialPosition',
]

/**
 * 多方案仿真数据的表格数据（直接使用多方案 Store 的数据）
 */
const multiSchemeSimulationData = computed<TableDataRow[]>(() => {
  if (!schemes.value || schemes.value.length === 0) {
    return []
  }

  console.log(schemes.value)

  return schemes.value
    .filter(scheme => scheme.index > -1)
    .map((scheme, index) => {
      const row: TableDataRow = {
        key: `scheme-${scheme.index || index}`,
        序号: index + 1,
      }

      Object.keys(scheme).forEach((key) => {
        if (!EXCLUDE_FIELDS.includes(key)) {
          let value = (scheme as any)[key]
          // 供料方式特殊处理：转换为中文描述
          if (key === 'FeedMethod') {
            value = getFeedingMethodLabel(value as number)
          }
          const label = getFieldLabel(key) || key
          row[key] = value // 保留原始字段名
          row[label] = value // 添加中文标签映射
        }
      })

      return row
    })
})

/**
 * 图表配置
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

/**
 * 合并设计参数数据
 */
const mergedDesignData = computed(() => {
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
  const hasValidData = Object.values(data).some(value => value !== undefined && value !== null)

  if (!hasValidData) {
    return []
  }

  const columns: TableColumn[] = [
    { title: '序号', dataIndex: '序号', key: '序号', width: 80 },
  ]

  Object.keys(data).forEach((key) => {
    // 过滤掉不需要显示的字段
    if (!EXCLUDE_FIELDS.includes(key)) {
      const title = getFieldLabel(key)
      columns.push({
        title,
        dataIndex: key,
        key,
        width: calculateColumnWidth(title),
      })
    }
  })

  // 根据产品配置动态添加输出结果列
  const resultFields = app.productConfig.resultFields ?? []

  resultFields.forEach((resultField) => {
    if (!resultField.field)
      return

    // 尝试多种可能的键名
    const possibleKeys = [
      resultField.field, // sepPower
      resultField.field.charAt(0).toLowerCase() + resultField.field.slice(1), // sepPower
      resultField.field.toUpperCase(), // SEPPOWER
      resultField.field.toLowerCase(), // seppower
    ]

    let outputValue: any
    let foundKey = ''

    for (const key of possibleKeys) {
      if ((outputResults.value as any)?.[key] !== undefined) {
        outputValue = (outputResults.value as any)[key]
        foundKey = key
        break
      }
    }

    console.log(`结果字段 ${resultField.field}:`, { possibleKeys, foundKey, outputValue })

    if (outputValue !== undefined) {
      // 为分离功率添加单位，其他字段根据需要可以扩展
      const displayTitle = resultField.field === 'sepPower'
        ? `${resultField.label}(W)`
        : resultField.label

      columns.push({
        title: displayTitle,
        dataIndex: resultField.field,
        key: resultField.field,
        width: calculateColumnWidth(displayTitle),
      })

      console.log(`成功添加结果列: ${displayTitle}`)
    }
    else {
      console.warn(`结果字段 ${resultField.field} 未找到对应的输出值`)
    }
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

  // 创建一条数据行，只包含需要显示的参数
  const row: TableDataRow = {
    key: 'design-params-row-1',
    序号: 1,
  }

  // 只添加不在排除列表中的字段
  Object.keys(data).forEach((key) => {
    if (!EXCLUDE_FIELDS.includes(key)) {
      let value = data[key]
      // 供料方式特殊处理：转换为中文描述
      if (key === 'FeedMethod') {
        value = getFeedingMethodLabel(value as number)
      }
      row[key] = value
    }
  })

  /** 图表尾部对结果赋值 */
  const resultFields = app.productConfig.resultFields ?? []

  resultFields.forEach((resultField) => {
    if (!resultField.field)
      return

    // 尝试多种可能的键名
    const possibleKeys = [
      resultField.field, // sepPower
      resultField.field.charAt(0).toLowerCase() + resultField.field.slice(1), // sepPower
      resultField.field.toUpperCase(), // SEPPOWER
      resultField.field.toLowerCase(), // seppower
    ]

    let outputValue

    for (const key of possibleKeys) {
      if ((outputResults.value as any)?.[key] !== undefined) {
        outputValue = (outputResults.value as any)[key]
        break
      }
    }

    if (outputValue !== undefined) {
      // 使用原始字段名作为 dataIndex
      row[resultField.field] = outputValue
      // 同时添加中文标签映射
      row[resultField.label] = outputValue
    }
  })

  return [row]
})

// 数据对比内容选项
const compareFieldOptions = computed(() => {
  const allFields = new Set<string>()
  if (isMultiScheme.value) {
    // 多方案：仿真数据表头 + 试验数据表头（去重
    // 从仿真数据表头中提取字段（使用中文标签）
    multiSchemeColumns.value
      .filter(col => col.dataIndex !== 'index' && col.dataIndex !== '序号')
      .forEach((col) => {
        if (col.title) {
          // 去掉单位，只保留字段名
          const fieldName = col.title.includes('(')
            ? col.title.replace(/\([^)]*\)/g, '').trim()
            : col.title
          allFields.add(fieldName)
        }
      })

    // 从试验数据表头中提取字段（去重）
    experimentalTableColumns.value
      .filter(col => col.dataIndex !== '序号')
      .forEach((col) => {
        allFields.add(col.title)
      })

    return Array.from(allFields).map(field => ({
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
        value: col.title,
      }))
  }
})

/**
 * 过滤后的仿真数据表格列
 * 单方案时：根据选中的字段过滤设计参数列（通过中文标签匹配）
 * 多方案时：根据选中的字段过滤仿真数据列，并支持搜索
 */
const filteredSimulationColumns = computed<TableColumn[]>(() => {
  if (!isMultiScheme.value) {
    if (selectedCompareFields.value.length === 0) {
      return singleSchemeSimulationColumns.value
    }

    const selectedTitles = selectedCompareFields.value.map((fieldDataIndex) => {
      const col = experimentalTableColumns.value.find(c => c.dataIndex === fieldDataIndex)
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

  // 多方案：直接使用 multiSchemeStore 的 columns 配置
  if (!schemes.value || schemes.value.length === 0) {
    return []
  }

  // 直接使用多方案对比页面的列配置，确保完全一致
  const columns = multiSchemeColumns.value.map((col: any) => {
    // 复制列配置并适配数据对比页面的需求
    const columnConfig = { ...col }

    // 如果是序号列，调整 dataIndex 以匹配数据结构
    if (col.dataIndex === 'index') {
      columnConfig.dataIndex = '序号'
      columnConfig.title = '序号'
    }
    else {
      // 对于其他列，使用中文标签作为 dataIndex
      const label = getFieldLabel(col.dataIndex) || col.dataIndex
      columnConfig.dataIndex = label
    }

    // 添加自定义筛选功能
    if (col.dataIndex !== 'index') {
      columnConfig.customFilterDropdown = true
      columnConfig.filteredValue = simulationTableFilters.value[columnConfig.dataIndex] || null
      columnConfig.onFilter = (value: string, record: any) => {
        const recordValue = String(record[columnConfig.dataIndex] || '')
        return recordValue === value
      }
      // 移除原有的 filterDropdown，使用自定义的
      delete columnConfig.filterDropdown
    }

    return columnConfig
  })

  // 如果选择了特定字段，只显示选中的字段
  if (selectedCompareFields.value.length > 0) {
    const sequenceCol = columns.find(col => col.dataIndex === '序号')
    const selectedCols = columns.filter((col) => {
      const dataIndex = col.dataIndex as string
      // 现在 dataIndex 就是中文标签，直接匹配
      return selectedCompareFields.value.includes(dataIndex)
    })
    return sequenceCol ? [sequenceCol, ...selectedCols] : selectedCols
  }

  return columns
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
      // 支持中文标签匹配，需要在多方案数据和试验数据中查找
      let value = row[field] // 先尝试直接匹配（适用于试验数据的中文字段）

      if (value === undefined) {
        // 如果直接匹配失败，尝试通过中文标签反向查找英文字段名（适用于多方案数据）
        const matchedKey = Object.keys(row).find((key) => {
          const label = getFieldLabel(key)
          return label === field
        })
        if (matchedKey) {
          value = row[matchedKey]
        }
      }

      filteredRow[field] = value !== undefined ? value : ''
    })

    return filteredRow
  })
})

// 保存仿真表格实际显示的数据
const actualSimulationTableData = computed<TableDataRow[]>(() => {
  // 单方案：直接返回 filteredSimulationData
  if (!isMultiScheme.value) {
    return filteredSimulationData.value
  }

  // 多方案：根据筛选条件过滤数据
  const filters = simulationTableFilters.value
  const hasFilters = Object.keys(filters).some(key => filters[key] && filters[key].length > 0)

  if (!hasFilters) {
    return filteredSimulationData.value
  }

  return filteredSimulationData.value.filter((row) => {
    for (const [columnKey, filterValues] of Object.entries(filters)) {
      if (!filterValues || filterValues.length === 0) {
        continue
      }

      const cellValue = String(row[columnKey] || '').trim()
      if (!filterValues.includes(cellValue)) {
        return false
      }
    }
    return true
  })
})

/**
 * 获取每列的唯一值（用于多方案仿真数据表格的筛选）
 */
function getColumnUniqueValues(columnKey: string): string[] {
  if (!isMultiScheme.value || !actualSimulationTableData.value || actualSimulationTableData.value.length === 0) {
    return []
  }

  const uniqueValues = new Set<string>()

  actualSimulationTableData.value.forEach((row) => {
    const value = row[columnKey]
    if (value !== undefined && value !== null && value !== '') {
      const stringValue = String(value).trim()
      if (stringValue) {
        uniqueValues.add(stringValue)
      }
    }
  })

  return Array.from(uniqueValues).sort((a, b) => {
    const numA = Number(a)
    const numB = Number(b)
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' })
  })
}

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

  const sequenceCol = experimentalTableColumns.value.find(col => col.dataIndex === '序号')
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

  const series: SeriesData[] = []

  // 使用实际表格显示的数据（包含搜索筛选后的结果）
  const simulationData = actualSimulationTableData.value
  const simulationColumns = filteredSimulationColumns.value

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

onMounted(() => {
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
            :data-source="actualSimulationTableData"
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

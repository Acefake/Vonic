<script setup lang="ts">
import type * as echarts from 'echarts'
import { LineChart, RadarChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'

interface SchemeData {
  index: number
  fileName: string
  sepPower: number | null
  sepFactor: number | null
  // 动态字段支持
  [key: string]: any
}

interface Column {
  title: string
  dataIndex: string
  key: string
  [key: string]: any
}

interface Props {
  data?: SchemeData[]
  xColumns?: Column[]
  yColumns?: Column[]
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  xColumns: () => [],
  yColumns: () => [],
  title: '方案对比',
})

const STORAGE_CURVE_COLOR_KEY = 'scheme-chart:curve-color'
const STORAGE_TITLE_COLOR_KEY = 'scheme-chart:title-color'
const STORAGE_CHART_FONT_KEY = 'scheme-chart:font'

use([
  CanvasRenderer,
  LineChart,
  RadarChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
])

// 图表类型常量
const CHART_TYPE_SCATTER = '散点图'
const CHART_TYPE_RADAR = '雷达图'
const CHART_TYPE_LINE = '曲线图'

// 曲线类型选项
type ChartType = typeof CHART_TYPE_SCATTER | typeof CHART_TYPE_RADAR | typeof CHART_TYPE_LINE
const chartTypeOptions: ChartType[] = [CHART_TYPE_SCATTER, CHART_TYPE_RADAR, CHART_TYPE_LINE]
const chartType = ref<ChartType>(CHART_TYPE_SCATTER)

// 图表实例key，用于强制重新渲染
const chartKey = ref(0)

// 设置项：强制不合并旧配置
const chartSettings = {
  notMerge: true,
  replaceMerge: ['series', 'xAxis', 'yAxis', 'grid', 'radar'],
} as const

/**
 * 从列定义中提取字段选项
 */
function extractFieldOptions(columns: Column[]): Array<{ label: string, value: string, unit: string }> {
  if (!columns || columns.length === 0) {
    return []
  }

  // 从列中提取字段选项，并去重
  const fieldsMap = new Map<string, { label: string, value: string, unit: string }>()

  columns.forEach((col) => {
    // 跳过 index 和 fileName 列
    if (col.key === 'index' || col.key === 'fileName' || !col.dataIndex) {
      return
    }

    // 从列标题中提取单位（如果有）
    const title = col.title || ''
    let label = title
    let unit = ''

    // 尝试从标题中提取单位（格式：标题(单位)）
    const unitMatch = title.match(/^([^(]+)\(([^)]+)\)$/)
    if (unitMatch) {
      label = unitMatch[1].trim()
      unit = unitMatch[2]
    }

    // 如果没有单位，尝试从常见字段推断
    else {
      const dataIndex = col.dataIndex as string
      if (dataIndex === 'angularVelocity') {
        unit = 'Hz'
      }
      else if (dataIndex === 'feedFlowRate') {
        unit = 'kg/s'
      }
      else if (dataIndex === 'feedAxialDisturbance') {
        unit = 'mm'
      }
      else if (dataIndex === 'sepPower') {
        unit = 'W'
      }
      else if (dataIndex === 'sepFactor') {
        unit = ''
      }
    }

    const fieldValue = col.dataIndex as string
    if (!fieldsMap.has(fieldValue)) {
      fieldsMap.set(fieldValue, {
        label,
        value: fieldValue,
        unit,
      })
    }
  })

  return Array.from(fieldsMap.values())
}

const xFieldOptions = computed(() => {
  const allColumns = [...(props.xColumns || []), ...(props.yColumns || [])]
  return extractFieldOptions(allColumns)
})

const yFieldOptions = computed(() => {
  const allColumns = [...(props.xColumns || []), ...(props.yColumns || [])]
  return extractFieldOptions(allColumns)
})

// 所有字段选项（用于雷达图等需要所有字段的场景）
const allFieldOptions = computed(() => {
  const allColumns = [...(props.xColumns || []), ...(props.yColumns || [])]
  return extractFieldOptions(allColumns)
})

// 是否显示 X 轴选择器：如果有字段选项则显示
const showXAxisSelector = computed(() => {
  return allFieldOptions.value.length > 0
})

// 是否显示 Y 轴选择器：如果有字段选项则显示
const showYAxisSelector = computed(() => {
  return allFieldOptions.value.length > 0
})

// X轴、Y轴选择
const xAxisField = ref<string>('')
const yAxisField = ref<string>('')

// 仿真曲线颜色
const curveColor = ref<string>('#1890ff')

// 字体选项
const fontOptions = ['宋体', '微软雅黑', 'Arial', 'Times New Roman', '黑体', '楷体', '仿宋']
const chartFont = ref<string>('宋体')

// 标题颜色
const titleColor = ref<string>('#202020')

// 加载持久化的颜色和字体设置
onMounted(async () => {
  try {
    const savedCurveColor = await app.storage.get<string>(STORAGE_CURVE_COLOR_KEY)
    if (savedCurveColor) {
      curveColor.value = savedCurveColor
    }

    const savedTitleColor = await app.storage.get<string>(STORAGE_TITLE_COLOR_KEY)
    if (savedTitleColor) {
      titleColor.value = savedTitleColor
    }

    const savedFont = await app.storage.get<string>(STORAGE_CHART_FONT_KEY)
    if (savedFont && fontOptions.includes(savedFont)) {
      chartFont.value = savedFont
    }
  }
  catch (e) {
    console.error('加载图表设置失败', e)
  }
})

// 持久化曲线颜色
watch(curveColor, async (color) => {
  try {
    await app.storage.set(STORAGE_CURVE_COLOR_KEY, color)
  }
  catch (e) {
    console.error('保存曲线颜色失败', e)
  }
})

// 持久化标题颜色
watch(titleColor, async (color) => {
  try {
    await app.storage.set(STORAGE_TITLE_COLOR_KEY, color)
  }
  catch (e) {
    console.error('保存标题颜色失败', e)
  }
})

// 持久化字体
watch(chartFont, async (font) => {
  try {
    await app.storage.set(STORAGE_CHART_FONT_KEY, font)
  }
  catch (e) {
    console.error('保存字体失败', e)
  }
})

// 图表选项
const chartOption = ref<echarts.EChartsOption>({})

// 是否有有效数据
const hasValidData = computed(() => {
  // 对于所有图表类型，都需要X轴和Y轴字段都已选择，且有有效数据
  return (
    xAxisField.value !== ''
    && yAxisField.value !== ''
    && props.data.length > 0
    && props.data.some((item) => {
      const x = item[xAxisField.value as keyof SchemeData] as number
      const y = item[yAxisField.value as keyof SchemeData] as number | null
      return x !== null && x !== undefined && y !== null && y !== undefined
    })
  )
})

/**
 * 获取字段显示名称
 */
function getFieldLabel(value: string): string {
  return allFieldOptions.value.find(opt => opt.value === value)?.label || value
}

/**
 * 获取字段单位
 */
function getFieldUnit(value: string): string {
  return allFieldOptions.value.find(opt => opt.value === value)?.unit || ''
}

/**
 * 更新图表配置
 */
function updateChart() {
  // 切换图表类型时强制重新渲染
  chartKey.value++

  // 先清空旧配置，确保完全清除
  chartOption.value = {}

  // 使用 nextTick 确保DOM更新后再设置新配置
  nextTick(() => {
    if (!hasValidData.value) {
      chartOption.value = {}
      return
    }

    // 过滤有效数据
    const validData = props.data.filter((item) => {
      const x = item[xAxisField.value as keyof SchemeData] as number
      const y = item[yAxisField.value as keyof SchemeData] as number | null
      return x !== null && x !== undefined && y !== null && y !== undefined
    })

    if (validData.length === 0) {
      chartOption.value = {}
      return
    }

    // 提取X轴和Y轴数据
    const xData = validData.map(item => item[xAxisField.value as keyof SchemeData] as number)
    const yData = validData.map(item => item[yAxisField.value as keyof SchemeData] as number)

    // 计算Y轴平均值
    const yAverage = yData.reduce((sum, val) => sum + val, 0) / yData.length
    const yAverageData = xData.map(() => yAverage)

    // 找到Y轴最大值对应的索引
    const maxYIndex = yData.reduce((maxIdx, val, idx) => (val > yData[maxIdx] ? idx : maxIdx), 0)
    const maxX = xData[maxYIndex]
    const maxY = yData[maxYIndex]

    const xAxisLabel = getFieldLabel(xAxisField.value)
    const yAxisLabel = getFieldLabel(yAxisField.value)
    const xAxisUnit = getFieldUnit(xAxisField.value)
    const yAxisUnit = getFieldUnit(yAxisField.value)

    // 通用字体样式配置
    const fontFamily = chartFont.value

    generateChartConfig(validData, xData, yData, yAverage, yAverageData, maxX, maxY, xAxisLabel, yAxisLabel, xAxisUnit, yAxisUnit, fontFamily)
  })
}

/**
 * 生成图表配置
 */
function generateChartConfig(validData: any[], xData: number[], yData: number[], yAverage: number, yAverageData: number[], maxX: number, maxY: number, xAxisLabel: string, yAxisLabel: string, xAxisUnit: string, yAxisUnit: string, fontFamily: string) {
  // 根据图表类型生成不同的配置
  if (chartType.value === CHART_TYPE_SCATTER) {
    // 散点图配置
    chartOption.value = {
      title: {
        text: '方案对比',
        left: 'center',
        textStyle: {
          fontFamily: chartFont.value,
          color: titleColor.value,
        },
      },
      tooltip: {
        trigger: 'item',
        textStyle: {
          fontFamily,
        },
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            return params
              .map((p: any) => {
                return `${p.seriesName}<br/>${xAxisLabel}: ${p.value[0]}${xAxisUnit}<br/>${yAxisLabel}: ${p.value[1]}${yAxisUnit}`
              })
              .join('<br/>')
          }
          return `${params.seriesName}<br/>${xAxisLabel}: ${params.value[0]}${xAxisUnit}<br/>${yAxisLabel}: ${params.value[1]}${yAxisUnit}`
        },
      },
      legend: {
        data: ['方案数据', '平均值', '最大值'],
        bottom: 10,
        textStyle: {
          fontFamily,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: `${xAxisLabel}(${xAxisUnit})`,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontFamily,
        },
        axisLabel: {
          fontFamily,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: `${yAxisLabel}(${yAxisUnit})`,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontFamily,
        },
        axisLabel: {
          fontFamily,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      radar: undefined,
      series: [
        {
          name: '方案数据',
          type: 'scatter',
          data: xData.map((x, i) => [x, yData[i]]),
          symbolSize: 8,
          itemStyle: {
            color: curveColor.value,
          },
        },
        {
          name: '平均值',
          type: 'line',
          data: xData.map((x, i) => [x, yAverageData[i]]),
          lineStyle: {
            color: '#52c41a',
            type: 'dashed',
          },
          symbol: 'none',
        },
        {
          name: '最大值',
          type: 'scatter',
          data: [[maxX, maxY]],
          symbolSize: 12,
          itemStyle: {
            color: '#ff4d4f',
          },
          label: {
            show: true,
            position: 'top',
            formatter: `最大值\n${xAxisLabel}: ${maxX}${xAxisUnit}\n${yAxisLabel}: ${maxY}${yAxisUnit}`,
            // @ts-expect-error - ECharts label textStyle 类型定义不完整
            textStyle: {
              fontFamily,
            },
          },
        },
      ],
    }
  }
  else if (chartType.value === CHART_TYPE_LINE) {
    // 曲线图配置
    // 对X轴数据排序
    const sortedIndices = xData.map((_, i) => i).sort((a, b) => xData[a] - xData[b])
    const sortedXData = sortedIndices.map(i => xData[i])
    const sortedYData = sortedIndices.map(i => yData[i])
    const sortedYAverageData = sortedIndices.map(() => yAverage)

    chartOption.value = {
      title: {
        text: '方案对比',
        left: 'center',
        textStyle: {
          fontFamily: chartFont.value,
          color: titleColor.value,
        },
      },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontFamily,
        },
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: ['方案数据', '平均值', '最大值'],
        bottom: 10,
        textStyle: {
          fontFamily,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: `${xAxisLabel}(${xAxisUnit})`,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontFamily,
        },
        axisLabel: {
          fontFamily,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: `${yAxisLabel}(${yAxisUnit})`,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontFamily,
        },
        axisLabel: {
          fontFamily,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      radar: undefined,
      series: [
        {
          name: '方案数据',
          type: 'line',
          data: sortedXData.map((x, i) => [x, sortedYData[i]]),
          smooth: true,
          itemStyle: {
            color: curveColor.value,
          },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: '平均值',
          type: 'line',
          data: sortedXData.map((x, i) => [x, sortedYAverageData[i]]),
          lineStyle: {
            color: '#52c41a',
            type: 'dashed',
          },
          symbol: 'none',
        },
        {
          name: '最大值',
          type: 'scatter',
          data: [[maxX, maxY]],
          symbolSize: 12,
          itemStyle: {
            color: '#ff4d4f',
          },
          label: {
            show: true,
            position: 'top',
            formatter: `最大值\n${xAxisLabel}: ${maxX}${xAxisUnit}\n${yAxisLabel}: ${maxY}${yAxisUnit}`,
            // @ts-expect-error - ECharts label textStyle 类型定义不完整
            textStyle: {
              fontFamily,
            },
          },
        },
      ],
    }
    return
  }

  // if (chartType.value === CHART_TYPE_RADAR) {
  //   const schemesToCompare = validData

  //   console.log('schemesToCompare--雷达图', schemesToCompare)

  //   if (schemesToCompare.length < 2) {
  //     chartOption.value = {}
  //     return
  //   }

  //   // 获取所有数值字段（排除index和fileName）
  //   const numericFields = allFieldOptions.value.filter(
  //     field => field.value !== 'index' && field.value !== 'fileName',
  //   )

  //   if (numericFields.length === 0) {
  //     chartOption.value = {}
  //     return
  //   }

  //   // 预定义的颜色数组，用于为不同方案分配颜色
  //   const schemeColors = [
  //     curveColor.value, // 第一个方案使用用户选择的颜色
  //     '#1890ff', // 蓝色
  //     '#52c41a', // 绿色
  //     '#faad14', // 橙色
  //     '#f5222d', // 红色
  //     '#722ed1', // 紫色
  //     '#13c2c2', // 青色
  //     '#eb2f96', // 粉色
  //     '#fa8c16', // 橙红色
  //     '#2f54eb', // 深蓝色
  //   ]

  //   // 计算每个字段在所有方案中的最小值和最大值
  //   const radarDimensions = numericFields.map((field) => {
  //     const values: number[] = []

  //     validData.forEach((item) => {
  //       const val = item[field.value as keyof SchemeData] as number | null
  //       if (val !== null && val !== undefined) {
  //         values.push(val)
  //       }
  //     })

  //     const min = values.length > 0 ? Math.min(...values) : 0
  //     const max = values.length > 0 ? Math.max(...values) : 0

  //     return {
  //       name: field.label,
  //       min,
  //       max,
  //     }
  //   })

  //   // 构建方案的数据，每个方案使用不同的颜色
  //   const schemeRadarData = schemesToCompare.map((item, idx) => {
  //     const values = numericFields.map((field) => {
  //       const val = item[field.value as keyof SchemeData] as number | null
  //       return val !== null && val !== undefined ? val : 0
  //     })

  //     // 循环使用颜色数组，确保每个方案都有不同的颜色
  //     const color = schemeColors[idx % schemeColors.length]

  //     return {
  //       value: values,
  //       name: `方案${item.index === -1 ? '*' : item.index + 1}`,
  //       itemStyle: {
  //         color,
  //       },
  //       lineStyle: {
  //         color,
  //         width: 1,
  //       },
  //       areaStyle: {
  //         color,
  //         opacity: 0.3, // 设置透明度，让多个方案重叠时都能看到
  //       },
  //       emphasis: {
  //         lineStyle: {
  //           width: 2,
  //         },
  //         areaStyle: {
  //           opacity: 0.5, // 鼠标悬停时增加不透明度
  //         },
  //       },
  //     }
  //   })

  //   chartOption.value = {
  //     title: {
  //       text: '方案对比',
  //       left: 'center',
  //       textStyle: {
  //         fontFamily: chartFont.value,
  //         color: titleColor.value,
  //       },
  //     },
  //     legend: {
  //       bottom: 10,
  //       data: schemeRadarData.map(d => d.name),
  //       textStyle: {
  //         fontFamily,
  //       },
  //     },
  //     radar: {
  //       indicator: radarDimensions,
  //       radius: '60%',
  //       // @ts-expect-error - ECharts radar nameTextStyle 类型定义不完整
  //       nameTextStyle: {
  //         fontFamily,
  //       },
  //       axisLabel: {
  //         fontFamily,
  //       },
  //     },
  //     series: [
  //       {
  //         name: '数据对比',
  //         type: 'radar',
  //         data: schemeRadarData,
  //       },
  //     ],
  //     xAxis: undefined,
  //     yAxis: undefined,
  //     grid: undefined,
  //   }
  // }

  if (chartType.value === CHART_TYPE_RADAR) {
    // 雷达图配置 - 使用X轴字段作为指标名称，Y轴字段作为值
    // 构建雷达图数据：每个数据点的Y轴值作为指标的值
    const radarValues = validData.map((item) => {
      const yValue = item[yAxisField.value as keyof SchemeData] as number | null
      return yValue !== null && yValue !== undefined ? yValue : 0
    })

    // 计算Y轴值的最大值，用于设置指标的最大值
    const maxYValue = Math.max(...radarValues.filter(v => v > 0), 100)
    let indicatorMax = Math.max(maxYValue * 1.2, 100) // 留20%的余量，最小为100

    // 将最大值向上取整到合理的值，避免刻度不可读
    // 根据数值大小，向上取整到最近的 10、100、1000 等
    if (indicatorMax > 1000) {
      indicatorMax = Math.ceil(indicatorMax / 100) * 100 // 向上取整到最近的100
    }
    else if (indicatorMax > 100) {
      indicatorMax = Math.ceil(indicatorMax / 10) * 10 // 向上取整到最近的10
    }
    else {
      indicatorMax = Math.ceil(indicatorMax) // 向上取整到最近的整数
    }

    // 构建指标数组：每个数据点的X轴值作为指标名称
    const indicators = validData.map((item) => {
      const xValue = item[xAxisField.value as keyof SchemeData] as number | null

      // 使用X轴值作为指标名称，如果X轴值为null则使用序号
      const indicatorName = xValue !== null && xValue !== undefined
        ? String(xValue)
        : `指标${item.index + 1}`

      return {
        name: indicatorName,
        max: indicatorMax, // 所有指标使用统一的最大值
      }
    })

    // 构建雷达图系列数据
    const radarSeriesData = {
      value: radarValues,
      name: getFieldLabel(yAxisField.value),
      itemStyle: {
        color: curveColor.value,
      },
      lineStyle: {
        color: curveColor.value,
        width: 2,
      },
      areaStyle: {
        color: curveColor.value,
        opacity: 0.3,
      },
      emphasis: {
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          opacity: 0.5,
        },
      },
    }

    chartOption.value = {
      title: {
        text: '方案对比',
        left: 'center',
        textStyle: {
          fontFamily: chartFont.value,
          color: titleColor.value,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            return params.map((p: any) => {
              const index = p.dataIndex
              const indicator = indicators[index]
              return `${indicator.name}: ${p.value}`
            }).join('<br/>')
          }
          const index = params.dataIndex
          const indicator = indicators[index]
          return `${indicator.name}: ${params.value}`
        },
      },
      radar: {
        indicator: indicators,
        radius: '60%',
        // @ts-expect-error - ECharts radar nameTextStyle 类型定义不完整
        nameTextStyle: {
          fontFamily: chartFont.value,
        },
        axisLabel: {
          fontFamily: chartFont.value,
          showMinLabel: true,
          showMaxLabel: true,
        },
        splitNumber: 5, // 设置分割段数，控制刻度数量
      },
      series: [
        {
          name: getFieldLabel(yAxisField.value),
          type: 'radar',
          data: [radarSeriesData],
        },
      ],
      xAxis: undefined,
      yAxis: undefined,
      grid: undefined,
    }
  }
}

// 监听配置变化，更新图表
watch(
  [chartType, curveColor, xAxisField, yAxisField, chartFont, titleColor, () => props.data],
  () => {
    updateChart()
  },
  { deep: true },
)

onMounted(() => {
  nextTick(() => {
    updateChart()
  })
})
</script>

<template>
  <div class="scheme-chart-container">
    <div class="chart-layout">
      <!-- 图表区域 -->
      <div class="chart-area">
        <VChart
          v-if="hasValidData"
          :key="chartKey"
          class="chart"
          :option="chartOption"
          :settings="chartSettings"
          autoresize
        />
        <a-empty v-else description="请选择X轴和Y轴字段，并确保有有效数据" />
      </div>

      <!-- 右侧控制面板 -->
      <div class="chart-controls">
        <a-card size="small">
          <div class="control-item">
            <span class="control-label">曲线类型</span>
            <a-select v-model:value="chartType" style="width: 100%">
              <a-select-option v-for="option in chartTypeOptions" :key="option" :value="option">
                {{ option }}
              </a-select-option>
            </a-select>
          </div>

          <div v-if="showXAxisSelector" class="control-item">
            <span class="control-label">X轴</span>
            <a-select v-model:value="xAxisField" style="width: 100%">
              <a-select-option v-for="option in xFieldOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </div>

          <div v-if="showYAxisSelector" class="control-item">
            <span class="control-label">Y轴</span>
            <a-select v-model:value="yAxisField" style="width: 100%">
              <a-select-option v-for="option in yFieldOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </div>

          <div class="color-item-group">
            <div class="control-item">
              <span class="control-label">仿真曲线颜色</span>
              <div class="color-picker-wrapper">
                <input v-model="curveColor" type="color" class="color-input">
              </div>
            </div>

            <div class="control-item">
              <span class="control-label">标题颜色</span>
              <div class="color-picker-wrapper">
                <input v-model="titleColor" type="color" class="color-input">
              </div>
            </div>
          </div>
          <div class="control-item">
            <span class="control-label">图表字体</span>
            <a-select v-model:value="chartFont" style="width: 100%">
              <a-select-option v-for="font in fontOptions" :key="font" :value="font">
                {{ font }}
              </a-select-option>
            </a-select>
          </div>
        </a-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.chart-area {
  flex: 1;
  min-width: 0;
  height: 600px;
  min-height: 400px;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-controls {
  width: 280px;
  flex-shrink: 0;
}

.control-card {
  position: sticky;
  top: 16px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.control-item:last-child {
  margin-bottom: 0;
}

.control-label {
  font-size: 13px;
  color: #333333;
  font-weight: 500;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 40px;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.color-input:hover {
  border-color: #40a9ff;
}

.color-input:focus {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.color-rgb {
  font-size: 12px;
  color: #8c8c8c;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.color-item-group {
  display: flex;
  gap: 20px;
}
</style>

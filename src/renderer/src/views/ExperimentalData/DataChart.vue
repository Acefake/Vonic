<!-- 数据曲线组件 - 公共组件 -->
<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { ChartConfig, ProcessedChartData } from './types'

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
import { computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { useLogStore } from '../../store/logStore'

/**
 * 字段选项类型
 */
interface FieldOption {
  label: string
  value: string
}

interface Props {
  // 接收简单的字段选项数组，用于X/Y轴选择
  tableColumns?: FieldOption[]
  chartData?: ProcessedChartData | null
  chartConfig: ChartConfig
  // 是否显示仿真曲线颜色选项（仅在数据对比页面显示）
  showSimulationColor?: boolean
  // 是否隐藏雷达图选项（数据对比页面隐藏）
  hideRadarChart?: boolean
  // 是否显示折线图选项（仅在数据对比页面显示）
  showPolylineChart?: boolean
}

interface Emits {
  (e: 'update:chartConfig', value: ChartConfig): void
}

const props = withDefaults(defineProps<Props>(), {
  tableColumns: () => [],
  chartData: null,
  showSimulationColor: false,
  hideRadarChart: false,
  showPolylineChart: false,
})

const emit = defineEmits<Emits>()

const logStore = useLogStore()

// 监控 chartData 变化（调试用）
watch(() => props.chartData, (newData) => {
  console.log('[DataChart] chartData 更新:', newData)
}, { immediate: true, deep: true })

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  ScatterChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  RadarComponent,
  LegendComponent,
])

/**
 * 图表类型选项
 * 根据 hideRadarChart 和 showPolylineChart 参数决定显示哪些选项
 */
const chartTypeOptions = computed(() => {
  let options = ['散点图', '雷达图', '曲线图']

  // 如果隐藏雷达图
  if (props.hideRadarChart) {
    options = options.filter(opt => opt !== '雷达图')
  }

  // 如果显示折线图（仅在数据对比页面）
  if (props.showPolylineChart) {
    options.push('折线图')
  }

  return options
})

/**
 * 标题字体选项
 */
const titleFontOptions = [
  { label: '宋体', value: '宋体' },
  { label: '微软雅黑', value: '微软雅黑' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: '黑体', value: '黑体' },
  { label: '楷体', value: '楷体' },
  { label: '仿宋', value: '仿宋' },
]

/**
 * 表头选项（用于图表X/Y轴选择）
 * 直接使用传入的字段选项数组
 */
const headerOptions = computed(() => {
  return props.tableColumns
})

/**
 * 更新图表配置
 */
function updateChartConfig(key: keyof ChartConfig, value: string | number): void {
  console.log(`[DataChart] 更新配置: ${key} = ${value}`)

  // 记录关键配置变化到日志
  const logMessages: Record<string, string> = {
    chartType: '图表类型',
    xAxis: 'X轴',
    yAxis: 'Y轴',
    lineColor: '试验曲线颜色',
    simulationLineColor: '仿真曲线颜色',
    titleText: '标题文本',
    titleColor: '标题颜色',
    titleFont: '标题字体',
  }

  const logMsg = logMessages[key] || key
  logStore.info(`更新图表配置`, `${logMsg}: ${value}`)

  const newConfig = {
    ...props.chartConfig,
    [key]: value,
  }
  emit('update:chartConfig', newConfig)
}

/**
 * 处理颜色输入变化
 * 注意：由于浏览器限制，首次打开调色板时需要先点击调色板上的颜色以激活实时更新
 */
function handleColorInput(key: keyof ChartConfig, event: Event): void {
  const input = event.target as HTMLInputElement
  const value = input.value
  console.log(`[DataChart] 颜色变化: ${key} = ${value}`)
  updateChartConfig(key, value)
}

/**
 * 图表配置
 */
const chartOption = computed<EChartsOption>(() => {
  // 先判断是否上传了文件（通过 tableColumns 判断）
  const hasUploadedFile = props.tableColumns && props.tableColumns.length > 0

  // 没有上传文件
  if (!hasUploadedFile) {
    return {
      title: {
        text: '暂无数据，请先导入试验数据文件',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 14,
        },
      },
    }
  }

  // 上传了文件，但没有选择轴（雷达图不依赖 X/Y 轴）
  if (props.chartConfig.chartType !== '雷达图' && (!props.chartConfig.xAxis || !props.chartConfig.yAxis)) {
    return {
      title: {
        text: '请选择 X 轴和 Y 轴数据',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 14,
        },
      },
    }
  }

  // 选择了轴，但没有数据（理论上不应该出现，但保险起见）
  if (!props.chartData) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 14,
        },
      },
    }
  }

  // ===== 雷达图单系列（试验数据页面）=====
  if (props.chartData.type === 'radar' && props.chartData.radarData) {
    const { indicators, values } = props.chartData.radarData

    const radarData = [{
      value: values,
      name: props.chartConfig.yAxis,
    }]

    return {
      title: {
        text: props.chartConfig.titleText,
        left: 'center',
        textStyle: {
          color: props.chartConfig.titleColor,
          fontFamily: props.chartConfig.titleFont || '宋体',
        },
      },
      // tooltip: {
      //   show: true,
      //   trigger: 'item',
      //   confine: true,
      //   formatter: (params: any) => {
      //     const { name, value } = params

      //     if (!Array.isArray(value))
      //       return `${name}: ${value}`

      //     const maxDisplay = 10
      //     const total = value.length
      //     let result = `<div><strong>${name}</strong> (共 ${total} 条数据)<br/>`
      //     result += `<table style="border-collapse: collapse; font-size: 12px; margin-top: 4px;">`

      //     value.slice(0, maxDisplay).forEach((yVal: number, index: number) => {
      //       const indicator = indicators[index]
      //       result += `<tr><td style="padding: 2px 8px 2px 0;">${indicator.name}</td><td style="padding: 2px 0;">→ ${yVal.toFixed(2)}</td></tr>`
      //     })

      //     if (total > maxDisplay) {
      //       result += `<tr><td colspan="2" style="padding-top: 4px; color: #999; font-size: 11px;">... 还有 ${total - maxDisplay} 条数据</td></tr>`
      //     }

      //     result += `</table></div>`
      //     return result
      //   },
      // },
      legend: {
        bottom: 10,
        data: radarData.map(d => d.name),
      },
      radar: {
        indicator: indicators,
        radius: '60%',
      },
      series: [
        {
          name: '数据对比',
          type: 'radar',
          data: radarData,
          itemStyle: {
            color: props.chartConfig.lineColor,
          },
          emphasis: {
            lineStyle: {
              width: 3,
            },
          },
        },
      ],
      xAxis: undefined,
      yAxis: undefined,
      grid: undefined,
    }
  }

  // ===== 多系列数据模式（数据对比）=====
  if (props.chartData.series && props.chartData.series.length > 0) {
    const seriesType: 'line' | 'scatter' = props.chartData.type === 'line' ? 'line' : 'scatter'
    // 判断是否为曲线图（平滑）
    const isSmoothLine = props.chartConfig.chartType === '曲线图'

    console.log(props.chartData.series, 'props.chartData.series--曲线/折线图')
    // 根据传入的 series 数据构建图表系列
    const series = props.chartData.series.map(s => ({
      name: s.name,
      type: seriesType as 'line' | 'scatter',
      data: s.data,
      itemStyle: {
        color: s.color,
      },
      lineStyle: seriesType === 'line'
        ? {
            color: s.color,
            width: 2,
          }
        : undefined,
      smooth: seriesType === 'line' && isSmoothLine, // 只有曲线图才平滑，折线图不平滑
      symbolSize: seriesType === 'scatter' ? 8 : 6,
    }))
    console.log(series, 'series--曲线图')
    return {
      title: {
        text: props.chartConfig.titleText,
        left: 'center',
        textStyle: {
          color: props.chartConfig.titleColor,
          fontFamily: props.chartConfig.titleFont || '宋体',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const [xValue, yValue] = params.value
          return `${params.seriesName}<br/>${props.chartData?.xAxisName}: ${xValue}<br/>${props.chartData?.yAxisName}: ${yValue}`
        },
      },
      legend: {
        data: series.map(s => s.name),
        bottom: 10,
      },
      radar: undefined,
      xAxis: {
        type: 'value',
        name: props.chartData?.xAxisName || '',
        nameTextStyle: {
          fontSize: 12,
        },
      },
      yAxis: {
        type: 'value',
        name: props.chartData?.yAxisName || '',
        nameTextStyle: {
          fontSize: 12,
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      series,
    }
  }

  // ===== 单数据源模式：只显示一条曲线（试验数据页面） =====
  const seriesType = props.chartData.type === 'line' ? 'line' : 'scatter'
  const chartData = props.chartData.scatterData || []
  console.log(props.chartData, 'chartData--单数据源模式')

  if (chartData.length === 0) {
    return {
      title: {
        text: '所选列没有有效的数值数据',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 14,
        },
      },
    }
  }

  return {
    title: {
      text: props.chartConfig.titleText,
      left: 'center',
      textStyle: {
        color: props.chartConfig.titleColor,
        fontFamily: props.chartConfig.titleFont || '宋体',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const [xValue, yValue] = params.value
        return `${props.chartConfig.xAxis}: ${xValue}<br/>${props.chartConfig.yAxis}: ${yValue}`
      },
    },
    legend: undefined,
    radar: undefined,
    xAxis: {
      type: 'value',
      name: props.chartConfig.xAxis,
      nameTextStyle: {
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      name: props.chartConfig.yAxis,
      nameTextStyle: {
        fontSize: 12,
      },
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '15%',
    },
    series: [
      {
        name: props.chartConfig.yAxis,
        type: seriesType,
        data: chartData,
        itemStyle: {
          color: props.chartConfig.lineColor,
        },
        lineStyle: seriesType === 'line'
          ? {
              color: props.chartConfig.lineColor,
              width: 2,
            }
          : undefined,
        smooth: seriesType === 'line',
        symbolSize: seriesType === 'scatter' ? 8 : 6,
      },
    ],
  }
})
</script>

<template>
  <div class="chart-panel">
    <!-- 图表显示区域 -->
    <div class="chart-wrapper">
      <VChart
        :key="chartConfig.chartType"
        :option="chartOption"
        :update-options="{ notMerge: true }"
        autoresize
        style="height: 100%"
      />
    </div>

    <!-- 图表配置 - 右侧竖向排列 -->
    <div class="chart-config">
      <div class="config-item">
        <span class="label">曲线类型：</span>
        <a-select
          :value="chartConfig.chartType"
          class="config-input"
          :options="chartTypeOptions.map(t => ({ label: t, value: t }))"
          not-found-content="暂无数据"
          @update:value="(val) => updateChartConfig('chartType', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">标题颜色：</span>
        <input
          :value="chartConfig.titleColor"
          type="color"
          class="color-picker"
          @input="(e) => handleColorInput('titleColor', e)"
          @change="(e) => handleColorInput('titleColor', e)"
        >
      </div>

      <div class="config-item">
        <span class="label">试验曲线颜色：</span>
        <input
          :value="chartConfig.lineColor"
          type="color"
          class="color-picker"
          @input="(e) => handleColorInput('lineColor', e)"
          @change="(e) => handleColorInput('lineColor', e)"
        >
      </div>

      <!-- 仿真曲线颜色 - 仅在数据对比页面显示 -->
      <div v-if="showSimulationColor" class="config-item">
        <span class="label">仿真曲线颜色：</span>
        <input
          :value="chartConfig.simulationLineColor || '#6b97ff'"
          type="color"
          class="color-picker"
          @input="(e) => handleColorInput('simulationLineColor', e)"
          @change="(e) => handleColorInput('simulationLineColor', e)"
        >
      </div>

      <div class="config-item">
        <span class="label">X轴：</span>
        <a-select
          :value="chartConfig.xAxis || undefined"
          class="config-input"
          placeholder="请选择X轴"
          :options="headerOptions"
          not-found-content="暂无数据"
          allow-clear
          @update:value="(val) => updateChartConfig('xAxis', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">Y轴：</span>
        <a-select
          :value="chartConfig.yAxis || undefined"
          class="config-input"
          placeholder="请选择Y轴"
          :options="headerOptions"
          not-found-content="暂无数据"
          allow-clear
          @update:value="(val) => updateChartConfig('yAxis', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">标题字体：</span>
        <a-select
          :value="chartConfig.titleFont || '宋体'"
          class="config-input"
          :options="titleFontOptions"
          not-found-content="暂无数据"
          @update:value="(val) => updateChartConfig('titleFont', val)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-panel {
  display: flex;
  flex-direction: row;
  gap: 16px;
  height: calc(100vh - 200px);
}

.chart-wrapper {
  flex: 1;
  min-height: 400px;
  background: #fff;
  border-radius: 4px;
  padding: 16px;
}

.chart-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 280px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
  flex-shrink: 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  white-space: nowrap;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  font-size: 14px;
}

.config-input {
  width: 100%;
}

.color-picker {
  width: 100%;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px;
  background: #fff;
  transition: border-color 0.3s;
}

.color-picker:hover {
  border-color: #40a9ff;
}

.color-picker:focus {
  outline: none;
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
</style>

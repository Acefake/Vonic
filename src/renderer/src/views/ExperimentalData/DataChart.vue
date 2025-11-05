<!-- 数据曲线组件 - 公共组件 -->
<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { ChartConfig, ProcessedChartData, TableColumn } from './types'

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

interface Props {
  tableColumns?: TableColumn[]
  chartData?: ProcessedChartData | null
  chartConfig: ChartConfig
}

interface Emits {
  (e: 'update:chartConfig', value: ChartConfig): void
}

const props = withDefaults(defineProps<Props>(), {
  tableColumns: () => [],
  chartData: null,
})

const emit = defineEmits<Emits>()

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

const chartTypeOptions = ['散点图', '雷达图', '曲线图']

// 计算表头选项（用于图表X/Y轴选择）
const headerOptions = computed(() => {
  return props.tableColumns
    .filter(col => col.dataIndex !== '序号')
    .map(col => ({
      label: col.title,
      value: col.dataIndex,
    }))
})

/**
 * 更新图表配置
 */
function updateChartConfig(key: keyof ChartConfig, value: string | number): void {
  const newConfig = {
    ...props.chartConfig,
    [key]: value,
  }
  emit('update:chartConfig', newConfig)
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

  // 上传了文件，但没有选择轴
  if (!props.chartConfig.xAxis || !props.chartConfig.yAxis) {
    return {
      title: {
        text: '请选择 X 轴和 Y 轴变量',
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
        text: '数据处理中，请稍候...',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 14,
        },
      },
    }
  }

  // 雷达图
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
        },
      },
      tooltip: {
        show: true,
        trigger: 'item',
        confine: true,
        formatter: (params: any) => {
          const { name, value } = params

          if (!Array.isArray(value))
            return `${name}: ${value}`

          const maxDisplay = 10
          const total = value.length
          let result = `<div><strong>${name}</strong> (共 ${total} 条数据)<br/>`
          result += `<table style="border-collapse: collapse; font-size: 12px; margin-top: 4px;">`

          value.slice(0, maxDisplay).forEach((yVal: number, index: number) => {
            const indicator = indicators[index]
            result += `<tr><td style="padding: 2px 8px 2px 0;">${indicator.name}</td><td style="padding: 2px 0;">→ ${yVal.toFixed(2)}</td></tr>`
          })

          if (total > maxDisplay) {
            result += `<tr><td colspan="2" style="padding-top: 4px; color: #999; font-size: 11px;">... 还有 ${total - maxDisplay} 条数据</td></tr>`
          }

          result += `</table></div>`
          return result
        },
      },
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

  // 散点图和曲线图
  const seriesType = props.chartData.type === 'line' ? 'line' : 'scatter'
  const chartData = props.chartData.scatterData || []

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
          @update:value="(val) => updateChartConfig('chartType', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">试验曲线颜色：</span>
        <a-input
          :value="chartConfig.lineColor"
          type="color"
          class="config-input"
          @update:value="(val) => updateChartConfig('lineColor', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">X轴：</span>
        <a-select
          :value="chartConfig.xAxis"
          class="config-input"
          placeholder="选择X轴"
          :options="headerOptions"
          @update:value="(val) => updateChartConfig('xAxis', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">Y轴：</span>
        <a-select
          :value="chartConfig.yAxis"
          class="config-input"
          placeholder="选择Y轴"
          :options="headerOptions"
          @update:value="(val) => updateChartConfig('yAxis', val)"
        />
      </div>

      <div class="config-item">
        <span class="label">标题字体：</span>
        <a-select
          value="宋体"
          class="config-input"
          :options="[{ label: '宋体', value: '宋体' }]"
        />
      </div>

      <div class="config-item">
        <span class="label">标题颜色：</span>
        <a-input
          :value="chartConfig.titleColor"
          type="color"
          class="config-input"
          @update:value="(val) => updateChartConfig('titleColor', val)"
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
</style>

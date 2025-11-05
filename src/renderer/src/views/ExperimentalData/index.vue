<script setup lang="ts">
import type { ProcessedChartData } from './types'

import { UploadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, nextTick, onMounted, ref } from 'vue'

import { useApp } from '../../app'
import { useExperimentalDataStore } from '../../store'
import DataChart from './DataChart.vue'
import DataStatistics from './DataStatistics.vue'
import { getColumnValues, parseExcelFile } from './utils'

const $app = useApp()

// 使用 store（直接使用 store 属性，确保响应式）
const experimentalDataStore = useExperimentalDataStore()

// 当前激活的页签
const activeTab = ref<'statistics' | 'chart'>('statistics')

// 组件挂载时检查是否有历史数据
onMounted(() => {
  // 使用 setTimeout 确保 syncPlugin 有足够时间加载数据
  setTimeout(() => {
    if (experimentalDataStore.hasData()) {
      console.log('[实验数据] 已恢复历史数据:', {
        fileName: experimentalDataStore.fileName,
        columnsCount: experimentalDataStore.tableColumns.length,
        dataCount: experimentalDataStore.tableData.length,
      })
    }
    else {
      console.log('[实验数据] 暂无历史数据，请上传文件')
    }
  }, 300) // 等待 syncPlugin 完成（syncPlugin 有 200ms 延迟）
})

/**
 * 处理图表数据
 * 根据配置和表格数据计算出图表所需的数据格式
 */
const processedChartData = computed<ProcessedChartData | null>(() => {
  console.log('[processedChartData] 计算图表数据:', {
    hasTableData: !!experimentalDataStore.tableData,
    dataLength: experimentalDataStore.tableData?.length || 0,
    xAxis: experimentalDataStore.chartConfig.xAxis,
    yAxis: experimentalDataStore.chartConfig.yAxis,
  })

  // 检查是否有数据
  if (!experimentalDataStore.tableData || experimentalDataStore.tableData.length === 0) {
    console.log('[processedChartData] 无表格数据，返回 null')
    return null
  }

  // 检查是否选择了轴
  if (!experimentalDataStore.chartConfig.xAxis || !experimentalDataStore.chartConfig.yAxis) {
    console.log('[processedChartData] 未选择 X/Y 轴，返回 null')
    return null
  }

  // 过滤掉统计行
  const dataRows = experimentalDataStore.tableData.filter((row) => {
    const seqNum = row.序号
    return seqNum !== '均方差' && seqNum !== '最大偏差'
  })

  if (dataRows.length === 0) {
    return null
  }

  // 提取 X 轴和 Y 轴数据
  const xData = getColumnValues(dataRows, experimentalDataStore.chartConfig.xAxis)
  const yData = getColumnValues(dataRows, experimentalDataStore.chartConfig.yAxis)

  // 检查数据有效性
  if (xData.length === 0 || yData.length === 0) {
    return null
  }

  // 雷达图数据处理
  if (experimentalDataStore.chartConfig.chartType === '雷达图') {
    const maxYValue = Math.max(...yData)

    // 智能计算 radarMax，适应不同数量级
    let radarMax = 100 // 默认值
    if (maxYValue > 0) {
      const maxWithMargin = maxYValue * 1.2 // 留 20% 余量
      const magnitude = 10 ** Math.floor(Math.log10(maxWithMargin)) // 数量级
      const step = magnitude >= 100 ? magnitude / 10 : 10 // 取整步长
      radarMax = Math.ceil(maxWithMargin / step) * step
    }

    const indicators = xData.map(xVal => ({
      name: `${xVal}`,
      max: radarMax,
    }))

    return {
      type: 'radar',
      radarData: {
        indicators,
        values: yData,
      },
      xAxisName: experimentalDataStore.chartConfig.xAxis,
      yAxisName: experimentalDataStore.chartConfig.yAxis,
    }
  }

  // 散点图和曲线图数据处理
  const chartDataPoints = xData.map((x, i) => [x, yData[i]] as [number, number])

  const result = {
    type: experimentalDataStore.chartConfig.chartType === '曲线图' ? 'line' : 'scatter',
    scatterData: chartDataPoints,
    xAxisName: experimentalDataStore.chartConfig.xAxis,
    yAxisName: experimentalDataStore.chartConfig.yAxis,
  }

  console.log('[processedChartData] 返回结果:', result)
  return result
})

/**
 * 处理文件上传（使用 input 元素）
 */
function handleFileUpload(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  const hideLoading = $app.message.loading('正在读取文件...', 0)

  const reader = new FileReader()

  reader.onload = async (e: ProgressEvent<FileReader>) => {
    try {
      const data = e.target?.result
      if (!data) {
        throw new Error('文件读取失败')
      }

      // 使用 ArrayBuffer 直接解析
      const { columns, data: tableDataRows } = await parseExcelFile(data as ArrayBuffer)

      console.log('[文件上传] 解析完成:', {
        fileName: file.name,
        columnsCount: columns.length,
        dataCount: tableDataRows.length,
      })

      // 保存到 store（持久化存储）
      experimentalDataStore.setFileData(file.name, columns, tableDataRows)

      // 等待 nextTick 确保数据更新
      await nextTick()

      console.log('[文件上传] 保存到 store 后:', {
        storeFileName: experimentalDataStore.fileName,
        storeColumnsCount: experimentalDataStore.tableColumns.length,
        storeDataCount: experimentalDataStore.tableData.length,
      })

      hideLoading()
      message.success(`成功加载 ${tableDataRows.length} 条数据`)
    }
    catch (error) {
      hideLoading()
      message.error(`解析文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
    finally {
      // 清空 input，允许重复选择同一文件
      input.value = ''
    }
  }

  reader.onerror = () => {
    hideLoading()
    message.error('文件读取失败')
    input.value = ''
  }

  // 使用 readAsArrayBuffer 读取文件
  reader.readAsArrayBuffer(file)
}

/**
 * 触发文件选择
 */
function handleFileSelect(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = handleFileUpload
  input.click()
}
</script>

<template>
  <div class="experimental-data-container">
    <!-- 顶部文件选择区域 -->
    <div class="file-selector-section">
      <div class="file-input-group">
        <span class="label">试验数据文件：</span>
        <a-input
          v-model:value="experimentalDataStore.fileName"
          placeholder="请选择文件"
          readonly
          class="file-input"
        />
        <a-button type="primary" @click="handleFileSelect">
          <template #icon>
            <UploadOutlined />
          </template>
          上传文件
        </a-button>
      </div>
    </div>

    <!-- 页签 -->
    <a-tabs v-model:active-key="activeTab" class="main-tabs">
      <!-- 数据统计页签 -->
      <a-tab-pane key="statistics" tab="数据统计">
        <DataStatistics
          :table-data="experimentalDataStore.tableData"
          :table-columns="experimentalDataStore.tableColumns"
          @update:table-data="(newData) => experimentalDataStore.tableData = newData"
        />
      </a-tab-pane>
      <!-- 数据曲线页签 -->
      <a-tab-pane key="chart" tab="数据曲线">
        <DataChart
          v-model:chart-config="experimentalDataStore.chartConfig"
          :table-columns="experimentalDataStore.tableColumns"
          :chart-data="processedChartData"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.experimental-data-container {
  height: calc(100vh - 40px);
  padding: 24px;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-selector-section {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.file-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  padding: 0 16px 0 0;
}

.label {
  white-space: nowrap;
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  font-size: 14px;
}

.file-input {
  width: 100vw;
}

.main-tabs {
  flex: 1;
  background: #fff;
  padding: 16px;
  padding-top: 0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-tabs :deep(.ant-tabs-content-holder) {
  overflow: hidden;
  flex: 1;
}

.main-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.main-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow-y: auto; /* 子组件内滚动 */
}
</style>

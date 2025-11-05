import type { ChartConfig, TableColumn, TableDataRow } from '../views/ExperimentalData/types'

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 实验数据 Store
 * 用于持久化保存上传的实验数据，避免路由切换时数据丢失
 */
export const useExperimentalDataStore = defineStore('experimentalData', () => {
  /** 文件名 */
  const fileName = ref<string>('')

  /** 表格列定义 */
  const tableColumns = ref<TableColumn[]>([])

  /** 表格数据 */
  const tableData = ref<TableDataRow[]>([])

  /** 图表配置 */
  const chartConfig = ref<ChartConfig>({
    xAxis: '',
    yAxis: '',
    chartType: '曲线图',
    lineColor: '#1890ff',
    titleText: '',
    titleColor: '#000000',
  })

  /** 最后更新时间戳（用于区分用户操作和同步） */
  const lastUpdateTime = ref<number>(0)

  /**
   * 设置文件数据
   * 用户主动上传文件时调用，会更新时间戳
   */
  function setFileData(
    name: string,
    columns: TableColumn[],
    data: TableDataRow[],
  ): void {
    // 更新时间戳，标记这是用户主动操作
    lastUpdateTime.value = Date.now()

    // 批量更新所有数据
    fileName.value = name
    tableColumns.value = columns
    tableData.value = data

    console.log('[Store] 数据已更新（用户上传）:', {
      fileName: fileName.value,
      columnsCount: tableColumns.value.length,
      dataCount: tableData.value.length,
      timestamp: lastUpdateTime.value,
    })
  }

  /**
   * 更新图表配置
   */
  function updateChartConfig(config: Partial<ChartConfig>): void {
    chartConfig.value = { ...chartConfig.value, ...config }
  }

  /**
   * 设置完整的图表配置
   */
  function setChartConfig(config: ChartConfig): void {
    chartConfig.value = config
  }

  /**
   * 检查是否有数据
   */
  function hasData(): boolean {
    return tableData.value.length > 0
  }

  /**
   * 清空所有数据
   */
  function clearData(): void {
    fileName.value = ''
    tableColumns.value = []
    tableData.value = []
    chartConfig.value = {
      xAxis: '',
      yAxis: '',
      chartType: '曲线图',
      lineColor: '#1890ff',
      titleText: '',
      titleColor: '#000000',
    }
  }

  return {
    // 状态
    fileName,
    tableColumns,
    tableData,
    chartConfig,
    lastUpdateTime,

    // 方法
    setFileData,
    updateChartConfig,
    setChartConfig,
    hasData,
    clearData,
  }
})

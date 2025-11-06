<script setup lang="ts">
import type { TableColumnType } from 'ant-design-vue'
import type { ChartConfig, TableColumn, TableDataRow } from '../ExperimentalData/types'
import { SearchOutlined } from '@ant-design/icons-vue'
import { computed, ref, toRefs } from 'vue'
import { useExperimentalDataStore } from '../../store'
import DataChart from '../ExperimentalData/DataChart.vue'

const experimentalDataStore = useExperimentalDataStore()
const { tableColumns, tableData } = toRefs(experimentalDataStore)
console.log(tableColumns.value, 'tableColumns')
console.log(tableData.value, 'tableData')
// =====================
// 数据状态
// =====================
// 方案类型：true=多方案，false=单方案（临时假数据控制）
const isMultiScheme = ref<boolean>(false)

// 试验数据（从 store 获取）
const experimentalTableColumns = tableColumns
const experimentalTableData = tableData

// 仿真数据（假数据）
const simulationTableColumns = ref<TableColumn[]>([
  { title: '序号', dataIndex: '序号', key: '序号', width: 80 },
  { title: '角度度', dataIndex: '角度度', key: '角度度', width: 100 },
  { title: '供料后退', dataIndex: '供料后退', key: '供料后退', width: 110 },
  { title: '两端条', dataIndex: '两端条', key: '两端条', width: 100 },
  { title: '端盖温度', dataIndex: '端盖温度', key: '端盖温度', width: 110 },
  { title: '分离功率', dataIndex: '分离功率', key: '分离功率', width: 110 },
  { title: '分离系数', dataIndex: '分离系数', key: '分离系数', width: 110 },
])
// 仿真数据
const simulationTableData = ref<TableDataRow[]>([
  { key: 'sim-1', 序号: 1, 角度度: 10, 供料后退: 10, 两端条: 10, 端盖温度: 10, 分离功率: 10, 分离系数: 10 },
  { key: 'sim-2', 序号: 2, 角度度: 20, 供料后退: 20, 两端条: 20, 端盖温度: 20, 分离功率: 20, 分离系数: 20 },
  { key: 'sim-3', 序号: 3, 角度度: 30, 供料后退: 30, 两端条: 30, 端盖温度: 30, 分离功率: 30, 分离系数: 30 },
  { key: 'sim-4', 序号: 4, 角度度: 40, 供料后退: 40, 两端条: 40, 端盖温度: 40, 分离功率: 40, 分离系数: 40 },
])

// 数据对比内容选择
const selectedCompareFields = ref<string[]>([])

// 图表配置（假数据）
const chartConfig = ref<ChartConfig>({
  xAxis: '角度度',
  yAxis: '供料后退',
  chartType: '曲线图',
  lineColor: '#1890ff',
  titleText: '数据对比曲线',
  titleColor: '#000000',
})

// =====================
// 计算属性
// =====================
// 数据对比内容选项
const compareFieldOptions = computed(() => {
  if (isMultiScheme.value) {
    // 多方案：仿真数据表头 + 试验数据表头，去重
    const simulationFields = simulationTableColumns.value
      .filter(col => col.dataIndex !== '序号')
      .map(col => col.dataIndex)
    // 试验数据表头
    const experimentalFields = experimentalTableColumns.value
      .filter(col => col.dataIndex !== '序号')
      .map(col => col.dataIndex)

    const allFields = [...new Set([...simulationFields, ...experimentalFields])]

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

// 过滤后的仿真数据表格列（多方案时支持搜索）
const filteredSimulationColumns = computed<TableColumnType[]>(() => {
  const baseColumns = selectedCompareFields.value.length === 0
    ? simulationTableColumns.value
    : [
        simulationTableColumns.value[0], // 序号列
        ...simulationTableColumns.value.filter(col =>
          selectedCompareFields.value.includes(col.dataIndex),
        ),
      ]

  // 多方案时，为非序号列添加搜索功能
  if (isMultiScheme.value) {
    return baseColumns.map((col) => {
      if (col.dataIndex === '序号') {
        return col
      }

      const dataIndex = col.dataIndex as string

      return {
        ...col,
        customFilterDropdown: true,
        onFilter: (value: string, record: TableDataRow) => {
          const recordValue = String(record[dataIndex] || '')
          return recordValue.toLowerCase().includes(value.toLowerCase())
        },
      }
    })
  }

  return baseColumns
})

// 过滤后的仿真数据表格数据
const filteredSimulationData = computed(() => {
  if (selectedCompareFields.value.length === 0) {
    return simulationTableData.value
  }

  return simulationTableData.value.map((row) => {
    const filteredRow: TableDataRow = { key: row.key, 序号: row.序号 }

    selectedCompareFields.value.forEach((field) => {
      filteredRow[field] = row[field] !== undefined ? row[field] : ''
    })

    return filteredRow
  })
})
console.log(filteredSimulationData.value, '真数据表格数据---------------')
// 过滤后的试验数据表格列
const filteredExperimentalColumns = computed(() => {
  const addWidth = (cols: TableColumn[]) => {
    return cols.map(col => ({
      ...col,
      width: col.dataIndex === '序号' ? 80 : 110,
    }))
  }

  if (selectedCompareFields.value.length === 0) {
    return addWidth(experimentalTableColumns.value)
  }

  // 序号列 + 选中的字段列
  const sequenceCol = experimentalTableColumns.value.find(col => col.dataIndex === '序号')
  const selectedCols = experimentalTableColumns.value.filter(col =>
    selectedCompareFields.value.includes(col.dataIndex),
  )

  const cols = sequenceCol ? [sequenceCol, ...selectedCols] : selectedCols
  return addWidth(cols)
})

// 过滤后的试验数据表格数据
const filteredExperimentalData = computed(() => {
  if (selectedCompareFields.value.length === 0) {
    return experimentalTableData.value
  }

  return experimentalTableData.value.map((row) => {
    const filteredRow: TableDataRow = { key: row.key }

    if (row.序号 !== undefined) {
      filteredRow.序号 = row.序号
    }

    selectedCompareFields.value.forEach((field) => {
      filteredRow[field] = row[field] !== undefined ? row[field] : ''
    })

    return filteredRow
  })
})

// =====================
// 事件处理函数
// =====================
</script>

<template>
  <div class="data-comparison-container">
    <!-- 方案类型切换（临时调试用，固定定位，删除时不影响布局） -->
    <div class="debug-panel">
      <div class="config-item">
        <span class="label">方案类型：</span>
        <a-radio-group v-model:value="isMultiScheme">
          <a-radio :value="false">
            单方案
          </a-radio>
          <a-radio :value="true">
            多方案
          </a-radio>
        </a-radio-group>
      </div>
    </div>

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
            <span v-if="isMultiScheme" class="table-subtitle">（多方案-支持搜索）</span>
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
            <!-- 自定义列搜索框 -->
            <template
              v-if="isMultiScheme"
              #customFilterDropdown="{ setSelectedKeys, selectedKeys, confirm, clearFilters }"
            >
              <div class="custom-filter-dropdown">
                <a-input
                  :value="selectedKeys[0]"
                  placeholder="请输入搜索内容"
                  class="search-input"
                  @change="(e: any) => setSelectedKeys(e.target.value ? [e.target.value] : [])"
                  @press-enter="confirm()"
                />
                <div class="filter-buttons">
                  <a-button
                    type="primary"
                    size="small"
                    @click="confirm()"
                  >
                    搜索
                  </a-button>
                  <a-button
                    size="small"
                    @click="() => { clearFilters(); confirm() }"
                  >
                    重置
                  </a-button>
                </div>
              </div>
            </template>

            <!-- 自定义列搜索图标 -->
            <template v-if="isMultiScheme" #customFilterIcon="{ filtered }">
              <SearchOutlined :class="{ 'search-icon-active': filtered }" />
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
          :table-columns="filteredSimulationColumns as TableColumn[]"
          :chart-data="null"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-comparison-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

/* 临时调试面板 - 固定定位，删除时不影响布局 */
.debug-panel {
  position: fixed;
  top: 60px;
  right: 24px;
  z-index: 1000;
  background: #fff3cd;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #ffc107;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.config-section {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.config-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 20px;
  width: 100%;
}

.tables-section {
  display: flex;
  gap: 20px;
  width: 100%;
}

.table-container {
  flex: 1;
  min-width: 0;
  background: #fff;
  padding: 16px;
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
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
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
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  min-height: 600px;
  width: 100%;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 16px;
}

/* 自定义列搜索样式 */
.custom-filter-dropdown {
  padding: 8px;
  background: #fff;
  border-radius: 4px;
}

.search-input {
  width: 200px;
  margin-bottom: 8px;
  display: block;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.search-icon-active {
  color: #1890ff;
}
</style>

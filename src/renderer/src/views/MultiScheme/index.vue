<script setup lang="ts">
import type { TableProps } from 'ant-design-vue'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { Button, InputNumber, message, Space } from 'ant-design-vue'
import { computed, h, nextTick, onMounted, reactive, ref } from 'vue'

import SchemeChart from '../../components/SchemeChart/index.vue'
import { getFieldLabel } from '../../utils/field-labels'
import InitialDesign from '../InitialDesign/index.vue'

interface SchemeData {
  index: number // -1 表示最优方案，显示为 '*'
  fileName: string
  // 第1行：网格数
  radialGridCount: number
  axialGridCount: number
  // 第2行：主要参数
  angularVelocity: number
  rotorRadius: number
  rotorShoulderLength: number
  extractionChamberHeight: number
  rotorSidewallPressure: number
  gasDiffusionCoefficient: number
  // 第3-29行：其他参数
  depletedEndCapTemperature: number
  enrichedEndCapTemperature: number
  depletedMechanicalDriveAmount: number
  depletedExtractionArmRadius: number
  innerBoundaryMirrorPosition: number
  gridGenerationMethod: number
  enrichedBaffleHoleDistributionCircleDiameter: number
  enrichedBaffleHoleDiameter: number
  depletedExtractionPortInnerDiameter: number
  depletedExtractionPortOuterDiameter: number
  minAxialDistance: number
  feedBoxShockDiskHeight: number
  feedFlowRate: number
  splitRatio: number
  feedAngularDisturbance: number
  feedAxialDisturbance: number
  depletedBaffleInnerHoleOuterDiameter: number
  depletedBaffleOuterHoleInnerDiameter: number
  depletedBaffleOuterHoleOuterDiameter: number
  depletedBaffleAxialPosition: number
  bwgRadialProtrusionHeight: number
  bwgAxialHeight: number
  bwgAxialPosition: number
  radialGridRatio: number
  feedingMethod: number
  compensationCoefficient: number
  streamlineData: number
  // 结果
  sepPower: number | null
  sepFactor: number | null
}

const schemes = ref<SchemeData[]>([])
const loading = ref(false)
const filteredData = ref<SchemeData[]>([])
const activeKey = ref('1')
// 分页配置
const paginationConfig = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

// 筛选状态
const filterState = reactive<Record<string, { min?: number, max?: number }>>({})

// 筛选面板状态（每个列的独立状态）
const filterPanelState = reactive<Record<string, { min: number | null, max: number | null }>>({})

// 判断是否为最优方案行（index === -1 表示最优方案，需要高亮）
function isOptimalSchemeRow(record: SchemeData): boolean {
  return record.index === -1
}

// 定义所有字段的配置
const fieldConfigs = [
  { key: 'angularVelocity', label: getFieldLabel('angularVelocity'), width: 120, unit: 'Hz' },
  { key: 'rotorRadius', label: getFieldLabel('rotorRadius'), width: 120, unit: 'mm' },
  { key: 'rotorShoulderLength', label: getFieldLabel('rotorShoulderLength'), width: 140, unit: 'mm' },
  { key: 'extractionChamberHeight', label: getFieldLabel('extractionChamberHeight'), width: 140, unit: 'mm' },
  { key: 'rotorSidewallPressure', label: getFieldLabel('rotorSidewallPressure'), width: 140, unit: 'Pa' },
  { key: 'gasDiffusionCoefficient', label: getFieldLabel('gasDiffusionCoefficient'), width: 140 },
  { key: 'depletedEndCapTemperature', label: getFieldLabel('depletedEndCapTemperature'), width: 140, unit: 'K' },
  { key: 'enrichedEndCapTemperature', label: getFieldLabel('enrichedEndCapTemperature'), width: 140, unit: 'K' },
  { key: 'depletedMechanicalDriveAmount', label: getFieldLabel('depletedMechanicalDriveAmount'), width: 160, unit: 'mm' },
  { key: 'depletedExtractionArmRadius', label: getFieldLabel('depletedExtractionArmRadius'), width: 160, unit: 'mm' },
  { key: 'innerBoundaryMirrorPosition', label: '内边界镜像位置', width: 140, unit: 'mm' },
  { key: 'gridGenerationMethod', label: '网格生成方式', width: 120 },
  { key: 'enrichedBaffleHoleDistributionCircleDiameter', label: getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter'), width: 180, unit: 'mm' },
  { key: 'enrichedBaffleHoleDiameter', label: getFieldLabel('enrichedBaffleHoleDiameter'), width: 140, unit: 'mm' },
  { key: 'depletedExtractionPortInnerDiameter', label: getFieldLabel('depletedExtractionPortInnerDiameter'), width: 160, unit: 'mm' },
  { key: 'depletedExtractionPortOuterDiameter', label: getFieldLabel('depletedExtractionPortOuterDiameter'), width: 160, unit: 'mm' },
  { key: 'minAxialDistance', label: getFieldLabel('minAxialDistance'), width: 200, unit: 'mm' },
  { key: 'feedBoxShockDiskHeight', label: getFieldLabel('feedBoxShockDiskHeight'), width: 160, unit: 'mm' },
  { key: 'feedFlowRate', label: getFieldLabel('feedFlowRate'), width: 120, unit: 'kg/s' },
  { key: 'splitRatio', label: getFieldLabel('splitRatio'), width: 100 },
  { key: 'feedAngularDisturbance', label: getFieldLabel('feedAngularDisturbance'), width: 140, unit: 'mm' },
  { key: 'feedAxialDisturbance', label: getFieldLabel('feedAxialDisturbance'), width: 140, unit: 'mm' },
  { key: 'depletedBaffleInnerHoleOuterDiameter', label: getFieldLabel('depletedBaffleInnerHoleOuterDiameter'), width: 200, unit: 'mm' },
  { key: 'depletedBaffleOuterHoleInnerDiameter', label: getFieldLabel('depletedBaffleOuterHoleInnerDiameter'), width: 200, unit: 'mm' },
  { key: 'depletedBaffleOuterHoleOuterDiameter', label: getFieldLabel('depletedBaffleOuterHoleOuterDiameter'), width: 200, unit: 'mm' },
  { key: 'depletedBaffleAxialPosition', label: getFieldLabel('depletedBaffleAxialPosition'), width: 160, unit: 'mm' },
  { key: 'bwgRadialProtrusionHeight', label: 'BWG径向凸起高度', width: 140, unit: 'mm' },
  { key: 'bwgAxialHeight', label: 'BWG轴向高度', width: 120, unit: 'mm' },
  { key: 'bwgAxialPosition', label: 'BWG轴向位置', width: 140, unit: 'mm' },
  { key: 'radialGridRatio', label: '径向网格比', width: 120 },
  { key: 'feedingMethod', label: getFieldLabel('feedingMethod'), width: 120 },
  { key: 'compensationCoefficient', label: '补偿系数', width: 120 },
  { key: 'streamlineData', label: '流线数据', width: 120 },
]

// 创建数值范围筛选面板
function createNumberRangeFilterPanel(dataIndex: string, unit?: string) {
  return ({
    setSelectedKeys,
    confirm,
    clearFilters,
  }: any) => {
    // 初始化状态
    if (!filterPanelState[dataIndex]) {
      filterPanelState[dataIndex] = { min: null, max: null }
    }

    const handleSearch = () => {
      const filters: number[] = []
      const state = filterPanelState[dataIndex]
      if (state.min !== null && state.min !== undefined)
        filters.push(state.min)
      if (state.max !== null && state.max !== undefined)
        filters.push(state.max)
      setSelectedKeys(filters.length > 0 ? filters : [])
      confirm()
    }

    const handleReset = () => {
      filterPanelState[dataIndex] = { min: null, max: null }
      setSelectedKeys([])
      clearFilters()
    }

    return h('div', { style: 'padding: 8px' }, [
      h('div', { style: 'margin-bottom: 8px' }, [
        h(InputNumber as any, {
          'style': 'width: 100%; margin-bottom: 8px',
          'placeholder': `最小值${unit ? ` (${unit})` : ''}`,
          'value': filterPanelState[dataIndex].min,
          'onUpdate:value': (val: number | null) => {
            filterPanelState[dataIndex].min = val
          },
        }),
        h(InputNumber as any, {
          'style': 'width: 100%',
          'placeholder': `最大值${unit ? ` (${unit})` : ''}`,
          'value': filterPanelState[dataIndex].max,
          'onUpdate:value': (val: number | null) => {
            filterPanelState[dataIndex].max = val
          },
        }),
      ]),
      h(Space as any, { style: 'display: flex; justify-content: space-between; width: 100%' }, {
        default: () => [
          h(
            Button,
            {
              type: 'primary',
              size: 'small',
              onClick: handleSearch,
              icon: h(SearchOutlined),
            },
            { default: () => '筛选' },
          ),
          h(
            Button,
            {
              size: 'small',
              onClick: handleReset,
            },
            { default: () => '重置' },
          ),
        ],
      }),
    ])
  }
}

// 数值范围筛选函数
function numberRangeFilter(dataIndex: string) {
  return (_value: number, record: SchemeData) => {
    const filter = filterState[dataIndex]
    if (!filter || (filter.min === undefined && filter.max === undefined))
      return true

    const recordValue = record[dataIndex as keyof SchemeData] as number
    if (recordValue === undefined || recordValue === null)
      return false

    if (filter.min !== undefined && recordValue < filter.min)
      return false
    if (filter.max !== undefined && recordValue > filter.max)
      return false

    return true
  }
}

// 表格列定义
const columns = computed(() => {
  const baseColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      align: 'center' as const,
      fixed: 'left' as const,
    },
  ]

  const fieldColumns = fieldConfigs.map(config => ({
    title: config.label,
    dataIndex: config.key,
    key: config.key,
    width: config.width,
    align: 'right' as const,
    filterDropdown: createNumberRangeFilterPanel(config.key, config.unit),
    onFilter: numberRangeFilter(config.key),
  }))

  const resultColumns = [
    {
      title: '分离功率',
      dataIndex: 'sepPower',
      key: 'sepPower',
      width: 120,
      align: 'right' as const,
      fixed: 'right' as const,
      filterDropdown: createNumberRangeFilterPanel('sepPower', 'W'),
      onFilter: numberRangeFilter('sepPower'),
    },
    {
      title: '分离系数',
      dataIndex: 'sepFactor',
      key: 'sepFactor',
      width: 120,
      align: 'right' as const,
      fixed: 'right' as const,
      filterDropdown: createNumberRangeFilterPanel('sepFactor'),
      onFilter: numberRangeFilter('sepFactor'),
    },
  ]

  return [...baseColumns, ...fieldColumns, ...resultColumns]
})

// X 轴列定义（设计因子）- 包含所有 input.dat 中的字段
const xColumns = fieldConfigs.map(config => ({
  title: config.label,
  dataIndex: config.key,
  key: config.key,
}))

// Y 轴列定义（结果指标）- 分离功率和分离系数
const yColumns = [
  {
    title: '分离功率',
    dataIndex: 'sepPower',
    key: 'sepPower',
  },
  {
    title: '分离系数',
    dataIndex: 'sepFactor',
    key: 'sepFactor',
  },
]

// 确保最优方案行始终在顶部
function ensureOptimalRowFirst(data: SchemeData[]): SchemeData[] {
  const optimalRow = data.find(row => row.index === -1)
  const otherRows = data.filter(row => row.index !== -1)

  if (optimalRow) {
    return [optimalRow, ...otherRows]
  }
  return data
}

/**
 * 加载方案数据
 */
async function loadSchemes() {
  loading.value = true
  try {
    const data = await app.file.readMultiSchemes()

    console.log(data, 'data')

    // 确保最优方案行在顶部
    const sortedData = ensureOptimalRowFirst(data)

    schemes.value = sortedData
    filteredData.value = sortedData

    // 重置分页
    paginationConfig.current = 1

    if (data.length === 0) {
      message.warning('未找到任何方案数据文件')
    }
    else {
      message.success(`成功加载 ${data.length - 1} 个方案`)
    }
  }
  catch (error) {
    console.error('加载方案数据失败:', error)
    message.error(`加载方案数据失败: ${error instanceof Error ? error.message : String(error)}`)
  }
  finally {
    loading.value = false
  }
}

/**
 * 处理表格变化（筛选、分页）
 */
const handleTableChange: TableProps['onChange'] = (pagination, filters) => {
  // 更新分页配置
  if (pagination) {
    if (pagination.current !== undefined)
      paginationConfig.current = pagination.current
    if (pagination.pageSize !== undefined)
      paginationConfig.pageSize = pagination.pageSize
  }

  // 更新筛选状态
  Object.keys(filterState).forEach((key) => {
    delete filterState[key]
  })

  Object.keys(filters).forEach((key) => {
    const filterValues = filters[key]
    if (filterValues && filterValues.length > 0) {
      if (filterValues.length === 2) {
        filterState[key] = {
          min: filterValues[0] as number,
          max: filterValues[1] as number,
        }
      }
      else if (filterValues.length === 1) {
        // 如果只有一个值，判断是 min 还是 max
        // 根据筛选面板的状态来判断
        const panelState = filterPanelState[key]
        if (panelState) {
          if (panelState.min !== null && panelState.min !== undefined) {
            filterState[key] = { min: filterValues[0] as number }
          }
          else if (panelState.max !== null && panelState.max !== undefined) {
            filterState[key] = { max: filterValues[0] as number }
          }
        }
      }
    }
  })

  // 应用筛选
  let data = [...schemes.value]

  // 应用筛选
  Object.keys(filterState).forEach((key) => {
    const filter = filterState[key]
    if (filter && (filter.min !== undefined || filter.max !== undefined)) {
      data = data.filter((record) => {
        const value = record[key as keyof SchemeData] as number
        if (value === undefined || value === null)
          return false
        if (filter.min !== undefined && value < filter.min)
          return false
        if (filter.max !== undefined && value > filter.max)
          return false
        return true
      })
    }
  })

  // 确保最优方案行始终在顶部
  data = ensureOptimalRowFirst(data)

  filteredData.value = data

  // 分页切换时滚动到顶部
  nextTick(() => {
    const tableEl = document.querySelector('.ant-table-body')
    if (tableEl) {
      tableEl.scrollTop = 0
    }
  })
}

/**
 * 格式化数值显示
 */
function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined)
    return '-'
  return value.toFixed(decimals)
}

/**
 * 判断是否为最优方案行（第一行，序号为 '*'）
 */
function isMaxSepPowerRow(record: SchemeData): boolean {
  return isOptimalSchemeRow(record)
}

function handleTabChange(key: string) {
  activeKey.value = key
}

onMounted(() => {
  loadSchemes()
})
</script>

<template>
  <div class="multi-scheme-container">
    <a-card>
      <template #title>
        <a-space>
          <span>多方案对比</span>
          <a-button type="link" size="small" :loading="loading" @click="loadSchemes">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="columns" :data-source="filteredData" :loading="loading" :pagination="paginationConfig"
        :row-class-name="(record) => isMaxSepPowerRow(record) ? 'optimal-row' : ''" row-key="index" size="small"
        :scroll="{ x: 'max-content' }" @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">
            {{ record.index === -1 ? '*' : record.index + 1 }}
          </template>
          <template v-else-if="column.key === 'fileName'">
            {{ record.fileName }}
          </template>
          <template v-else-if="column.key === 'sepPower'">
            <span :class="{ 'max-power': isOptimalSchemeRow(record) }">
              {{ formatNumber(record.sepPower) }} W
            </span>
          </template>
          <template v-else-if="column.key === 'sepFactor'">
            {{ formatNumber(record.sepFactor, 4) }}
          </template>
          <template v-else>
            <template v-for="config in fieldConfigs" :key="config.key">
              <template v-if="column.key === config.key">
                {{ formatNumber(record[config.key as keyof SchemeData] as number) }}
                <span v-if="config.unit" class="unit">{{ config.unit }}</span>
              </template>
            </template>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 方案对比图表 -->
    <a-tabs v-model:active-key="activeKey" @change="handleTabChange">
      <a-tab-pane key="1" tab="方案对比">
        <a-card>
          <template #title>
            <span>方案对比图表</span>
          </template>
          <SchemeChart :data="filteredData" :x-columns="xColumns" :y-columns="yColumns" />
        </a-card>
      </a-tab-pane>
      <a-tab-pane key="2" tab="方案修正">
        <InitialDesign />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.multi-scheme-container {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.max-power {
  font-weight: 600;
  color: #ff4d4f;
}

:deep(.ant-table-tbody > tr) {
  transition: background-color 0.2s;
}

:deep(.ant-table-tbody > tr:hover) {
  background-color: #f5f5f5;
}

:deep(.ant-table-tbody > tr.optimal-row) {
  background-color: #f6ffed !important;
}

:deep(.ant-table-tbody > tr.optimal-row:hover) {
  background-color: #d9f7be !important;
}

.unit {
  margin-left: 4px;
  color: #999;
  font-size: 12px;
}
</style>

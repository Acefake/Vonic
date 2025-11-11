<script setup lang="ts">
import type { TableProps } from 'ant-design-vue'
import { Button, message } from 'ant-design-vue'
import { cloneDeep } from 'lodash-es'
import { storeToRefs } from 'pinia'

import { computed, h, nextTick, onMounted, ref } from 'vue'
import app from '../../app/index'
import SchemeChart from '../../components/SchemeChart/index.vue'
import { useSchemeOptimizationStore } from '../../store'
import { FIELD_LABELS, getFieldLabel } from '../../utils/field-labels'
import InitialDesign from '../InitialDesign/index.vue'

interface SchemeData {
  index: number // -1 表示最优方案（第一行），显示为 '*'；其他为原始序号
  originalIndex?: number // 最优方案的原始序号（当 index === -1 时使用）
  fileName: string
  isOptimalCopy?: boolean // 标记是否为最优方案的副本（第一行）
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

// 行选择相关
const selectedRowKeys = ref<(string | number)[]>([])
const selectedRows = ref<SchemeData[]>([])

// 方案对比：多选数据（用于雷达图）
const comparisonSelectedData = computed(() => {
  if (activeKey.value === '1') {
    return selectedRows.value
  }
  return []
})

// 方案修正：单选数据（用于数据修正）
const correctionSelectedData = computed(() => {
  if (activeKey.value === '2') {
    return selectedRows.value.length > 0 ? selectedRows.value[0] : null
  }
  return null
})

// 判断是否为最优方案行（index === -1 表示最优方案，需要高亮）
function isOptimalSchemeRow(record: any): boolean {
  return record && record.index === -1
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

// 反查：根据中文标签获取字段 key
function getFieldKeyByLabel(label: string): string | null {
  for (const [key, map] of Object.entries(FIELD_LABELS)) {
    if (map['zh-CN'] === label)
      return key
  }
  return null
}

// 从方案优化中获取当前选中的设计因子，转换为字段 key 列表
const schemeOptimizationStore = useSchemeOptimizationStore()
const { designFactors } = storeToRefs(schemeOptimizationStore)
const selectedDesignFactorKeys = computed<string[]>(() => {
  const keys = designFactors.value
    .map(f => getFieldKeyByLabel(f.name))
    .filter((k): k is string => !!k)
  return keys
})

// 获取某列的所有唯一值（去重）
function getUniqueValues(dataIndex: string): any[] {
  const values = schemes.value
    .map(record => record[dataIndex as keyof SchemeData])
    .filter((value): value is number => value !== null && value !== undefined)

  // 使用Set去重，然后排序
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b)
  return uniqueValues
}

// 创建基于唯一值的筛选面板
function createUniqueValueFilterPanel(dataIndex: string) {
  return ({
    setSelectedKeys,
    selectedKeys,
    confirm,
  }: any) => {
    const uniqueValues = getUniqueValues(dataIndex)

    const handleCheckboxChange = (value: any, checked: boolean) => {
      const newKeys = checked
        ? [...selectedKeys, value]
        : selectedKeys.filter((k: any) => k !== value)
      setSelectedKeys(newKeys)
      // 选中即生效
      confirm({ closeDropdown: false })
    }

    return h('div', { style: 'max-height: 300px; display: flex; flex-direction: column; min-width: 150px' }, [
      // 重置按钮放在顶部
      h('div', { style: 'padding: 8px; border-bottom: 1px solid #e8e8e8' }, [
        h(
          Button,
          {
            size: 'small',
            block: true,
            onClick: () => {
              setSelectedKeys([])
              confirm({ closeDropdown: true })
            },
          },
          { default: () => '重置' },
        ),
      ]),
      // 可滚动的选项列表
      h('div', { style: 'padding: 8px; overflow-y: auto; flex: 1' }, uniqueValues.map(value =>
        h('div', {
          key: value,
          style: 'padding: 4px 0; cursor: pointer; display: flex; align-items: center;',
          onClick: (e: Event) => {
            e.preventDefault()
            const checked = !selectedKeys.includes(value)
            handleCheckboxChange(value, checked)
          },
        }, [
          h('input', {
            type: 'checkbox',
            checked: selectedKeys.includes(value),
            style: 'margin-right: 8px; pointer-events: none;',
          }),
          h('span', {}, value.toString()),
        ]),
      )),
    ])
  }
}

// 基于唯一值的筛选函数
function uniqueValueFilter(dataIndex: string) {
  return (value: any, record: SchemeData) => {
    const recordValue = record[dataIndex as keyof SchemeData]
    return recordValue === value
  }
}

// 表格列定义
const columns = computed(() => {
  const baseColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      align: 'center' as const,
    },
  ]

  // 仅显示方案优化中选中的设计因子对应的列
  const activeFieldConfigs = fieldConfigs.filter(cfg => selectedDesignFactorKeys.value.includes(cfg.key))

  // 深拷贝避免修改原始数据和被引用
  const fieldColumns = cloneDeep(activeFieldConfigs).map(config => ({
    title: config.unit ? `${config.label}(${config.unit})` : config.label,
    dataIndex: config.key,
    key: config.key,
    width: config.width,
    align: 'right' as const,
    filterDropdown: createUniqueValueFilterPanel(config.key),
    onFilter: uniqueValueFilter(config.key),
  }))

  // const resultFields = app.productConfig.resultFields

  const resultColumns = [
    {
      title: app.productConfig.resultFields?.[0]?.label,
      dataIndex: app.productConfig.resultFields?.[0]?.field,
      key: app.productConfig.resultFields?.[0]?.field,
      width: 120,
      align: 'right' as const,
      filterDropdown: createUniqueValueFilterPanel(app.productConfig.resultFields?.[0]?.field ?? ''),
      onFilter: uniqueValueFilter(app.productConfig.resultFields?.[0]?.field ?? ''),
    },
    {
      title: app.productConfig.resultFields?.[1]?.label,
      dataIndex: app.productConfig.resultFields?.[1]?.field,
      key: app.productConfig.resultFields?.[1]?.field,
      width: 120,
      align: 'right' as const,
      filterDropdown: createUniqueValueFilterPanel(app.productConfig.resultFields?.[1]?.field ?? ''),
      onFilter: uniqueValueFilter(app.productConfig.resultFields?.[1]?.field ?? ''),
    },
  ]

  return [...baseColumns, ...fieldColumns, ...resultColumns]
})

// X 轴列定义（设计因子）- 仅包含方案优化选中的设计因子
const xColumns = computed(() => {
  const activeFieldConfigs = fieldConfigs.filter(cfg => selectedDesignFactorKeys.value.includes(cfg.key))
  return activeFieldConfigs.map(config => ({
    title: config.label,
    dataIndex: config.key,
    key: config.key,
  }))
})

// 结果字段（用于表格和图表 Y 轴）
const resultFields = computed(() => app.productConfig.resultFields ?? [])

// Y 轴列定义（结果指标）- 基于产品配置
const yColumns = computed(() => {
  if (resultFields.value.length > 0) {
    return resultFields.value.map(f => ({
      title: f.label,
      dataIndex: f.field,
      key: f.field,
    }))
  }
  // 回退到默认（兼容旧数据）
  return [
    { title: '分离功率', dataIndex: 'sepPower', key: 'sepPower' },
    { title: '分离系数', dataIndex: 'sepFactor', key: 'sepFactor' },
  ]
})

// 辅助：首个结果字段 key（用于高亮最优行）
const firstResultFieldKey = computed(() => resultFields.value[0]?.field ?? 'sepPower')

// 保持数据原有顺序（最优方案保持在原位置）
function maintainOriginalOrder(data: SchemeData[]): SchemeData[] {
  // 按 index 排序，但 -1（最优方案）保持在其原始位置
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

    // 保持原有顺序（最优方案保持在原位置）
    const sortedData = maintainOriginalOrder(data)

    schemes.value = sortedData
    filteredData.value = sortedData

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
const handleTableChange: TableProps['onChange'] = (_pagination, filters) => {
  let data = [...schemes.value]

  Object.keys(filters).forEach((key) => {
    const filterValues = filters[key]
    if (Array.isArray(filterValues) && filterValues.length > 0) {
      data = data.filter((record: SchemeData) => {
        const value = record[key as keyof SchemeData]
        return filterValues.includes(value as any)
      })
    }
  })

  // 保持原有顺序（最优方案保持在原位置）
  data = maintainOriginalOrder(data)

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
 * 判断是否为最优方案行（第一行，序号为 '*'）
 */
function isMaxSepPowerRow(record: any): boolean {
  return isOptimalSchemeRow(record)
}

function handleTabChange(key: any): void {
  activeKey.value = key
  // 切换标签页时清空选择
  selectedRowKeys.value = []
  selectedRows.value = []
}

// 处理行选择变化
function handleRowSelectionChange(selectedKeys: (string | number)[], selectedRowsData: SchemeData[]) {
  selectedRowKeys.value = selectedKeys
  selectedRows.value = selectedRowsData
}

// 计算行选择配置
const rowSelection = computed(() => {
  // 方案对比（tab 1）不显示选择框，方案修正（tab 2）显示单选
  if (activeKey.value === '1') {
    return undefined
  }
  return {
    type: 'radio' as const,
    selectedRowKeys: selectedRowKeys.value,
    onChange: handleRowSelectionChange,
  }
})

/**
 * 提交方案
 */
// async function handleSubmitScheme() {
//   if (!correctionSelectedData.value) {
//     message.warning('请先选择一个方案')
//     return
//   }

//   try {
//     const scheme = correctionSelectedData.value

//     // 构建设计表单数据
//     const designForm = {
//       angularVelocity: scheme.angularVelocity,
//       rotorRadius: scheme.rotorRadius,
//       rotorShoulderLength: scheme.rotorShoulderLength,
//       rotorSidewallPressure: scheme.rotorSidewallPressure,
//       gasDiffusionCoefficient: scheme.gasDiffusionCoefficient,
//       feedFlowRate: scheme.feedFlowRate,
//       splitRatio: scheme.splitRatio,
//       feedingMethod: scheme.feedingMethod,
//       depletedEndCapTemperature: scheme.depletedEndCapTemperature,
//       enrichedEndCapTemperature: scheme.enrichedEndCapTemperature,
//       feedAxialDisturbance: scheme.feedAxialDisturbance,
//       feedAngularDisturbance: scheme.feedAngularDisturbance,
//       depletedMechanicalDriveAmount: scheme.depletedMechanicalDriveAmount,
//       extractionChamberHeight: scheme.extractionChamberHeight,
//       enrichedBaffleHoleDiameter: scheme.enrichedBaffleHoleDiameter,
//       feedBoxShockDiskHeight: scheme.feedBoxShockDiskHeight,
//       depletedExtractionArmRadius: scheme.depletedExtractionArmRadius,
//       depletedExtractionPortInnerDiameter: scheme.depletedExtractionPortInnerDiameter,
//       depletedBaffleInnerHoleOuterDiameter: scheme.depletedBaffleInnerHoleOuterDiameter,
//       enrichedBaffleHoleDistributionCircleDiameter: scheme.enrichedBaffleHoleDistributionCircleDiameter,
//       depletedExtractionPortOuterDiameter: scheme.depletedExtractionPortOuterDiameter,
//       depletedBaffleOuterHoleInnerDiameter: scheme.depletedBaffleOuterHoleInnerDiameter,
//       minAxialDistance: scheme.minAxialDistance,
//       depletedBaffleAxialPosition: scheme.depletedBaffleAxialPosition,
//       depletedBaffleOuterHoleOuterDiameter: scheme.depletedBaffleOuterHoleOuterDiameter,
//       innerBoundaryMirrorPosition: scheme.innerBoundaryMirrorPosition,
//       gridGenerationMethod: scheme.gridGenerationMethod,
//       bwgRadialProtrusionHeight: scheme.bwgRadialProtrusionHeight,
//       bwgAxialHeight: scheme.bwgAxialHeight,
//       bwgAxialPosition: scheme.bwgAxialPosition,
//       radialGridRatio: scheme.radialGridRatio,
//       compensationCoefficient: scheme.compensationCoefficient,
//       streamlineData: scheme.streamlineData,
//       separationPower: scheme.sepPower,
//       separationFactor: scheme.sepFactor,
//     }

//     const res = await app.file.writeDatFile('input.dat', designForm)
//     if (res?.code === 0) {
//       message.success('提交方案成功，已生成输入文件')
//     }
//     else {
//       message.error(res?.message ?? '生成输入文件失败')
//     }
//   }
//   catch (error) {
//     console.error('提交方案失败:', error)
//     message.error(`提交方案失败: ${error instanceof Error ? error.message : String(error)}`)
//   }
// }

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
        </a-space>
      </template>

      <a-table
        :columns="columns" :data-source="filteredData" :loading="loading" :pagination="false"
        :row-class-name="(record) => isMaxSepPowerRow(record) ? 'optimal-row' : ''"
        :row-key="(record) => `${record.index}_${record.fileName}`" size="small" :scroll="{ x: 'max-content', y: 520 }" sticky
        :row-selection="rowSelection" @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">
            {{ record.index === -1 ? '*' : record.index + 1 }}
          </template>
          <template v-else-if="column.key === 'fileName'">
            {{ record.fileName }}
          </template>
          <!-- 动态结果字段渲染，首个结果字段在最优行时高亮 -->
          <template v-else-if="app.productConfig.resultFields?.some(f => f.field === column.key)">
            <span :class="{ 'max-power': isOptimalSchemeRow(record) && column.key === firstResultFieldKey }">
              {{ record[column.key as keyof SchemeData] as number }}
            </span>
          </template>
          <template v-else>
            <template v-for="config in fieldConfigs" :key="config.key">
              <template v-if="column.key === config.key">
                {{ record[config.key as keyof SchemeData] as number }}
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
          <SchemeChart
            :data="comparisonSelectedData.length > 0 ? comparisonSelectedData : filteredData"
            :x-columns="xColumns" :y-columns="yColumns"
          />
        </a-card>
      </a-tab-pane>
      <a-tab-pane key="2" tab="方案修正">
        <InitialDesign :selected-scheme="correctionSelectedData" :show-button="false" />
      </a-tab-pane>
    </a-tabs>

    <!-- 底部提交方案按钮 -->
    <!-- <div v-if="activeKey === '2'" class="bottom-actions">
      <div class="action-row">
        <a-button type="primary" size="large" @click="handleSubmitScheme">
          提交方案
        </a-button>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.multi-scheme-container {
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.optimal-row {
  background-color: #f6ffed !important;
  font-weight: 600;
}

.max-power {
  color: #52c41a;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr.optimal-row > td),
:deep(.ant-table-tbody > tr.optimal-row.ant-table-row:hover > td),
:deep(.ant-table-tbody > tr.optimal-row.ant-table-row-hover > td) {
  background-color: #f6ffed !important;
}
</style>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import app from '../../app/index'
import SchemeChart from '../../components/SchemeChart/index.vue'
import { useMPhysSimDesignStore } from '../../store/mPhysSimDesignStore'
import { useMultiSchemeStore } from '../../store/msStore'
import { usePowerAnalysisDesignStore } from '../../store/powerAnalysisDesignStore'
import { getFieldLabel } from '../../utils/field-labels'
import InitialDesign from '../InitialDesign/index.vue'
import PowerAnalysisDesign from '../PowerAnalysisDesign/index.vue'

// 方案数据接口 - 支持动态字段
export interface SchemeData {
  // 必需的基础字段
  index: number // -1 表示最优方案（第一行），显示为 '*'；其他为原始序号
  fileName: string
  sepPower: number | null
  sepFactor: number | null

  // 可选的基础字段
  originalIndex?: number // 最优方案的原始序号（当 index === -1 时使用）
  isOptimalCopy?: boolean // 标记是否为最优方案的副本（第一行）

  // 动态字段支持 - 允许任意其他字段
  [key: string]: any
}

const multiSchemeStore = useMultiSchemeStore()
const designStoreAny: any = app.productConfig.id === 'powerAnalysis' ? usePowerAnalysisDesignStore() : useMPhysSimDesignStore()
const { schemes, loading, filteredData, activeKey, selectedRowKeys, selectedRows, columns, xColumns, hasLoaded, outFingerprint } = storeToRefs(multiSchemeStore)

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

// 根据产品类型定义字段配置
const fieldConfigs = computed(() => {
  const isPowerAnalysis = app.productConfig.id === 'powerAnalysis'

  // 共同字段（两种产品都有的字段）- 使用文件字段名
  const commonFields = [
    { key: 'DegSpeed', label: getFieldLabel('DegSpeed'), width: 120, unit: 'Hz' },
    { key: 'RotorRadius', label: getFieldLabel('RotorRadius'), width: 120, unit: 'mm' },
    { key: 'TackHeight', label: getFieldLabel('TackHeight'), width: 140, unit: 'mm' },
    { key: 'RotorPressure', label: getFieldLabel('RotorPressure'), width: 140, unit: 'Pa' },
    // 流量字段根据产品类型动态显示
    ...(isPowerAnalysis
      ? [{ key: 'PowerFlow', label: getFieldLabel('PowerFlow'), width: 120, unit: 'kg/s' }]
      : [{ key: 'FeedFlow', label: getFieldLabel('FeedFlow'), width: 120, unit: 'kg/s' }]
    ),
    { key: 'RichBaffleArrayHoleDiam', label: getFieldLabel('RichBaffleArrayHoleDiam'), width: 180, unit: 'mm' },
    { key: 'RichBaffleHoleDiam', label: getFieldLabel('RichBaffleHoleDiam'), width: 140, unit: 'mm' },
    { key: 'PoorTackInnerRadius', label: getFieldLabel('PoorTackInnerRadius'), width: 160, unit: 'mm' },
    { key: 'PoorTackOuterRadius', label: getFieldLabel('PoorTackOuterRadius'), width: 160, unit: 'mm' },
  ]

  // 功率分析特有字段 - 使用文件字段名
  const powerAnalysisFields = [
    { key: 'Temperature', label: getFieldLabel('Temperature'), width: 140, unit: 'K' },
    { key: 'RichBaffleTemp', label: getFieldLabel('RichBaffleTemp'), width: 160, unit: 'K' },
    { key: 'PoorTackRootOuterRadius', label: getFieldLabel('PoorTackRootOuterRadius'), width: 180, unit: 'mm' },
    { key: 'TackAttkAngle', label: getFieldLabel('TackAttkAngle'), width: 140, unit: 'rad' },
    { key: 'PoorTackDistance', label: getFieldLabel('PoorTackDistance'), width: 160, unit: 'mm' },
    { key: 'RichTackDistance', label: getFieldLabel('RichTackDistance'), width: 160, unit: 'mm' },
    { key: 'EvenSectionPipeLength', label: getFieldLabel('EvenSectionPipeLength'), width: 180, unit: 'mm' },
    { key: 'TackChamferAngle', label: getFieldLabel('TackChamferAngle'), width: 140, unit: 'rad' },
    { key: 'ChangeSectionPipeLength', label: getFieldLabel('ChangeSectionPipeLength'), width: 180, unit: 'mm' },
    { key: 'PipeRadius', label: getFieldLabel('PipeRadius'), width: 140, unit: 'mm' },
    { key: 'TackSurfaceRoughness', label: getFieldLabel('TackSurfaceRoughness'), width: 160, unit: 'mm' },
    { key: 'TackTaperAngle', label: getFieldLabel('TackTaperAngle'), width: 140, unit: 'rad' },
  ]

  // 多物理场数值模拟仿真计算特有字段 - 使用文件字段名
  const mPhysSimFields = [
    { key: 'RotorLength', label: getFieldLabel('RotorLength'), width: 140, unit: 'mm' },
    { key: 'GasParam', label: getFieldLabel('GasParam'), width: 140 },
    { key: 'PoorCoverTemp', label: getFieldLabel('PoorCoverTemp'), width: 140, unit: 'K' },
    { key: 'RichCoverTemp', label: getFieldLabel('RichCoverTemp'), width: 140, unit: 'K' },
    { key: 'PoorDrive', label: getFieldLabel('PoorDrive'), width: 160, unit: 'mm' },
    { key: 'PoorArmRadius', label: getFieldLabel('PoorArmRadius'), width: 160, unit: 'mm' },
    { key: 'innerBoundaryMirrorPosition', label: '内边界镜像位置', width: 140, unit: 'mm' },
    { key: 'gridGenerationMethod', label: '网格生成方式', width: 120 },
    { key: 'FeedBoxAndPoorInterval', label: getFieldLabel('FeedBoxAndPoorInterval'), width: 200, unit: 'mm' },
    { key: 'FeedBoxHeight', label: getFieldLabel('FeedBoxHeight'), width: 160, unit: 'mm' },
    { key: 'SplitRatio', label: getFieldLabel('SplitRatio'), width: 100 },
    { key: 'FeedDegDist', label: getFieldLabel('FeedDegDist'), width: 140, unit: 'mm' },
    { key: 'FeedAxialDist', label: getFieldLabel('FeedAxialDist'), width: 140, unit: 'mm' },
    { key: 'PoorBaffleInnerHoleOuterRadius', label: getFieldLabel('PoorBaffleInnerHoleOuterRadius'), width: 200, unit: 'mm' },
    { key: 'PoorBaffleOuterHoleInnerRadius', label: getFieldLabel('PoorBaffleOuterHoleInnerRadius'), width: 200, unit: 'mm' },
    { key: 'PoorBaffleOuterHoleOuterRadius', label: getFieldLabel('PoorBaffleOuterHoleOuterRadius'), width: 200, unit: 'mm' },
    { key: 'PoorBaffleAxialSpace', label: getFieldLabel('PoorBaffleAxialSpace'), width: 160, unit: 'mm' },
    { key: 'bwgRadialProtrusionHeight', label: 'BWG径向凸起高度', width: 140, unit: 'mm' },
    { key: 'bwgAxialHeight', label: 'BWG轴向高度', width: 120, unit: 'mm' },
    { key: 'bwgAxialPosition', label: 'BWG轴向位置', width: 140, unit: 'mm' },
    { key: 'radialGridRatio', label: '径向网格比', width: 120 },
    { key: 'FeedMethod', label: getFieldLabel('FeedMethod'), width: 120 },
    { key: 'compensationCoefficient', label: '补偿系数', width: 120 },
    { key: 'streamlineData', label: '流线数据', width: 120 },
  ]

  // 根据产品类型返回对应的字段配置
  if (isPowerAnalysis) {
    return [...commonFields, ...powerAnalysisFields]
  }
  else {
    // 多物理场数值模拟仿真计算包含所有字段
    return [...commonFields, ...powerAnalysisFields, ...mPhysSimFields]
  }
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
  const fp = await app.file.getOutFingerprint()
  if (hasLoaded.value && outFingerprint.value === fp)
    return
  loading.value = true
  try {
    const rawData = await app.file.readMultiSchemes()

    // 主进程已经使用文件字段名，无需转换
    const sortedData = maintainOriginalOrder(rawData)

    multiSchemeStore.$patch(() => {
      schemes.value = sortedData
      filteredData.value = sortedData
      hasLoaded.value = true
      outFingerprint.value = fp
    })

    if (rawData.length === 0) {
      message.warning('未找到任何方案数据文件')
    }
    else {
      message.success(`成功加载 ${rawData.length - 1} 个方案`)
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
 * 判断是否为最优方案行（第一行，序号为 '*'）
 */
function isMaxSepPowerRow(record: any): boolean {
  return isOptimalSchemeRow(record)
}

function handleTabChange(key: any): void {
  multiSchemeStore.$patch(() => {
    activeKey.value = key
    // 切换标签页时清空选择
    selectedRowKeys.value = []
    selectedRows.value = []
  })
}

// 处理行选择变化
function handleRowSelectionChange(selectedKeys: (string | number)[], selectedRowsData: SchemeData[]) {
  multiSchemeStore.$patch(() => {
    selectedRowKeys.value = selectedKeys
    selectedRows.value = selectedRowsData
  })

  const row = selectedRowsData[0]
  if (row) {
    // 🔧 修复：同时更新 formData 和 outputResults，确保表单正确填充
    // 提取所有设计参数（排除内部字段和结果字段）
    const formDataPayload: Record<string, any> = {}
    const excludeKeys = ['index', 'fileName', 'originalIndex', 'isOptimalCopy', 'sepPower', 'sepFactor', 'key']

    Object.keys(row).forEach((key) => {
      if (!excludeKeys.includes(key)) {
        formDataPayload[key] = (row as any)[key]
      }
    })

    // 更新表单数据
    designStoreAny.updateFormData(formDataPayload)

    // 更新输出结果
    if (app.productConfig.id === 'powerAnalysis') {
      const payload: Record<string, number | undefined> = {}
      const rf = app.productConfig.resultFields ?? []
      for (const f of rf) {
        if (!f.field)
          continue
        const storeKey = f.field.charAt(0).toLowerCase() + f.field.slice(1)
        payload[storeKey] = (row as any)[f.field] ?? undefined
      }
      designStoreAny.updateOutputResults(payload)
    }
    else {
      designStoreAny.updateOutputResults({
        sepPower: (row as any).sepPower ?? undefined,
        sepFactor: (row as any).sepFactor ?? undefined,
      })
    }
  }
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

const initialDesignRef = ref<InstanceType<typeof InitialDesign>>()
const componentValue = app.productConfig.id === 'mPhysSim' ? InitialDesign : PowerAnalysisDesign

/**
 * 接收子组件（InitialDesign）提交成功事件，更新当前选中行
 */
function onDesignSubmitted(payload: { formData: any, outputResults: any }) {
  const row = correctionSelectedData.value
  if (!row)
    return

  // 更新选中行的各字段 - 直接使用 payload.formData，因为现在都使用文件字段名
  const updates: Partial<SchemeData> = {
    ...payload.formData,
  }

  // 根据产品类型更新结果字段
  if (app.productConfig.id === 'powerAnalysis') {
    // powerAnalysis 的结果字段：PoorTackPower 和 TackPower
    const rf = app.productConfig.resultFields ?? []
    for (const f of rf) {
      if (!f.field)
        continue
      // 将 store 中的字段名（如 poorTackPower）转换为表格中的字段名（如 PoorTackPower）
      const storeKey = f.field.charAt(0).toLowerCase() + f.field.slice(1)
      const value = payload.outputResults[storeKey]
      if (value !== undefined && value !== null) {
        updates[f.field] = value
      }
    }
  }
  else {
    // mPhysSim 的结果字段：sepPower 和 sepFactor
    updates.sepPower = payload.outputResults.sepPower ?? row.sepPower
    updates.sepFactor = payload.outputResults.sepFactor ?? row.sepFactor
  }

  // 定位在 schemes 中的相应行
  const keyOf = (r: SchemeData) => `${r.index}_${r.fileName}`
  const targetKey = keyOf(row)
  const si = schemes.value.findIndex(r => keyOf(r) === targetKey)

  multiSchemeStore.$patch(() => {
    if (si >= 0) {
      schemes.value[si] = { ...schemes.value[si], ...updates }
    }
    // 同步 filteredData（保持当前筛选结果）
    const fi = filteredData.value.findIndex(r => keyOf(r) === targetKey)
    if (fi >= 0) {
      filteredData.value[fi] = { ...filteredData.value[fi], ...updates }
    }

    // 🔧 关键修复：同步更新 selectedRows，确保选中行数据也是最新的
    if (selectedRows.value.length > 0) {
      const selectedIndex = selectedRows.value.findIndex(r => keyOf(r) === targetKey)
      if (selectedIndex >= 0) {
        selectedRows.value[selectedIndex] = { ...selectedRows.value[selectedIndex], ...updates }
      }
    }
  })

  // 🔧 关键修复：同步更新对应的设计 Store，确保数据一致性
  designStoreAny.updateFormData(payload.formData)
  designStoreAny.updateOutputResults(payload.outputResults)

  // 🔧 触发数据对比页面更新：通过全局事件通知数据变化
  window.dispatchEvent(new CustomEvent('multiSchemeDataUpdated', {
    detail: { updatedRow: row, updates },
  }))

  message.success('已更新多方案对比表格中的该条数据')
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
        </a-space>
      </template>

      <a-table
        bordered
        :columns="columns" :data-source="filteredData" :pagination="false"
        :row-class-name="(record) => isMaxSepPowerRow(record) ? 'optimal-row' : ''"
        :row-key="(record) => `${record.index}_${record.fileName}`" size="small" :scroll="{ x: 'max-content', y: 520 }" sticky
        :row-selection="rowSelection"
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
        <div style="margin-bottom: 10px;">
          <a-button type="primary" :disabled="!correctionSelectedData" @click="initialDesignRef?.submitDesign">
            提交方案
          </a-button>
        </div>

        <component
          :is="componentValue"
          ref="initialDesignRef"
          :selected-scheme="correctionSelectedData"
          :show-button="false"
          @submitted="onDesignSubmitted"
        />
      </a-tab-pane>
    </a-tabs>
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

<!-- 数据统计组件 -->
<script setup lang="ts">
import type { StatisticalMethod, TableColumn, TableDataRow } from './types'

import { message } from 'ant-design-vue'
import { computed, nextTick, ref, watch } from 'vue'

import { calculateStatistics } from './utils'

interface Props {
  tableColumns?: TableColumn[]
  tableData?: TableDataRow[]
}

interface Emits {
  (e: 'update:tableData', value: TableDataRow[]): void
}

const props = withDefaults(defineProps<Props>(), {
  tableColumns: () => [],
  tableData: () => [],
})

const emit = defineEmits<Emits>()

// 统计方法
const statisticalMethod = ref<StatisticalMethod>('均方差')
const statisticalMethodOptions: StatisticalMethod[] = ['均方差', '最大偏差']

// 判断是否有数据
const hasData = computed(() => props.tableData.length > 0)

// 监控数据变化（调试用）
watch(() => props.tableData, (newData) => {
  console.log('[DataStatistics] tableData 更新:', {
    dataCount: newData.length,
    columnsCount: props.tableColumns.length,
  })
}, { immediate: true })

// 表格滚动配置 - 只设置横向滚动，不限制高度
const scrollConfig = computed(() => {
  if (!hasData.value) {
    return undefined
  }
  return {
    x: 'max-content', // 只设置横向滚动
  }
})

// 统计计算
async function handleStatisticsCalculate(): Promise<void> {
  if (props.tableData.length === 0) {
    message.warning('请先导入试验数据文件')
    return
  }

  // 过滤掉已有的统计行（统计行的序号是字符串类型，如 '均方差'）
  const dataRows = props.tableData.filter((row) => {
    const seqNum = row.序号
    // 数据行：序号是数字或可以转为数字的字符串
    // 统计行：序号是 '均方差' 或 '最大偏差'
    return seqNum !== '均方差' && seqNum !== '最大偏差'
  })

  // 计算统计结果
  const statisticsRow = calculateStatistics(
    dataRows,
    props.tableColumns.map(col => col.dataIndex),
    statisticalMethod.value,
  )

  // 添加到表格末尾
  emit('update:tableData', [...dataRows, statisticsRow])

  message.success('统计计算完成！')

  // 滚动到底部显示新添加的统计行
  await nextTick()
  const tabPane = document.querySelector('.ant-tabs-tabpane')
  if (tabPane) {
    tabPane.scrollTop = tabPane.scrollHeight
  }
}
</script>

<template>
  <div class="statistics-panel">
    <!-- 统计方法配置 -->
    <div class="config-section">
      <div class="config-item">
        <span class="label">统计方法：</span>
        <a-select
          v-model:value="statisticalMethod"
          style="width: 150px"
          :options="statisticalMethodOptions.map(m => ({ label: m, value: m }))"
        />
      </div>
    </div>

    <!-- 试验数据表格 -->
    <div class="table-section">
      <div class="table-header">
        <span class="table-title">试验数据</span>
        <a-button type="primary" @click="handleStatisticsCalculate">
          统计计算
        </a-button>
      </div>
      <div class="table-wrapper" :class="{ 'has-data': hasData }">
        <a-table
          :columns="tableColumns"
          :data-source="tableData"
          :pagination="false"
          :scroll="scrollConfig"
          :bordered="hasData"
          size="small"
          class="data-table"
        >
          <template #emptyText>
            <div class="empty-state">
              <a-empty description="暂无数据，请导入试验数据文件" />
            </div>
          </template>
        </a-table>
      </div>
    </div>
  </div>
  <!-- 底部按钮区域 - 移到外层，固定在底部 -->
</template>

<style scoped>
.statistics-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 16px 0; /* 右侧和底部留白，避免滚动条紧贴边缘 */
}

.config-section {
  flex-shrink: 0;
  padding: 12px 0;
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
  min-width: 90px;
}

.table-section {
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 8px 0;
  margin-bottom: 8px;
}

.table-title {
  font-weight: 500;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
}

.table-wrapper {
  min-height: 200px;
}

.data-table {
  width: 100%;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  padding: 40px 20px;
  background: transparent;
}

.empty-state :deep(.ant-empty) {
  margin: 0;
}

.empty-state :deep(.ant-empty-description) {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

.table-wrapper:not(.has-data) {
  background: transparent;
}

.table-wrapper:not(.has-data) .data-table :deep(.ant-table) {
  background: transparent;
}
</style>

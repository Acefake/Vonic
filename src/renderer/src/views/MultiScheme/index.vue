<script setup lang="ts">
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

import { useApp } from '../../app'
import SchemeChart from '../../components/SchemeChart/index.vue'

interface SchemeData {
  index: number // -1 表示最优方案，显示为 '*'
  fileName: string
  angularVelocity: number
  feedFlowRate: number
  feedAxialDisturbance: number
  sepPower: number | null
  sepFactor: number | null
}

const app = useApp()

const schemes = ref<SchemeData[]>([])
const loading = ref(false)

// 判断是否为最优方案行（index === -1 表示最优方案，需要高亮）
function isOptimalSchemeRow(record: SchemeData): boolean {
  return record.index === -1
}

// 表格列定义
const columns = [
  {
    title: '序号',
    dataIndex: 'index',
    key: 'index',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '角速度',
    dataIndex: 'angularVelocity',
    key: 'angularVelocity',
    width: 120,
    align: 'right' as const,
    sorter: (a: SchemeData, b: SchemeData) => a.angularVelocity - b.angularVelocity,
  },
  {
    title: '供料流量',
    dataIndex: 'feedFlowRate',
    key: 'feedFlowRate',
    width: 120,
    align: 'right' as const,
    sorter: (a: SchemeData, b: SchemeData) => a.feedFlowRate - b.feedFlowRate,
  },
  {
    title: '供料轴向扰动',
    dataIndex: 'feedAxialDisturbance',
    key: 'feedAxialDisturbance',
    width: 140,
    align: 'right' as const,
    sorter: (a: SchemeData, b: SchemeData) => a.feedAxialDisturbance - b.feedAxialDisturbance,
  },
  {
    title: '分离功率',
    dataIndex: 'sepPower',
    key: 'sepPower',
    width: 120,
    align: 'right' as const,
    sorter: (a: SchemeData, b: SchemeData) => {
      const powerA = a.sepPower ?? -Infinity
      const powerB = b.sepPower ?? -Infinity
      return powerA - powerB
    },
    defaultSortOrder: 'descend' as const,
  },
  {
    title: '分离系数',
    dataIndex: 'sepFactor',
    key: 'sepFactor',
    width: 120,
    align: 'right' as const,
    sorter: (a: SchemeData, b: SchemeData) => {
      const factorA = a.sepFactor ?? -Infinity
      const factorB = b.sepFactor ?? -Infinity
      return factorA - factorB
    },
  },
]

// X 轴列定义（设计因子）
const xColumns = [
  {
    title: '角速度',
    dataIndex: 'angularVelocity',
    key: 'angularVelocity',
  },
  {
    title: '供料流量',
    dataIndex: 'feedFlowRate',
    key: 'feedFlowRate',
  },
  {
    title: '供料轴向扰动',
    dataIndex: 'feedAxialDisturbance',
    key: 'feedAxialDisturbance',
  },
]

// Y 轴列定义（结果指标）
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

/**
 * 加载方案数据
 */
async function loadSchemes() {
  loading.value = true
  try {
    const data = await app.file.readMultiSchemes()
    schemes.value = data
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
          <a-button
            type="link"
            size="small"
            :loading="loading"
            @click="loadSchemes"
          >
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="schemes"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }"
        :row-class-name="(record) => isMaxSepPowerRow(record) ? 'max-power-row' : ''"
        row-key="index"
        size="middle"
        :scroll="{ x: 800 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'index'">
            {{ record.index === -1 ? '*' : record.index + 1 }}
          </template>
          <template v-else-if="column.key === 'angularVelocity'">
            {{ formatNumber(record.angularVelocity) }} Hz
          </template>
          <template v-else-if="column.key === 'feedFlowRate'">
            {{ formatNumber(record.feedFlowRate) }} kg/s
          </template>
          <template v-else-if="column.key === 'feedAxialDisturbance'">
            {{ formatNumber(record.feedAxialDisturbance) }} mm
          </template>
          <template v-else-if="column.key === 'sepPower'">
            <span :class="{ 'max-power': isOptimalSchemeRow(record) }">
              {{ formatNumber(record.sepPower) }} W
            </span>
          </template>
          <template v-else-if="column.key === 'sepFactor'">
            {{ formatNumber(record.sepFactor, 4) }}
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 方案对比图表 -->
    <SchemeChart :data="schemes" :x-columns="xColumns" :y-columns="yColumns" />
  </div>
</template>

<style scoped>
.multi-scheme-container {
  padding: 10px;
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

:deep(.ant-table-tbody > tr.max-power-row) {
  background-color: #fff7e6;
}

:deep(.ant-table-tbody > tr.max-power-row:hover) {
  background-color: #ffe7ba;
}
</style>

<script setup lang="ts">
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { computed, ref } from 'vue'

import { useApp } from '../../app'
import { useLogStore } from '../../store/logStore'

/**
 * 优化算法类型
 */
type OptimizationAlgorithm = 'NSGA-II' | 'NSGA-III' | 'MOEA/D' | 'SPEA2'

/**
 * 采样准则类型
 */
type SamplingCriterion = 'center' | 'random' | 'lhs' | 'sobol'

/**
 * 因子类型
 */
type FactorType = '实数' | '整数' | '离散'

/**
 * 设计因子接口
 */
interface DesignFactor {
  /** 序号 */
  id: number
  /** 名称 */
  name: string
  /** 类型 */
  type: FactorType
  /** 下限 */
  lowerLimit: number
  /** 上限 */
  upperLimit: number
  /** 水平数 */
  levelCount?: number
  /** 取值 */
  values?: string
}

/**
 * 响应值接口
 */
interface ResponseValue {
  /** 序号 */
  id: number
  /** 名称 */
  name: string
}

/**
 * 样本数据接口
 */
interface SampleData {
  /** 序号 */
  id: number
  /** 各因子值 */
  [key: string]: number | string
}

const $app = useApp()
const logStore = useLogStore()

// 优化算法
const optimizationAlgorithm = ref<OptimizationAlgorithm>('NSGA-II')

// 算法参数
const factorCount = ref<number>(3)
const samplePointCount = ref<number>(50)
const samplingCriterion = ref<SamplingCriterion>('center')

// 设计因子列表
const designFactors = ref<DesignFactor[]>([
  {
    id: 1,
    name: '角速度',
    type: '实数',
    lowerLimit: 0,
    upperLimit: 10,
  },
  {
    id: 2,
    name: '供料流量',
    type: '实数',
    lowerLimit: 0,
    upperLimit: 10,
  },
  {
    id: 3,
    name: '供料轴向扰动',
    type: '实数',
    lowerLimit: 0,
    upperLimit: 10,
  },
])

// 响应值列表
const responseValues = ref<ResponseValue[]>([
  {
    id: 1,
    name: '分离功率',
  },
  {
    id: 2,
    name: '分离系数',
  },
])

// 样本空间数据
const sampleSpaceData = ref<SampleData[]>([
  { id: 1, 角速度: 0.1, 供料流量: 1, 供料轴向扰动: 11 },
  { id: 2, 角速度: 0.2, 供料流量: 2, 供料轴向扰动: 21 },
  { id: 3, 角速度: 0.3, 供料流量: 3, 供料轴向扰动: 31 },
])

// 选中的设计因子行
const selectedDesignFactorIds = ref<number[]>([])
// 选中的响应值行
const selectedResponseValueIds = ref<number[]>([])

/**
 * 优化算法选项
 */
const algorithmOptions = [
  { label: 'NSGA-II', value: 'NSGA-II' },
  { label: 'NSGA-III', value: 'NSGA-III' },
  { label: 'MOEA/D', value: 'MOEA/D' },
  { label: 'SPEA2', value: 'SPEA2' },
] as const

/**
 * 采样准则选项
 */
const samplingCriterionOptions = [
  { label: 'center', value: 'center' },
  { label: 'random', value: 'random' },
  { label: 'lhs', value: 'lhs' },
  { label: 'sobol', value: 'sobol' },
] as const

/**
 * 因子类型选项
 */
const factorTypeOptions = [
  { label: '实数', value: '实数' },
  { label: '整数', value: '整数' },
  { label: '离散', value: '离散' },
] as const

/**
 * 样本空间表格列
 */
const sampleSpaceColumns = computed(() => {
  const cols: Array<{ title: string, dataIndex: string, key: string, width?: number }> = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
  ]

  // 根据设计因子动态生成列
  designFactors.value.forEach((factor) => {
    cols.push({
      title: factor.name,
      dataIndex: factor.name,
      key: factor.name,
      width: 150,
    })
  })

  return cols
})

/**
 * 添加设计因子
 */
function addDesignFactor(): void {
  const newId = designFactors.value.length > 0
    ? Math.max(...designFactors.value.map(f => f.id)) + 1
    : 1

  designFactors.value.push({
    id: newId,
    name: `因子${newId}`,
    type: '实数',
    lowerLimit: 0,
    upperLimit: 10,
  })

  logStore.info(`已添加设计因子: 因子${newId}`)
}

/**
 * 删除选中的设计因子
 */
function deleteSelectedDesignFactors(): void {
  if (selectedDesignFactorIds.value.length === 0) {
    $app.message.warning('请先选择要删除的设计因子')
    return
  }

  const idsToDelete = [...selectedDesignFactorIds.value]
  designFactors.value = designFactors.value.filter(
    factor => !idsToDelete.includes(factor.id),
  )

  // 更新因子数量
  factorCount.value = designFactors.value.length

  // 清空选中状态
  selectedDesignFactorIds.value = []

  // 更新样本空间数据（移除对应的列）
  sampleSpaceData.value = sampleSpaceData.value.map((sample) => {
    const newSample: SampleData = { id: sample.id }
    designFactors.value.forEach((factor) => {
      if (sample[factor.name] !== undefined)
        newSample[factor.name] = sample[factor.name]
    })
    return newSample
  })

  logStore.info(`已删除 ${idsToDelete.length} 个设计因子`)
}

/**
 * 仿真优化计算
 */
async function performOptimization(): Promise<void> {
  if (designFactors.value.length === 0) {
    $app.message.warning('请先添加设计因子')
    return
  }

  if (responseValues.value.length === 0) {
    $app.message.warning('请先添加响应值')
    return
  }

  if (sampleSpaceData.value.length === 0) {
    $app.message.warning('请先进行样本取样')
    return
  }

  const hideLoading = $app.message.loading('正在进行仿真优化计算...', 0)

  try {
    // 模拟计算过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    hideLoading()
    $app.message.success('仿真优化计算完成')
    logStore.info(`仿真优化计算完成: 算法=${optimizationAlgorithm.value}, 因子数=${factorCount.value}, 样本点数=${samplePointCount.value}, 采样准则=${samplingCriterion.value}`)
  }
  catch (error) {
    hideLoading()
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStore.error(errorMessage, '仿真优化计算失败')
    $app.message.error(`仿真优化计算失败: ${errorMessage}`)
  }
}

/**
 * 当因子数量变化时，同步设计因子数量
 */
function onFactorCountChange(value: number | null): void {
  if (value === null || value < 0)
    return

  const currentCount = designFactors.value.length
  if (value > currentCount) {
    // 增加因子
    for (let i = currentCount; i < value; i++) {
      const newId = designFactors.value.length > 0
        ? Math.max(...designFactors.value.map(f => f.id)) + 1
        : 1

      designFactors.value.push({
        id: newId,
        name: `因子${newId}`,
        type: '实数',
        lowerLimit: 0,
        upperLimit: 10,
      })
    }
  }
  else if (value < currentCount) {
    // 减少因子（删除多余的）
    designFactors.value = designFactors.value.slice(0, value)
  }
}
</script>

<template>
  <div class="scheme-optimization-container">
    <div class="form-content">
      <!-- 左右分栏布局 -->
      <div class="main-layout">
        <!-- 左侧：优化算法和算法参数设置 -->
        <div class="left-column">
          <!-- 优化算法 -->
          <a-card title="优化算法" class="algorithm-card">
            <a-form layout="vertical" :model="{}">
              <a-form-item label="优化算法">
                <a-select
                  :value="optimizationAlgorithm"
                  style="width: 100%"
                  @update:value="(val) => optimizationAlgorithm = val as OptimizationAlgorithm"
                >
                  <a-select-option
                    v-for="option in algorithmOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-form>

            <!-- 算法参数设置 -->
            <a-card title="算法参数设置" class="params-card">
              <a-form layout="vertical" :model="{}">
                <div class="form-row">
                  <a-form-item label="因子数量" class="form-col">
                    <a-input-number
                      :value="factorCount"
                      :min="1"
                      style="width: 100%"
                      @update:value="(val) => { factorCount = val ?? 3; onFactorCountChange(val) }"
                    />
                  </a-form-item>

                  <a-form-item label="样本点数" class="form-col">
                    <a-input-number
                      :value="samplePointCount"
                      :min="1"
                      style="width: 100%"
                      @update:value="(val) => samplePointCount = val ?? 50"
                    />
                  </a-form-item>

                  <a-form-item label="采样准则" class="form-col">
                    <a-select
                      :value="samplingCriterion"
                      style="width: 100%"
                      @update:value="(val) => samplingCriterion = val as SamplingCriterion"
                    >
                      <a-select-option
                        v-for="option in samplingCriterionOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                </div>
              </a-form>
            </a-card>
          </a-card>
        </div>

        <!-- 右侧：设计因子和响应值 -->
        <div class="right-column">
          <!-- 设计因子 -->
          <a-card title="设计因子">
            <div class="table-actions">
              <a-space>
                <a-button size="small" @click="addDesignFactor">
                  <template #icon>
                    <PlusOutlined />
                  </template>
                  添加参数
                </a-button>
                <a-button danger size="small" :disabled="selectedDesignFactorIds.length === 0" @click="deleteSelectedDesignFactors">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除参数
                </a-button>
              </a-space>
            </div>
            <a-table
              size="small"
              :columns="[
                { title: '序号', dataIndex: 'id', key: 'id', width: 80 },
                { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
                { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
                { title: '下限', dataIndex: 'lowerLimit', key: 'lowerLimit', width: 150 },
                { title: '上限', dataIndex: 'upperLimit', key: 'upperLimit', width: 150 },
                { title: '水平数', dataIndex: 'levelCount', key: 'levelCount', width: 120 },
                { title: '取值', dataIndex: 'values', key: 'values', width: 200 },
              ]"
              :data-source="designFactors"
              :pagination="false"
              :row-selection="{
                selectedRowKeys: selectedDesignFactorIds,
                onChange: (keys) => selectedDesignFactorIds = keys as number[],
              }"
              row-key="id"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'id'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'name'">
                  <a-input
                    :value="record.name"
                    @update:value="(val) => { const factor = designFactors.find(f => f.id === record.id); if (factor) factor.name = val }"
                  />
                </template>
                <template v-else-if="column.key === 'type'">
                  <a-select
                    :value="record.type"
                    style="width: 100%"
                    @update:value="(val) => { const factor = designFactors.find(f => f.id === record.id); if (factor) factor.type = val as FactorType }"
                  >
                    <a-select-option
                      v-for="option in factorTypeOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'lowerLimit'">
                  <a-input-number
                    :value="record.lowerLimit"
                    style="width: 100%"
                    @update:value="(val) => { const factor = designFactors.find(f => f.id === record.id); if (factor && val !== null) factor.lowerLimit = val }"
                  />
                </template>
                <template v-else-if="column.key === 'upperLimit'">
                  <a-input-number
                    :value="record.upperLimit"
                    style="width: 100%"
                    @update:value="(val) => { const factor = designFactors.find(f => f.id === record.id); if (factor && val !== null) factor.upperLimit = val }"
                  />
                </template>
                <template v-else-if="column.key === 'levelCount'">
                  <a-input-number
                    :value="record.levelCount"
                    :min="1"
                    style="width: 100%"
                    @update:value="(val) => { const factor = designFactors.find(f => f.id === record.id); if (factor) factor.levelCount = val ?? undefined }"
                  />
                </template>
                <template v-else-if="column.key === 'values'">
                  <a-input
                    :value="record.values"
                    placeholder="请输入取值"
                    @update:value="(val) => { const factor = designFactors.find(f => f.id === record.id); if (factor) factor.values = val }"
                  />
                </template>
              </template>
            </a-table>
          </a-card>

          <div style="height: 10px;" />

          <!-- 响应值 -->
          <a-card title="响应值">
            <a-table
              :columns="[
                { title: '序号', dataIndex: 'id', key: 'id', width: 80 },
                { title: '名称', dataIndex: 'name', key: 'name' },
              ]"
              :data-source="responseValues"
              :pagination="false"
              :row-selection="{
                selectedRowKeys: selectedResponseValueIds,
                onChange: (keys) => selectedResponseValueIds = keys as number[],
              }"
              size="small"
              row-key="id"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'id'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'name'">
                  <a-input
                    :value="record.name"
                    @update:value="(val) => { const response = responseValues.find(r => r.id === record.id); if (response) response.name = val }"
                  />
                </template>
              </template>
            </a-table>
          </a-card>
        </div>
      </div>

      <div style="height: 10px;" />

      <!-- 样本空间 -->
      <a-card title="样本空间">
        <a-table
          :columns="sampleSpaceColumns"
          :data-source="sampleSpaceData"
          :pagination="{ pageSize: 10 }"
          size="small"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'id'">
              {{ record.id }}
            </template>
            <template v-else>
              {{ record[column.key as string] ?? '-' }}
            </template>
          </template>
        </a-table>
      </a-card>
    </div>
  </div>

  <!-- 底部操作栏 -->
  <div class="bottom-actions">
    <a-button type="primary" @click="performOptimization">
      仿真优化计算
    </a-button>
  </div>
</template>

<style scoped>
.scheme-optimization-container {
  padding: 10px;
  padding-bottom: 80px;
}

.form-content {
  margin-bottom: 10px;
}

.main-layout {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 10px;
  margin-bottom: 16px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
}

.algorithm-card,
.params-card {
  width: 100%;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-col {
  margin-bottom: 0;
}

.table-actions {
  margin-bottom: 16px;
}

.response-actions {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<script setup lang="ts">
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'

import { useApp } from '../../app'
import { useDesignStore } from '../../store/designStore'
import { useLogStore } from '../../store/logStore'
import { FIELD_LABELS } from '../../utils/field-labels'

/**
 * 优化算法类型
 */
type OptimizationAlgorithm = 'NSGA-II' | 'MOPSO'

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
  lowerLimit?: number
  /** 上限 */
  upperLimit?: number
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

const app = useApp()
const logStore = useLogStore()
const designStore = useDesignStore()

// 优化算法
const optimizationAlgorithm = ref<OptimizationAlgorithm>('NSGA-II')

// 算法参数
const factorCount = ref<number>(3)
const samplePointCount = ref<number>(50)
const samplingCriterion = ref<SamplingCriterion>('center')
// 本页持久化存储键
const STORAGE_ALGO_KEY = 'schemeOptimization.algorithm'
const STORAGE_MOPSO_FACTORS_KEY = 'schemeOptimization.mopso.designFactors'

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
  { label: 'MOPSO', value: 'MOPSO' },
] as const

/**
 * 采样准则选项
 */
const samplingCriterionOptions = [
  { label: 'center', value: 'center' },
  { label: 'maxmin', value: 'maxmin' },
  { label: 'centermaxmin', value: 'centermaxmin' },
  { label: 'correlation', value: 'correlation' },
  { label: 'lhsmu', value: 'lhsmu' },
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
async function addDesignFactor(): Promise<void> {
  // 根据当前设计因子名称，反查字段 key，作为默认选中传入弹窗
  const resolveKeyByLabel = (label: string): string | null => {
    for (const [key, map] of Object.entries(FIELD_LABELS)) {
      if (map['zh-CN'] === label)
        return key
    }
    return null
  }

  const selectedKeys = designFactors.value
    .map(f => resolveKeyByLabel(f.name))
    .filter((k): k is string => !!k)

  app.window.addDesignFactor.open({ data: { selectedKeys } }).then(
    (res) => {
      if (!Array.isArray(res)) {
        return
      }

      const selected = res as Array<{ key: string, label: string }>

      const prevByName = new Map<string, DesignFactor>(
        designFactors.value.map(f => [f.name, f]),
      )

      const newFactors: DesignFactor[] = selected.map((s, idx) => {
        const prev = prevByName.get(s.label)
        return {
          id: idx + 1,
          name: s.label, // 中文显示
          type: prev?.type ?? '实数',
          lowerLimit: prev?.lowerLimit ?? (optimizationAlgorithm.value === 'MOPSO' ? undefined : 0),
          upperLimit: prev?.upperLimit ?? (optimizationAlgorithm.value === 'MOPSO' ? undefined : 10),
          levelCount: prev?.levelCount,
          values: prev?.values,
        }
      })

      designFactors.value = newFactors
      factorCount.value = designFactors.value.length

      // 同步样本空间数据：保留与新因子同名的列，其它移除
      sampleSpaceData.value = sampleSpaceData.value.map((sample) => {
        const newSample: SampleData = { id: sample.id }
        designFactors.value.forEach((factor) => {
          if (sample[factor.name] !== undefined) {
            newSample[factor.name] = sample[factor.name]
          }
        })
        return newSample
      })
    },
  )
}

/**
 * 删除选中的设计因子
 */
function deleteSelectedDesignFactors(): void {
  if (selectedDesignFactorIds.value.length === 0) {
    app.message.warning('请先选择要删除的设计因子')
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
}

/**
 * 根据设计因子名称获取字段key
 */
function getFieldKeyByLabel(label: string): string | null {
  for (const [key, map] of Object.entries(FIELD_LABELS)) {
    if (map['zh-CN'] === label)
      return key
  }
  return null
}

/**
 * 获取未添加至设计因子的所有参数
 */
function getNonFactorParams(): Record<string, any> {
  // 获取设计因子名称列表
  const factorNames = designFactors.value.map(f => f.name)
  const factorKeys = factorNames
    .map(name => getFieldKeyByLabel(name))
    .filter((key): key is string => !!key)

  // 从设计存储中获取所有参数
  const allParams = {
    ...designStore.topLevelParams,
    ...designStore.operatingParams,
    ...designStore.drivingParams,
    ...designStore.separationComponents,
  }

  // 过滤掉设计因子对应的参数
  const nonFactorParams: Record<string, any> = {}
  for (const [key, value] of Object.entries(allParams)) {
    if (!factorKeys.includes(key) && value !== undefined && value !== null) {
      nonFactorParams[key] = value
    }
  }

  return nonFactorParams
}

/**
 * 将样本空间数据中的中文名称转换为字段key
 */
function convertSampleDataToKeys(sample: SampleData): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(sample)) {
    if (key === 'id')
      continue
    const fieldKey = getFieldKeyByLabel(key)
    if (fieldKey) {
      result[fieldKey] = value
    }
  }
  return result
}

/**
 * 解析Sep_power.dat内容（在渲染进程中实现）
 */
function parseSepPower(content: string): { actualSepPower: number | null, actualSepFactor: number | null } {
  const lineArr = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(line => line.trim() !== '')

  const regex = /^([^=]+)=(\d+)$/
  const result: Record<string, number> = {}

  lineArr.forEach((line) => {
    const match = line.match(regex)
    if (match) {
      const key = match[1].trim()
      const value = Number(match[2])
      result[key] = value
    }
  })

  return {
    actualSepPower: result['ACTURAL SEPERATIVE POWER'] ?? result['ACTUAL SEPERATIVE POWER'] ?? null,
    actualSepFactor: result['ACTURAL SEPERATIVE FACTOR'] ?? result['ACTUAL SEPERATIVE FACTOR'] ?? null,
  }
}

/**
 * 获取工作目录（testFile或exe同级目录）
 * 通过IPC调用主进程获取
 */
async function getWorkBaseDir(): Promise<string> {
  return await app.file.getWorkDir()
}

/**
 * 仿真优化计算
 */
const isOptimizing = ref(false)

async function performOptimization(): Promise<void> {
  if (designFactors.value.length === 0) {
    app.message.warning('请先添加设计因子')
    return
  }

  if (responseValues.value.length === 0) {
    app.message.warning('请先添加响应值')
    return
  }

  if (sampleSpaceData.value.length === 0) {
    app.message.warning('请先进行样本取样')
    return
  }

  isOptimizing.value = true
  const hideLoading = app.message.loading('正在进行仿真优化计算...', 0)

  try {
    logStore.info('开始仿真优化计算')
    const totalSampleCount = samplePointCount.value
    logStore.info(`算法=${optimizationAlgorithm.value}, 样本点数=${totalSampleCount}, 样本空间数据=${sampleSpaceData.value.length}`)

    const baseDir = await getWorkBaseDir()
    const exeName = 'ns-linear.exe'
    const results: Array<{
      index: number
      sampleData: SampleData
      sepPower: number | null
      sepFactor: number | null
      dirName: string // 保存目录名
    }> = []
    let hasExeFailure = false // 标记是否有exe调用失败

    // 循环处理每个样本（使用算法参数设置的样本点数）
    for (let i = 0; i < totalSampleCount; i++) {
      // 从样本空间数据中获取样本（如果索引超出范围，使用取模循环使用）
      const sampleIndex = i % sampleSpaceData.value.length
      const sample = sampleSpaceData.value[sampleIndex]
      const sampleId = i + 1 // 使用循环序号作为样本ID
      logStore.info(`处理样本 ${i + 1}/${totalSampleCount}: 样本数据索引=${sampleIndex}, 数据ID=${sample.id}`)

      // 为每个样本创建唯一的工作目录（out/out_XXXXXX 格式，自动避免重复）
      const workDir = await app.file.createOutputDir(baseDir)
      const dirName = workDir.split(/[/\\]/).pop() || '' // 提取目录名（如 out_000001）
      logStore.info(`样本 ${sampleId} 创建输出目录: ${workDir}`)

      // 组合数据：样本空间数据 + 未添加至设计因子的参数
      const sampleParams = convertSampleDataToKeys(sample)
      const nonFactorParams = getNonFactorParams()
      const combinedParams = {
        ...nonFactorParams,
        ...sampleParams,
      }

      // 写入 input.dat（在子文件夹内）
      const writeResult = await app.file.writeDatFile('input.dat', combinedParams, workDir)
      if (writeResult.code !== 200) {
        logStore.error(`样本 ${sampleId} 写入input.dat失败: ${writeResult.message}`)
        results.push({
          index: sampleId,
          sampleData: sample,
          sepPower: null,
          sepFactor: null,
          dirName,
        })
        continue
      }

      logStore.info(`样本 ${sampleId} input.dat写入成功`)

      // 调用 exe
      const exeResult = await app.callExe(exeName, workDir)
      if (exeResult.status !== 'started') {
        logStore.error(`样本 ${sampleId} 调用exe失败: ${exeResult.reason}`)
        // 调用失败时，删除该样本的目录
        try {
          await app.file.deleteDir(workDir)
          logStore.info(`样本 ${sampleId} 失败目录已删除: ${workDir}`)
        }
        catch (error) {
          logStore.error(`样本 ${sampleId} 删除失败目录时出错: ${error instanceof Error ? error.message : String(error)}`)
        }
        results.push({
          index: sampleId,
          sampleData: sample,
          sepPower: null,
          sepFactor: null,
          dirName,
        })
        // 调用失败时，停止整个优化流程，不继续处理后续样本
        const remainingCount = totalSampleCount - i
        logStore.error(`优化流程因exe调用失败而终止：已处理 ${i}/${totalSampleCount} 个样本，剩余 ${remainingCount} 个样本未处理`)
        hasExeFailure = true
        break
      }

      logStore.info(`样本 ${sampleId} exe启动成功，等待完成...`)

      // 等待exe完成（通过事件监听）
      await new Promise<void>((resolve) => {
        const handler = async (_: any, _exeName: string, result: any) => {
          if (result.isSuccess === false) {
            logStore.error(`样本 ${sampleId} exe执行失败: 退出码=${result.exitCode}`)
            results.push({
              index: sampleId,
              sampleData: sample,
              sepPower: null,
              sepFactor: null,
              dirName,
            })
            resolve()
            return
          }

          try {
            // 读取 Sep_power.dat
            const content = await app.file.readDatFile('Sep_power.dat', workDir)
            const parsedData = parseSepPower(content)

            results.push({
              index: sampleId,
              sampleData: sample,
              sepPower: parsedData.actualSepPower,
              sepFactor: parsedData.actualSepFactor,
              dirName,
            })

            logStore.info(`样本 ${sampleId} 完成: 分离功率=${parsedData.actualSepPower}, 分离系数=${parsedData.actualSepFactor}`)
          }
          catch (error) {
            logStore.error(`样本 ${sampleId} 读取结果失败: ${error instanceof Error ? error.message : String(error)}`)
            results.push({
              index: sampleId,
              sampleData: sample,
              sepPower: null,
              sepFactor: null,
              dirName,
            })
          }

          window.electron.ipcRenderer.removeListener('exe-closed', handler)
          resolve()
        }

        window.electron.ipcRenderer.on('exe-closed', handler)
      })
    }

    // 如果exe调用失败，直接返回，不继续执行后续处理
    if (hasExeFailure) {
      hideLoading()
      const processedCount = results.length
      app.message.error(`仿真优化计算失败：exe程序调用失败（已处理 ${processedCount}/${totalSampleCount} 个样本）`)
      return
    }

    // 所有样本处理完成后，找出最优方案
    let maxSepPower = -Infinity
    let optimalIndex = -1

    for (const result of results) {
      if (result.sepPower !== null && result.sepPower > maxSepPower) {
        maxSepPower = result.sepPower
        optimalIndex = result.index
      }
      else if (result.sepPower !== null && result.sepPower === maxSepPower && result.index < optimalIndex) {
        // 如果分离功率相同，取序号最小的
        optimalIndex = result.index
      }
    }

    // 构建最终结果数据（包含最优方案标记）
    const finalResults: Array<{
      index: number
      fileName: string
      [key: string]: any
      sepPower: number | null
      sepFactor: number | null
    }> = []

    // 首先添加最优方案（序号为-1，显示为'*'）
    if (optimalIndex >= 0) {
      const optimal = results.find(r => r.index === optimalIndex)
      if (optimal) {
        const optimalData: any = {
          index: -1, // 最优方案标记
          fileName: optimal.dirName || `scheme_${optimal.index}`,
          sepPower: optimal.sepPower,
          sepFactor: optimal.sepFactor,
        }

        // 添加样本空间中的所有字段
        for (const [key, value] of Object.entries(optimal.sampleData)) {
          if (key !== 'id') {
            optimalData[key] = value
          }
        }

        finalResults.push(optimalData)
      }
    }

    // 添加其他方案（按序号排序）
    results
      .filter(r => r.index !== optimalIndex)
      .sort((a, b) => a.index - b.index)
      .forEach((result) => {
        const data: any = {
          index: result.index - 1, // 转换为0-based索引
          fileName: result.dirName || `scheme_${result.index}`,
          sepPower: result.sepPower,
          sepFactor: result.sepFactor,
        }

        // 添加样本空间中的所有字段
        for (const [key, value] of Object.entries(result.sampleData)) {
          if (key !== 'id') {
            data[key] = value
          }
        }

        finalResults.push(data)
      })

    // 保存结果到文件（供MultiScheme读取）
    // 这里需要将结果保存到文件系统，让MultiScheme可以读取
    // 由于MultiScheme通过readMultiSchemes读取，我们需要更新该方法的实现
    // 或者创建一个新的IPC方法来保存结果

    hideLoading()
    app.message.success(`仿真优化计算完成，共处理 ${results.length} 个样本，最优方案序号: ${optimalIndex >= 0 ? optimalIndex : '无'}`)
    logStore.info(`仿真优化计算完成: 算法=${optimizationAlgorithm.value}, 样本点数=${totalSampleCount}, 处理结果数=${results.length}, 最优方案序号=${optimalIndex}`)
  }
  catch (error) {
    hideLoading()
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStore.error(errorMessage, '仿真优化计算失败')
    app.message.error(`仿真优化计算失败: ${errorMessage}`)
  }
  finally {
    isOptimizing.value = false
  }
}

// 互斥逻辑判断：是否存在“取值”
function hasValues(factor: DesignFactor): boolean {
  const v = (factor.values ?? '').toString().trim()
  return v.length > 0
}

// 互斥逻辑判断：是否设置了下限/上限/水平数中的任一项
function hasBoundsOrLevels(factor: DesignFactor): boolean {
  const hasLower = factor.lowerLimit !== undefined && factor.lowerLimit !== null
  const hasUpper = factor.upperLimit !== undefined && factor.upperLimit !== null
  const hasLevel = factor.levelCount !== undefined && factor.levelCount !== null
  return hasLower || hasUpper || hasLevel
}

// 持久化：页面加载时恢复；编辑时保存
onMounted(async () => {
  try {
    const savedAlgo = await app.storage.get<string>(STORAGE_ALGO_KEY)
    if (savedAlgo === 'NSGA-II' || savedAlgo === 'MOPSO') {
      optimizationAlgorithm.value = savedAlgo as OptimizationAlgorithm
    }

    const savedFactors = await app.storage.get<DesignFactor[]>(STORAGE_MOPSO_FACTORS_KEY)
    if (savedFactors && Array.isArray(savedFactors)) {
      designFactors.value = savedFactors
    }
    else if (optimizationAlgorithm.value === 'MOPSO') {
      // 首次进入 MOPSO，无持久化数据时，清空默认边界/水平数/取值
      designFactors.value = designFactors.value.map(f => ({
        ...f,
        lowerLimit: undefined,
        upperLimit: undefined,
        levelCount: undefined,
        values: undefined,
      }))
    }
  }
  catch (e) {
    console.error('初始化持久化数据失败', e)
  }
})

watch(optimizationAlgorithm, async (algo) => {
  try {
    await app.storage.set(STORAGE_ALGO_KEY, algo)
  }
  catch {}
})

watch(designFactors, async (factors) => {
  try {
    if (optimizationAlgorithm.value === 'MOPSO') {
      await app.storage.set(STORAGE_MOPSO_FACTORS_KEY, factors)
    }
  }
  catch {}
}, { deep: true })

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
        lowerLimit: optimizationAlgorithm.value === 'MOPSO' ? undefined : 0,
        upperLimit: optimizationAlgorithm.value === 'MOPSO' ? undefined : 10,
        levelCount: undefined,
        values: undefined,
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
                  :value="optimizationAlgorithm" style="width: 100%"
                  @update:value="(val) => optimizationAlgorithm = val as OptimizationAlgorithm"
                >
                  <a-select-option v-for="option in algorithmOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-form>

            <!-- 算法参数设置 -->
            <a-card v-if="optimizationAlgorithm === 'NSGA-II'" title="算法参数设置" class="params-card">
              <a-form layout="vertical" :model="{}">
                <div class="form-row">
                  <a-form-item label="因子数量" class="form-col">
                    <a-input-number
                      :value="factorCount" disabled :min="1" style="width: 100%"
                      @update:value="(val) => { factorCount = val ?? 3; onFactorCountChange(val) }"
                    />
                  </a-form-item>

                  <a-form-item label="样本点数" class="form-col">
                    <a-input-number
                      :value="samplePointCount" :min="1" style="width: 100%"
                      @update:value="(val) => samplePointCount = val ?? 50"
                    />
                  </a-form-item>

                  <a-form-item label="采样准则" class="form-col">
                    <a-select
                      :value="samplingCriterion" style="width: 100%"
                      @update:value="(val) => samplingCriterion = val as SamplingCriterion"
                    >
                      <a-select-option
                        v-for="option in samplingCriterionOptions" :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </a-select-option>
                    </a-select>
                  </a-form-item>
                </div>
              </a-form>
            </a-card>

            <a-empty v-else description="算法不需要设置参数" />
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
                <a-button
                  danger size="small" :disabled="selectedDesignFactorIds.length === 0"
                  @click="deleteSelectedDesignFactors"
                >
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除参数
                </a-button>
              </a-space>
            </div>
            <a-table
              size="small" :columns="[
                { title: '序号', dataIndex: 'id', key: 'id', width: 80 },
                { title: '名称', dataIndex: 'name', key: 'name', width: 200 },
                { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
                { title: '下限', dataIndex: 'lowerLimit', key: 'lowerLimit', width: 150 },
                { title: '上限', dataIndex: 'upperLimit', key: 'upperLimit', width: 150 },
                { title: '水平数', dataIndex: 'levelCount', key: 'levelCount', width: 120 },
                { title: '取值', dataIndex: 'values', key: 'values', width: 200 },
              ]" :data-source="designFactors" :pagination="false" :row-selection="{
                selectedRowKeys: selectedDesignFactorIds,
                onChange: (keys) => selectedDesignFactorIds = keys as number[],
              }" row-key="id"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'id'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'name'">
                  <span>{{ record.name }}</span>
                </template>
                <template v-else-if="column.key === 'type'">
                  <span>{{ record.type }}</span>
                </template>
                <template v-else-if="column.key === 'lowerLimit'">
                  <a-input-number
                    :value="record.lowerLimit" style="width: 100%"
                    :min="0"
                    :disabled="optimizationAlgorithm === 'MOPSO' && hasValues(record)"
                    @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.lowerLimit
                      const newVal = val ?? undefined
                      if (newVal === undefined) { factor.lowerLimit = undefined; return }
                      if (newVal < 0) { app.message.error(`【 ${factor.name} 】下限应大于等于零`); factor.lowerLimit = prev; return }
                      if (factor.upperLimit !== undefined && newVal >= factor.upperLimit) { app.message.error(`【 ${factor.name} 】下限应小于上限`); factor.lowerLimit = prev; return }
                      factor.lowerLimit = newVal
                      if (optimizationAlgorithm === 'MOPSO') { factor.values = undefined }
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'upperLimit'">
                  <a-input-number
                    :value="record.upperLimit" style="width: 100%"
                    :min="0"
                    :disabled="optimizationAlgorithm === 'MOPSO' && hasValues(record)"
                    @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.upperLimit
                      const newVal = val ?? undefined
                      if (newVal === undefined) { factor.upperLimit = undefined; return }
                      if (newVal < 0) { app.message.error(`【 ${factor.name} 】上限应大于等于零`); factor.upperLimit = prev; return }
                      if (factor.lowerLimit !== undefined && newVal <= factor.lowerLimit) { app.message.error(`【 ${factor.name} 】上限应大于下限`); factor.upperLimit = prev; return }
                      factor.upperLimit = newVal
                      if (optimizationAlgorithm === 'MOPSO') { factor.values = undefined }
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'levelCount'">
                  <a-input-number
                    :value="record.levelCount" :min="3" style="width: 100%"
                    :disabled="optimizationAlgorithm === 'NSGA-II' || (optimizationAlgorithm === 'MOPSO' && hasValues(record))"
                    @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.levelCount
                      const newVal = val ?? undefined
                      if (newVal === undefined) { factor.levelCount = undefined; return }
                      if (!Number.isInteger(newVal) || newVal <= 2) { app.message.error(`【 ${factor.name} 】水平数应为大于2的正整数`); factor.levelCount = prev; return }
                      factor.levelCount = newVal
                      if (optimizationAlgorithm === 'MOPSO') { factor.values = undefined }
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'values'">
                  <a-input
                    :value="record.values" placeholder="示例：[10,12,33]"
                    :disabled="optimizationAlgorithm === 'NSGA-II' || (optimizationAlgorithm === 'MOPSO' && hasBoundsOrLevels(record))"
                    @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.values
                      const text = (val ?? '').toString().trim()
                      if (text.length === 0) { factor.values = undefined; return }
                      // 基本格式校验：[n1,n2,...]
                      const isBracketed = text.startsWith('[') && text.endsWith(']')
                      if (!isBracketed) { app.message.error(`【 ${factor.name} 】取值格式错误，应为：[数值1,数值2,...]`); factor.values = prev; return }
                      try {
                        const arr = JSON.parse(text)
                        const validArray = Array.isArray(arr) && arr.length > 0 && arr.every(v => typeof v === 'number' && Number.isFinite(v))
                        if (!validArray) { app.message.error(`【 ${factor.name} 】取值格式错误，应为实数数组，如：[10,12,33]`); factor.values = prev; return }
                        factor.values = text
                        if (optimizationAlgorithm === 'MOPSO') {
                          factor.lowerLimit = undefined
                          factor.upperLimit = undefined
                          factor.levelCount = undefined
                        }
                      }
                      catch (e) {
                        app.message.error(`【 ${factor.name} 】取值格式错误，应为实数数组，如：[10,12,33]`)
                        factor.values = prev
                      }
                    }"
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
              ]" :data-source="responseValues" :pagination="false" :row-selection="{
                selectedRowKeys: selectedResponseValueIds,
                onChange: (keys) => selectedResponseValueIds = keys as number[],
              }" size="small" row-key="id"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'id'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'name'">
                  {{ record.name }}
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
          :columns="sampleSpaceColumns" :data-source="sampleSpaceData" :pagination="{ pageSize: 10 }"
          size="small" row-key="id"
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

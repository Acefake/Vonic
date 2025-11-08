<script setup lang="ts">
import type { DesignFactor, SampleData, SampleSpaceData } from './type'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { debounce } from 'lodash'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { getProductConfig } from '../../../../config/product.config'
import app from '../../app/index'
import { useLogStore, useSchemeOptimizationStore } from '../../store'
import { useDesignStore } from '../../store/designStore'
import { FIELD_LABELS } from '../../utils/field-labels'
import { parseSepPower } from '../../utils/parseSepPower'

import { ALGORITHM_OPTIONS, RESPONSE_VALUES, SAMPLING_CRITERION_OPTIONS } from './constants'
import { AlgorithmType, ParameterType } from './type'
import {
  handleMOPSOLevelCountUpdate,
  handleMOPSOLowerLimitUpdate,
  handleMOPSOUpperLimitUpdate,
  handleNSGAIILevelCountUpdate,
  hasBoundsOrLevels,
  hasValues,
  tryParseDiscreteValuesText,
  validateLowerLimitNSGAII,
  validateMOPSOFactors,
  validateNSGAIIFactors,
  validateUpperLimitNSGAII,
} from './validation'

const logStore = useLogStore()
const designStore = useDesignStore()
const schemeOptimizationStore = useSchemeOptimizationStore()
const { designFactors, sampleSpaceData, optimizationAlgorithm, samplePointCount, samplingCriterion, factorCount, samplePointCountforRes } = storeToRefs(schemeOptimizationStore)

// 采样进行中状态
const isSampling = ref(false)
// 选中的设计因子行
const selectedDesignFactorIds = ref<number[]>([])

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
          lowerLimit: prev?.lowerLimit ?? undefined,
          upperLimit: prev?.upperLimit ?? undefined,
          levelCount: prev?.levelCount,
          values: prev?.values,
        }
      })

      designFactors.value = newFactors

      // 若因子列表被清空，则同时清空样本空间；否则保留与新因子同名的列
      if (designFactors.value.length === 0) {
        sampleSpaceData.value = []
      }
      else {
        sampleSpaceData.value = sampleSpaceData.value.map((sample) => {
          const newSample: SampleData = { id: sample.id }
          designFactors.value.forEach((factor) => {
            if (sample[factor.name] !== undefined) {
              newSample[factor.name] = sample[factor.name]
            }
          })
          return newSample
        })
      }
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

  // 因子数量由 store 的 factorCount 自动推导

  // 清空选中状态
  selectedDesignFactorIds.value = []

  // 如果设计因子已被清空，则同时清空样本空间数据；否则根据剩余因子保留相应列
  if (designFactors.value.length === 0) {
    sampleSpaceData.value = []
  }
  else {
    sampleSpaceData.value = sampleSpaceData.value.map((sample) => {
      const newSample: SampleData = { id: sample.id }
      designFactors.value.forEach((factor) => {
        if (sample[factor.name] !== undefined)
          newSample[factor.name] = sample[factor.name]
      })
      return newSample
    })
  }
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

// parseSepPower 函数已移至工具函数 utils/parseSepPower.ts

/**
 * 获取工作目录（testFile或exe同级目录）
 * 通过IPC调用主进程获取
 */
async function getWorkBaseDir(): Promise<string> {
  return await app.file.getWorkDir()
}

/** 仿真优化计算 */
const isOptimizing = ref(false)

async function performOptimization(): Promise<void> {
  console.log('designStore.isFormValid()', designStore.isFormValid())

  // if (!designStore.isFormValid()) {
  //   app.message.error('方案设计因子未填写完整，请检查输入！')
  //   return
  // }

  if (designFactors.value.length === 0) {
    app.message.warning('请先添加设计因子')
    return
  }

  if (sampleSpaceData.value.length === 0) {
    app.message.warning('请先进行样本取样')
    return
  }

  isOptimizing.value = true

  await window.electron.ipcRenderer.invoke('file:delete-out-folder')

  const hideLoading = app.message.loading('正在进行仿真优化计算...', 0)

  try {
    logStore.info('开始仿真优化计算（多进程模式）')
    logStore.info(`算法=${optimizationAlgorithm.value}, 样本点数=${samplePointCountforRes.value}, 样本空间数据=${sampleSpaceData.value.length}`)

    const baseDir = await getWorkBaseDir()
    const exeName = 'ns-linear.exe'

    // 第一步：查找 exe 文件路径
    const exeSourcePath = await app.file.findExe(exeName)
    if (!exeSourcePath) {
      hideLoading()
      app.message.error(`找不到 ${exeName} 文件`)
      logStore.error(`找不到 ${exeName} 文件`)
      return
    }

    logStore.info(`开始启动Fortran进程...`)

    // 存储每个样本的信息
    interface SampleInfo {
      index: number
      sampleId: number
      sample: SampleData
      workDir: string
      dirName: string
      eventResolve: (() => void) | null
      isResolved: boolean
      timeoutId: NodeJS.Timeout | null
    }

    const sampleInfos: SampleInfo[] = []
    const results: Array<{
      index: number
      sampleData: SampleData
      sepPower: number | null
      sepFactor: number | null
      dirName: string
    }> = []

    // 第一步：创建所有文件夹
    for (let i = 0; i < samplePointCountforRes.value; i++) {
      const sampleIndex = i % sampleSpaceData.value.length
      const sample = sampleSpaceData.value[sampleIndex]
      const sampleId = i + 1

      const workDir = await app.file.createOutputDir(baseDir)
      const dirName = workDir.split(/[/\\]/).pop() || ''

      sampleInfos.push({
        index: i,
        sampleId,
        sample,
        workDir,
        dirName,
        eventResolve: null,
        isResolved: false,
        timeoutId: null,
      })

      // logStore.info(`样本 ${sampleId}/${samplePointCountforRes.value} 创建目录: ${dirName}`)
    }

    // 第二步：写入所有 input.dat
    for (const info of sampleInfos) {
      const sampleParams = convertSampleDataToKeys(info.sample)
      const nonFactorParams = getNonFactorParams()
      const combinedParams = {
        ...nonFactorParams,
        ...sampleParams,
      }

      const writeResult = await app.file.writeDatFile('input.dat', combinedParams, info.workDir)
      if (writeResult.code !== 200) {
        logStore.error(`样本 ${info.sampleId} 写入input.dat失败: ${writeResult.message}`)
        results.push({
          index: info.sampleId,
          sampleData: info.sample,
          sepPower: null,
          sepFactor: null,
          dirName: info.dirName,
        })
      }
      else {
        // logStore.info(`样本 ${info.sampleId} input.dat写入成功`)
      }
    }

    // 第三步：复制所有 exe 文件
    for (const info of sampleInfos) {
      try {
        // 使用路径分隔符构建目标路径
        const targetExePath = info.workDir.includes('\\')
          ? `${info.workDir}\\${exeName}`
          : `${info.workDir}/${exeName}`
        await app.file.copyFile(exeSourcePath, targetExePath)
        // logStore.info(`样本 ${info.sampleId} exe 复制成功: ${targetExePath}`)
      }
      catch (error) {
        logStore.error(`样本 ${info.sampleId} exe 复制失败: ${error instanceof Error ? error.message : String(error)}`)
        results.push({
          index: info.sampleId,
          sampleData: info.sample,
          sepPower: null,
          sepFactor: null,
          dirName: info.dirName,
        })
      }
    }

    // 第四步：注册全局事件监听器（使用工作目录区分不同进程）
    const pendingInfos = new Map<string, SampleInfo>()
    sampleInfos.forEach((info) => {
      // 只处理成功写入 input.dat 且成功复制 exe 的样本
      const hasResult = results.some(r => r.index === info.sampleId)
      if (!hasResult) {
        pendingInfos.set(info.workDir, info)
      }
    })

    if (pendingInfos.size === 0) {
      logStore.warning('没有可执行的样本')
      hideLoading()
      app.message.warning('没有可执行的样本')
      return
    }

    // 注册全局事件监听器
    const globalHandler = async (_: any, receivedExeName: string, result: any) => {
      console.info(`[事件监听器] 收到 exe-closed 事件: exeName=${receivedExeName}, workingDir=${result?.workingDir}, exitCode=${result?.exitCode}, isSuccess=${result?.isSuccess}`)

      // 验证 exe 名称
      if (receivedExeName !== exeName) {
        logStore.warning(`收到不匹配的exe-closed事件: ${receivedExeName}，期望: ${exeName}`)
        return
      }

      // 通过工作目录匹配对应的样本
      const workingDir = result.workingDir
      if (!workingDir) {
        logStore.warning('收到exe-closed事件，但工作目录为空')
        return
      }

      if (!pendingInfos.has(workingDir)) {
        logStore.warning(`收到exe-closed事件，但工作目录不在待处理列表中: ${workingDir}`)
        logStore.info(`当前待处理样本数: ${pendingInfos.size}`)
        return
      }

      const info = pendingInfos.get(workingDir)!

      // 防止重复处理
      if (info.isResolved) {
        logStore.warning(`样本 ${info.sampleId} 收到重复的exe-closed事件，已忽略`)
        return
      }

      info.isResolved = true
      pendingInfos.delete(workingDir)

      // 清理超时定时器
      if (info.timeoutId) {
        clearTimeout(info.timeoutId)
        info.timeoutId = null
      }

      // logStore.info(`样本 ${info.sampleId} 收到exe-closed事件，退出码=${result.exitCode}, isSuccess=${result.isSuccess}`)

      if (result.isSuccess === false || result.exitCode !== 0) {
        logStore.error(`样本 ${info.sampleId} exe执行失败: 退出码=${result.exitCode}, 工作目录=${info.workDir}, signal=${result.signal || 'none'}`)
        results.push({
          index: info.sampleId,
          sampleData: info.sample,
          sepPower: null,
          sepFactor: null,
          dirName: info.dirName,
        })
      }
      else {
        try {
          // 读取 Sep_power.dat
          const content = await app.file.readDatFile('Sep_power.dat', info.workDir)
          const parsedData = parseSepPower(content)

          results.push({
            index: info.sampleId,
            sampleData: info.sample,
            sepPower: parsedData.actualSepPower,
            sepFactor: parsedData.actualSepFactor,
            dirName: info.dirName,
          })

          logStore.info(`样本 ${info.sampleId} 完成: 分离功率=${parsedData.actualSepPower}, 分离系数=${parsedData.actualSepFactor}`)
        }
        catch (error) {
          logStore.error(`样本 ${info.sampleId} 读取结果失败: ${error instanceof Error ? error.message : String(error)}`)
          results.push({
            index: info.sampleId,
            sampleData: info.sample,
            sepPower: null,
            sepFactor: null,
            dirName: info.dirName,
          })
        }
      }

      // 调用 resolve
      if (info.eventResolve) {
        // logStore.info(`样本 ${info.sampleId} 调用 eventResolve，通知批处理完成`)
        info.eventResolve()
        info.eventResolve = null
      }
      else {
        logStore.warning(`样本 ${info.sampleId} 收到exe-closed事件，但 eventResolve 为 null`)
      }
    }

    // 注册事件监听器
    console.info('注册 exe-closed 事件监听器，开始监听进程完成事件')
    console.info(`检查 ipcRenderer 可用性: ${window.electron?.ipcRenderer ? '可用' : '不可用'}`)

    // 移除所有旧的监听器
    window.electron.ipcRenderer.removeAllListeners('exe-closed')
    console.info('已移除所有旧的 exe-closed 监听器')

    // 注册新的监听器
    window.electron.ipcRenderer.on('exe-closed', globalHandler)
    console.info('exe-closed 事件监听器已注册')

    // 测试监听器是否工作：尝试发送一个测试消息（仅用于调试，实际不会收到）
    // 注意：这里不实际发送，只是验证监听器函数本身是否正确
    console.info(`globalHandler 函数类型: ${typeof globalHandler}`)

    // 启动超时的包装函数，带重试机制
    const callExeWithTimeout = async (exeName: string, workingDir: string, sampleId: number, maxRetries = 2): Promise<{ status: string, pid?: number, reason?: string }> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // 创建超时 Promise
          const timeoutPromise = new Promise<{ status: string, reason: string }>((resolve) => {
            setTimeout(() => {
              resolve({
                status: 'timeout',
                reason: '启动超时（30秒）',
              })
            }, 30000) // 30秒启动超时
          })

          // 启动 exe 的 Promise
          const exePromise = app.callExe(exeName, workingDir)

          // 使用 Promise.race 实现超时
          const result = await Promise.race([exePromise, timeoutPromise])

          if (result.status === 'timeout') {
            if (attempt < maxRetries) {
              logStore.warning(`样本 ${sampleId} 启动超时，第 ${attempt} 次尝试失败，将重试...`)
              // 等待一段时间后重试
              await new Promise(resolve => setTimeout(resolve, 2000))
              continue
            }
            return result
          }

          if (result.status === 'started') {
            return result
          }

          // 如果启动失败，尝试重试
          if (attempt < maxRetries) {
            logStore.warning(`样本 ${sampleId} 启动失败: ${result.reason}，第 ${attempt} 次尝试失败，将重试...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }

          return result
        }
        catch (error) {
          if (attempt < maxRetries) {
            logStore.warning(`样本 ${sampleId} 启动异常: ${error instanceof Error ? error.message : String(error)}，第 ${attempt} 次尝试失败，将重试...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }
          return {
            status: 'failed',
            reason: `启动异常: ${error instanceof Error ? error.message : String(error)}`,
          }
        }
      }

      return {
        status: 'failed',
        reason: '启动失败，已达到最大重试次数',
      }
    }

    // 分批并行启动 exe 进程
    const pendingInfosArray = Array.from(pendingInfos.values())
    // 🔧 关键修复：降低并发数到2，减少资源竞争和访问冲突
    const batchSize = 2
    const totalBatches = Math.ceil(pendingInfosArray.length / batchSize)

    logStore.info(`将分批处理 ${pendingInfosArray.length} 个样本，每批 ${batchSize} 个（保守策略），共 ${totalBatches} 批`)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = pendingInfosArray.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
      logStore.info(`开始处理第 ${batchIndex + 1}/${totalBatches} 批，共 ${batch.length} 个样本`)

      // 当前批次需要等待执行完成的 Promise
      const batchExecutionPromises: Promise<void>[] = []

      // 顺序启动当前批次的所有进程，每个之间添加延迟，避免同时启动导致资源冲突
      const batchStartPromises: Promise<void>[] = []
      // 🔧 关键修复：增加启动间隔到2秒，最大化稳定性
      const startDelay = 2000

      for (let i = 0; i < batch.length; i++) {
        const info = batch[i]

        if (i > 0) {
          // 等待前一个进程的启动完成
          await batchStartPromises[i - 1]
          await new Promise(resolve => setTimeout(resolve, startDelay))
        }

        logStore.info(`样本 ${info.sampleId} 开始启动 exe...`)

        const startPromise = (async () => {
          // 启动 exe（使用工作目录中的 exe），带超时和重试机制
          const exeResult = await callExeWithTimeout(exeName, info.workDir, info.sampleId)

          if (exeResult.status !== 'started') {
            logStore.error(`样本 ${info.sampleId} 调用exe失败: ${exeResult.reason || '未知错误'}`)
            info.isResolved = true
            pendingInfos.delete(info.workDir)

            try {
              await app.file.deleteDir(info.workDir)
              logStore.info(`样本 ${info.sampleId} 失败目录已删除`)
            }
            catch (error) {
              logStore.error(`样本 ${info.sampleId} 删除失败目录时出错: ${error instanceof Error ? error.message : String(error)}`)
            }

            results.push({
              index: info.sampleId,
              sampleData: info.sample,
              sepPower: null,
              sepFactor: null,
              dirName: info.dirName,
            })
            return
          }

          logStore.info(`样本 ${info.sampleId} exe启动成功 (PID: ${exeResult.pid || 'unknown'})`)

          // 创建等待执行完成的 Promise
          const executionPromise = new Promise<void>((resolve) => {
            info.eventResolve = resolve

            // 🔧 关键修复：增加单个样本超时到3分钟
            info.timeoutId = setTimeout(() => {
              if (!info.isResolved) {
                info.isResolved = true
                pendingInfos.delete(info.workDir)
                logStore.error(`样本 ${info.sampleId} 等待exe完成超时（180秒），将标记为失败`)
                results.push({
                  index: info.sampleId,
                  sampleData: info.sample,
                  sepPower: null,
                  sepFactor: null,
                  dirName: info.dirName,
                })
                resolve()
              }
            }, 180000) // 🔧 3分钟
          })

          // 将执行 Promise 添加到当前批次的集合中
          batchExecutionPromises.push(executionPromise)
        })()

        batchStartPromises.push(startPromise)
      }

      // 等待当前批次的所有进程启动完成
      try {
        await Promise.all(batchStartPromises)
        logStore.info(`第 ${batchIndex + 1}/${totalBatches} 批启动完成，共 ${batchExecutionPromises.length} 个进程需要等待执行完成...`)
      }
      catch (error) {
        logStore.error(`第 ${batchIndex + 1}/${totalBatches} 批启动过程中出错: ${error instanceof Error ? error.message : String(error)}`)
      }

      // 等待当前批次的所有进程执行完成后再继续下一批
      if (batchExecutionPromises.length > 0) {
        try {
          logStore.info(`第 ${batchIndex + 1}/${totalBatches} 批：开始等待 ${batchExecutionPromises.length} 个进程完成...`)
          // logStore.info(`当前待处理的样本信息: ${Array.from(pendingInfos.keys()).map((wd) => {
          //   const info = pendingInfos.get(wd)
          //   return `${info?.sampleId}(${wd})`
          // }).join(', ')}`)

          // 添加整体超时机制，避免批处理卡死
          let batchTimeoutId: NodeJS.Timeout | null = null
          const batchTimeoutPromise = new Promise<void>((resolve) => {
            batchTimeoutId = setTimeout(() => {
              // 🔧 关键修复：增加批处理超时到5分钟
              logStore.warning(`第 ${batchIndex + 1}/${totalBatches} 批等待超时（300秒），强制继续下一批`)
              // 检查哪些进程还没完成
              const unfinishedCount = batch.filter(info => !info.isResolved).length
              if (unfinishedCount > 0) {
                logStore.warning(`第 ${batchIndex + 1}/${totalBatches} 批仍有 ${unfinishedCount} 个进程未完成，将标记为失败`)
                for (const info of batch) {
                  if (!info.isResolved) {
                    info.isResolved = true
                    pendingInfos.delete(info.workDir)
                    if (info.timeoutId) {
                      clearTimeout(info.timeoutId)
                      info.timeoutId = null
                    }
                    if (info.eventResolve) {
                      logStore.warning(`样本 ${info.sampleId} 因批处理超时，强制调用 eventResolve`)
                      info.eventResolve()
                      info.eventResolve = null
                    }
                    results.push({
                      index: info.sampleId,
                      sampleData: info.sample,
                      sepPower: null,
                      sepFactor: null,
                      dirName: info.dirName,
                    })
                  }
                }
              }
              resolve()
            }, 300000) // 🔧 5分钟
          })

          // 记录等待前的状态
          const beforeWaitPendingCount = pendingInfos.size
          logStore.info(`等待前：待处理样本数=${beforeWaitPendingCount}，当前批次样本数=${batch.length}`)

          // 使用 Promise.race 等待批次完成或超时
          const raceResult = await Promise.race([
            Promise.all(batchExecutionPromises).then(() => 'completed'),
            batchTimeoutPromise.then(() => 'timeout'),
          ])

          // 如果批次正常完成，清除超时定时器，避免后续触发超时警告
          if (raceResult === 'completed' && batchTimeoutId) {
            clearTimeout(batchTimeoutId)
            batchTimeoutId = null
            // logStore.info(`第 ${batchIndex + 1}/${totalBatches} 批正常完成，已清除超时定时器`)
          }

          // 记录等待后的状态
          const afterWaitPendingCount = pendingInfos.size
          const completedCount = beforeWaitPendingCount - afterWaitPendingCount
          logStore.info(`第 ${batchIndex + 1}/${totalBatches} 批等待完成：完成 ${completedCount} 个进程，剩余待处理样本数=${afterWaitPendingCount}`)

          // 检查当前批次中还有哪些未完成
          const unfinishedInBatch = batch.filter(info => !info.isResolved)
          if (unfinishedInBatch.length > 0) {
            logStore.warning(`第 ${batchIndex + 1}/${totalBatches} 批等待完成后，仍有 ${unfinishedInBatch.length} 个进程标记为未完成: ${unfinishedInBatch.map(info => `${info.sampleId}(${info.workDir})`).join(', ')}`)
          }
          else {
            logStore.info(`第 ${batchIndex + 1}/${totalBatches} 批所有进程已标记为完成`)
          }
        }
        catch (error) {
          logStore.error(`第 ${batchIndex + 1}/${totalBatches} 批执行过程中出错: ${error instanceof Error ? error.message : String(error)}`)
          logStore.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`)
          // 即使出错也继续处理下一批
        }
      }
      else {
        logStore.warning(`第 ${batchIndex + 1}/${totalBatches} 批没有需要等待的进程（可能全部启动失败）`)
      }
    }

    // 清理事件监听器
    // logStore.info('开始清理 exe-closed 事件监听器')
    window.electron.ipcRenderer.removeListener('exe-closed', globalHandler)
    // logStore.info('exe-closed 事件监听器已清理')

    logStore.info(`所有批次处理完成，共处理 ${results.length} 个样本结果`)
    logStore.info(`最终剩余待处理样本数: ${pendingInfos.size}`)
    if (pendingInfos.size > 0) {
      logStore.warning(`仍有未处理的样本: ${Array.from(pendingInfos.keys()).map((wd) => {
        const info = pendingInfos.get(wd)
        return `${info?.sampleId}(${wd})`
      }).join(', ')}`)
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

        // 将最优方案的结果和参数值更新到 InitialDesign 的 store 中
        try {
          // 更新输出结果
          designStore.updateOutputResults({
            separationPower: optimal.sepPower ?? undefined,
            separationFactor: optimal.sepFactor ?? undefined,
          })

          // 将最优方案的参数值更新到对应的 store 中
          const optimalParams = convertSampleDataToKeys(optimal.sampleData)

          // 根据字段 key 的类型更新到对应的 store
          const topKeys = ['angularVelocity', 'rotorRadius', 'rotorShoulderLength']
          const opKeys = ['rotorSidewallPressure', 'gasDiffusionCoefficient', 'feedFlowRate', 'splitRatio', 'feedingMethod']
          const drvKeys = [
            'depletedEndCapTemperature',
            'enrichedEndCapTemperature',
            'feedAxialDisturbance',
            'feedAngularDisturbance',
            'depletedMechanicalDriveAmount',
          ]
          const sepKeys = [
            'extractionChamberHeight',
            'enrichedBaffleHoleDiameter',
            'feedBoxShockDiskHeight',
            'depletedExtractionArmRadius',
            'depletedExtractionPortInnerDiameter',
            'depletedBaffleInnerHoleOuterDiameter',
            'enrichedBaffleHoleDistributionCircleDiameter',
            'depletedExtractionPortOuterDiameter',
            'depletedBaffleOuterHoleInnerDiameter',
            'minAxialDistance',
            'depletedBaffleAxialPosition',
            'depletedBaffleOuterHoleOuterDiameter',
            'bwgRadialProtrusionHeight',
            'bwgAxialHeight',
            'bwgAxialPosition',
            'radialGridRatio',
            'compensationCoefficient',
            'streamlineData',
            'innerBoundaryMirrorPosition',
            'gridGenerationMethod',
          ]

          const topParams: Record<string, any> = {}
          const opParams: Record<string, any> = {}
          const drvParams: Record<string, any> = {}
          const sepParams: Record<string, any> = {}

          for (const [key, value] of Object.entries(optimalParams)) {
            if (topKeys.includes(key)) {
              topParams[key] = value
            }
            else if (opKeys.includes(key)) {
              opParams[key] = value
            }
            else if (drvKeys.includes(key)) {
              drvParams[key] = value
            }
            else if (sepKeys.includes(key)) {
              sepParams[key] = value
            }
          }

          // 批量更新 store
          if (Object.keys(topParams).length > 0) {
            designStore.updateTopLevelParams(topParams as any)
          }
          if (Object.keys(opParams).length > 0) {
            designStore.updateOperatingParams(opParams as any)
          }
          if (Object.keys(drvParams).length > 0) {
            designStore.updateDrivingParams(drvParams as any)
          }
          if (Object.keys(sepParams).length > 0) {
            designStore.updateSeparationComponents(sepParams as any)
          }

          logStore.info(`已将最优方案（序号 ${optimalIndex}）的结果和参数值更新到初始设计`)
        }
        catch (error) {
          logStore.error(`更新最优方案到初始设计时出错: ${error instanceof Error ? error.message : String(error)}`)
        }
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
    logStore.info(`仿真优化计算完成: 算法=${optimizationAlgorithm.value}, 样本点数=${samplePointCountforRes.value}, 处理结果数=${results.length}, 最优方案序号=${optimalIndex >= 0 ? optimalIndex : '无'}`)
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

// 错误提示回调函数（使用防抖减少频繁提示）
const showError = debounce((message: string) => app.message.error(message), 500)

/**
 * values 列的更新处理，抽离到脚本中避免模板内含复杂正则导致编译报错
 */
function onValuesUpdate(recordId: number, val: any): void {
  const factor = designFactors.value.find(f => f.id === recordId)
  if (!factor)
    return
  const text = (val ?? '').toString().trim()

  // 实时更新值，不进行校验，允许用户自由输入
  if (text.length === 0) {
    factor.values = undefined
  }
  else {
    // 保存原始文本，失焦时再校验
    factor.values = text
  }
}

function onValuesBlur(recordId: number): void {
  const factor = designFactors.value.find(f => f.id === recordId)
  if (!factor)
    return
  const prev = factor.values
  const text = (factor.values ?? '').toString().trim()

  if (optimizationAlgorithm.value === 'MOPSO') {
    // MOPSO: 如果取值有值，则只校验取值不能为空
    if (text.length === 0) {
      // 如果清空取值，允许清空
      factor.values = undefined
      return
    }

    // 校验取值格式
    const parsed = tryParseDiscreteValuesText(text)
    if (!parsed) {
      app.message.error(`${factor.name}取值格式错误，应为数组，如：[10,12,33]`)
      factor.values = prev
      return
    }

    let { arr } = parsed
    if (arr.length === 0) {
      app.message.error(`${factor.name}取值不能为空`)
      factor.values = prev
      return
    }

    // 过滤掉0值（数字0或字符串"0"）
    arr = arr.filter((v) => {
      if (typeof v === 'number') {
        return v !== 0
      }
      if (typeof v === 'string') {
        const num = Number(v)
        return !(Number.isFinite(num) && num === 0)
      }
      return true
    })

    if (arr.length === 0) {
      app.message.error(`${factor.name}取值不能全为0，已自动过滤`)
      factor.values = prev
      return
    }

    // 如果过滤了0值，需要重新生成JSON字符串
    const filteredText = JSON.stringify(arr)
    factor.values = filteredText
    factor.lowerLimit = undefined
    factor.upperLimit = undefined
    factor.levelCount = undefined
    return
  }

  // NSGA-II 或其他算法
  if (text.length === 0) {
    factor.values = undefined
    return
  }

  const parsed = tryParseDiscreteValuesText(text)
  if (!parsed) {
    app.message.error(`【${factor.name}】取值格式错误，应为数组，如：[10,12,33] 或 [a,2,3]`)
    factor.values = prev
    return
  }

  let { arr } = parsed

  // 过滤掉0值（数字0或字符串"0"）
  arr = arr.filter((v) => {
    if (typeof v === 'number') {
      return v !== 0
    }
    if (typeof v === 'string') {
      const num = Number(v)
      return !(Number.isFinite(num) && num === 0)
    }
    return true
  })

  if (arr.length === 0) {
    app.message.error(`【${factor.name}】取值不能全为0，已自动过滤`)
    factor.values = prev
    return
  }

  // 如果过滤了0值，需要重新生成JSON字符串
  const filteredText = JSON.stringify(arr)
  factor.values = filteredText

  // NSGA-II 下，如果填写了"取值"，则把"水平数"统一为取值数量
  if (optimizationAlgorithm.value === 'NSGA-II') {
    const n = arr.length
    if (factor.levelCount !== n) {
      factor.levelCount = n
      app.message.info(`【${factor.name}】水平数已自动统一为取值数量：${n}`)
    }
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
        lowerLimit: optimizationAlgorithm.value === 'MOPSO' ? undefined : 1,
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

/**
 * 组装NSGA-II参数
 */
function assembleNSGAIIParams() {
  // 批量校验所有因子
  const errors = validateNSGAIIFactors(designFactors.value)
  if (errors.length > 0) {
    throw new Error(errors.join('；'))
  }

  // 校验通过，组装参数
  const tableParams: Array<{ name: string, type: string, values: number[], level?: number }> = []
  for (const factor of designFactors.value) {
    const lower = factor.lowerLimit!
    const upper = factor.upperLimit!
    tableParams.push({ name: factor.name, type: ParameterType.CONTINUOUS_FACTOR, values: [lower, upper], level: 3 })
  }

  const params = {
    algorithmType: AlgorithmType.LATIN_HYPERCUBE,
    // 样本数量
    numSamples: samplePointCount.value,
    // 因子数量
    numVars: factorCount.value,
    // 采样准则
    criterion: samplingCriterion.value,
    //
    params: tableParams,
  }

  return params
}

/**
 * 组装MOPSO参数
 */
function assembleMOPSOParams() {
  // 批量校验所有因子
  const errors = validateMOPSOFactors(designFactors.value)
  if (errors.length > 0) {
    throw new Error(errors.join('；'))
  }

  // 校验通过，组装参数
  const paramsPayload: Array<{ name: string, type: 'continuousFactor' | 'discreteFactor', values: any[], level?: number }> = []

  for (const factor of designFactors.value) {
    const name = factor.name!.trim()

    const valuesText = (factor.values ?? '').toString().trim()
    if (valuesText.length > 0) {
      // 有"取值" -> 离散
      const parsed = tryParseDiscreteValuesText(valuesText)!
      const arr = parsed.arr
      const levelCount = arr.length
      if (factor.levelCount !== levelCount) {
        factor.levelCount = levelCount
      }
      paramsPayload.push({ name, type: ParameterType.DISCRETE_FACTOR, values: arr, level: levelCount })
      continue
    }

    // 无"取值"，看是否设置了范围/水平数 -> 连续
    const lower = factor.lowerLimit!
    const upper = factor.upperLimit!
    const level = factor.levelCount!

    paramsPayload.push({ name, type: ParameterType.CONTINUOUS_FACTOR, values: [lower, upper], level })
  }

  const params = {
    algorithmType: AlgorithmType.FULL_FACTORIAL_MIXED,
    // 样本数量
    numSamples: 50,
    // 因子数量
    numVars: factorCount.value,
    // 采样准则
    criterion: '',
    //
    params: paramsPayload,
  }
  return params
}

/**
 * 生成样本空间
 */
async function sampleSpace() {
  if (designFactors.value.length === 0) {
    app.message.error('请先添加设计因子')
    return
  }

  // 先进行参数组装和校验，如果校验失败则不继续
  let params: any
  try {
    if (optimizationAlgorithm.value === 'NSGA-II') {
      params = assembleNSGAIIParams()
    }
    else if (optimizationAlgorithm.value === 'MOPSO') {
      params = assembleMOPSOParams()
    }
    else {
      app.message.error('未知的优化算法')
      return
    }
  }
  catch (error: any) {
    const msg = error?.message || '参数校验失败'
    app.message.error(msg)
    return
  }

  isSampling.value = true
  const hideLoading = app.message.loading('正在生成样本...', 0)

  try {
    const numSamplesLogged = (params as any)?.numSamples ?? (params as any)?.numFactors
    logStore.info(`开始样本取样：算法=${optimizationAlgorithm.value}，准则=${params.criterion}，样本数=${numSamplesLogged}，变量数=${params.numVars}，因子数=${params.params.length}`)
    logStore.info(`取样参数：${JSON.stringify(params)}`)
    const productConfig = getProductConfig()
    const doePort = productConfig.doe?.port || 25504
    const url = `http://localhost:${doePort}/api/v1/integ/doe/generate`
    const res: SampleSpaceData = await app.http.post(url, params)

    // 更新样本数量
    samplePointCountforRes.value = res.experimentCount

    // 兼容多种返回结构，优先使用 { factorNames, sampleMatrix }
    const uiFactorNames = designFactors.value.map(f => f.name)
    let mapped: SampleData[] | null = null

    if (Array.isArray((res as any)?.factorNames) && Array.isArray((res as any)?.sampleMatrix)) {
      const factorNames: string[] = (res as any).factorNames
      const matrix: any[][] = (res as any).sampleMatrix
      mapped = matrix.map((row, idx) => {
        const sample: SampleData = { id: idx + 1 }
        factorNames.forEach((name, colIdx) => {
          sample[name] = row?.[colIdx]
        })
        return sample
      })
    }
    else {
      let samples: any[] = []
      const anyRes: any = res as any
      if (Array.isArray(anyRes))
        samples = anyRes
      else if (Array.isArray(anyRes?.data))
        samples = anyRes.data
      else if (Array.isArray(anyRes?.data?.samples))
        samples = anyRes.data.samples
      else if (Array.isArray(anyRes?.samples))
        samples = anyRes.samples

      if (Array.isArray(samples) && samples.length > 0) {
        mapped = samples.map((item, idx) => {
          const row: SampleData = { id: idx + 1 }
          if (Array.isArray(item)) {
            uiFactorNames.forEach((name, i) => {
              row[name] = item[i]
            })
          }
          else if (typeof item === 'object' && item != null) {
            uiFactorNames.forEach((name) => {
              row[name] = (item[name] ?? item[name.trim()])
            })
          }
          else {
            row[uiFactorNames[0]] = item
          }
          return row
        })
      }
    }

    if (!mapped || mapped.length === 0) {
      app.message.error('接口错误：未返回任何样本数据')
      return
    }

    sampleSpaceData.value = mapped
    app.message.success(`样本生成成功，共 ${mapped.length} 条`)
    logStore.info(`样本生成成功：${mapped.length} 条`)
  }
  catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || '未知错误'
    if (error?.request && !error?.response) {
      app.message.error('网络连接异常，请检查后重试')
      logStore.error('网络连接异常，请检查后重试', '样本生成失败')
    }
    else {
      app.message.error(`接口错误：${msg}`)
      logStore.error(`接口错误：${msg}`, '样本生成失败')
    }
  }
  finally {
    hideLoading()
    isSampling.value = false
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
                  @update:value="(val) => schemeOptimizationStore.setAlgorithm(val as 'NSGA-II' | 'MOPSO')"
                >
                  <a-select-option v-for="option in ALGORITHM_OPTIONS" :key="option.value" :value="option.value" :disabled="option.isDisabled">
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
                    <a-input
                      :value="factorCount" disabled :min="1" style="width: 100%"
                      @update:value="(val) => { factorCount = val ?? 3; onFactorCountChange(val) }"
                    />
                  </a-form-item>

                  <a-form-item label="样本点数" class="form-col">
                    <a-input
                      :value="samplePointCount" :min="1" style="width: 100%"
                      @update:value="(val) => samplePointCount = val ?? 50"
                    />
                  </a-form-item>

                  <a-form-item label="采样准则" class="form-col">
                    <a-select
                      :value="samplingCriterion" style="width: 100%"
                      @update:value="(val) => samplingCriterion = val"
                    >
                      <a-select-option
                        v-for="option in SAMPLING_CRITERION_OPTIONS" :key="option.value"
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
              }" row-key="id" bordered
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
                    :value="record.lowerLimit" style="width: 100%" :min="0"
                    :disabled="optimizationAlgorithm === 'MOPSO' && hasValues(record)" @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.lowerLimit
                      let newVal = val ?? undefined

                      if (optimizationAlgorithm === 'NSGA-II') {
                        // NSGA-II: 校验（清空时不触发必填校验）
                        if (!validateLowerLimitNSGAII(factor, newVal, prev ?? undefined, showError, record)) {
                          return
                        }
                        factor.lowerLimit = newVal
                        record.lowerLimit = newVal
                      }
                      else if (optimizationAlgorithm === 'MOPSO') {
                        // MOPSO: 处理更新逻辑
                        handleMOPSOLowerLimitUpdate(factor, record, newVal, prev ?? undefined, showError)
                      }
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'upperLimit'">
                  <a-input-number
                    :value="record.upperLimit" style="width: 100%" :min="0"
                    :disabled="optimizationAlgorithm === 'MOPSO' && hasValues(record)" @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.upperLimit
                      let newVal = val ?? undefined

                      if (optimizationAlgorithm === 'NSGA-II') {
                        // NSGA-II: 校验（清空时不触发必填校验）
                        if (!validateUpperLimitNSGAII(factor, newVal, prev ?? undefined, showError, record)) {
                          return
                        }
                        factor.upperLimit = newVal
                        record.upperLimit = newVal
                      }
                      else if (optimizationAlgorithm === 'MOPSO') {
                        // MOPSO: 处理更新逻辑
                        handleMOPSOUpperLimitUpdate(factor, record, newVal, prev ?? undefined, showError)
                      }
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'levelCount'">
                  <a-input-number
                    :value="record.levelCount" style="width: 100%"
                    :disabled="(optimizationAlgorithm === 'NSGA-II' && record.type !== '离散') || (optimizationAlgorithm === 'MOPSO' && hasValues(record))"
                    @update:value="(val) => {
                      const factor = designFactors.find(f => f.id === record.id)
                      if (!factor) return
                      const prev = factor.levelCount
                      let newVal = val ?? undefined

                      if (optimizationAlgorithm === 'NSGA-II') {
                        // NSGA-II: 处理水平数更新
                        handleNSGAIILevelCountUpdate(factor, record, newVal, prev ?? undefined, showError)
                      }
                      else if (optimizationAlgorithm === 'MOPSO') {
                        // MOPSO: 处理水平数更新
                        handleMOPSOLevelCountUpdate(factor, record, newVal, prev ?? undefined, showError)
                      }
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'values'">
                  <a-input
                    :value="record.values" placeholder="示例：[10,12,33] 或 [a,2,3]"
                    :disabled="(optimizationAlgorithm === 'NSGA-II' && record.type !== '离散') || (optimizationAlgorithm === 'MOPSO' && hasBoundsOrLevels(record))"
                    @update:value="(val) => onValuesUpdate(record.id, val)"
                    @blur="onValuesBlur(record.id)"
                  />
                </template>
              </template>
            </a-table>
          </a-card>

          <div style="height: 10px;" />

          <!-- 响应值 -->
          <a-card title="响应值">
            <template #extra>
              <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                <a-button :loading="isSampling" type="primary" @click="sampleSpace">
                  样本取样
                </a-button>
              </div>
            </template>

            <a-table
              :columns="[
                { title: '序号', dataIndex: 'id', key: 'id', width: 80 },
                { title: '名称', dataIndex: 'name', key: 'name' },
              ]" :data-source="RESPONSE_VALUES" :pagination="false" size="small" row-key="id" bordered
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
          :columns="sampleSpaceColumns"
          :data-source="sampleSpaceData"
          size="small"
          row-key="id"
          bordered
          :scroll="{ x: 'max-content' }"
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
    <a-button :loading="isOptimizing" type="primary" @click="performOptimization">
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

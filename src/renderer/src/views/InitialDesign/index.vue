<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'

import type { FeedingMethod } from '../../store/designStore'
import { FileTextOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useApp } from '../../app'
import { FEEDING_METHOD_MAP, useDesignStore } from '../../store/designStore'
import { useLogStore } from '../../store/logStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getFieldLabel } from '../../utils/field-labels'

const $app = useApp()
const designStore = useDesignStore()
const logStore = useLogStore()
const settingsStore = useSettingsStore()

const {
  isMultiScheme,
  topLevelParams,
  operatingParams,
  drivingParams,
  separationComponents,
  outputResults,
} = storeToRefs(designStore)

const { fieldLabelMode } = storeToRefs(settingsStore)

const isLoading = ref(false)

// 运行进度条
const progressVisible = ref(false)
const progressPercent = ref(0)
const progressStatus = ref<'normal' | 'active' | 'exception' | 'success'>('normal')
let progressTimer: number | null = null

function startProgress() {
  progressVisible.value = true
  progressStatus.value = 'active'
  progressPercent.value = 0
  // 清理旧定时器
  if (progressTimer != null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
  // 逐步前进到 95%，等待关闭事件后再到 100%
  progressTimer = window.setInterval(() => {
    if (progressPercent.value < 95) {
      // 渐进式推进，越接近95越慢
      const delta = Math.max(1, Math.round((95 - progressPercent.value) * 0.05))
      progressPercent.value = Math.min(95, progressPercent.value + delta)
    }
    else {
      if (progressTimer != null) {
        window.clearInterval(progressTimer)
        progressTimer = null
      }
    }
  }, 300)
}

function completeProgress(isSuccess: boolean) {
  if (progressTimer != null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
  progressPercent.value = 100
  progressStatus.value = isSuccess ? 'success' : 'exception'
  // 稍微停留一下再隐藏
  window.setTimeout(() => {
    progressVisible.value = false
    progressPercent.value = 0
    progressStatus.value = 'normal'
  }, 1000)
}

function stopProgress() {
  if (progressTimer != null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
  progressVisible.value = false
  progressPercent.value = 0
  progressStatus.value = 'normal'
}

/**  读取 input.dat 文件内容 */
async function readTakeData() {
  const fileName = 'input.dat'
  const content = await $app.file.readDatFile(fileName)
  if (content) {
    parseDatContent(content)
  }
  else {
    message.error('未找到input.dat文件')
  }
}

/**
 * Ant Design Vue Form 提交校验模型与规则
 */
const formRef = ref<FormInstance>()
const formModel = reactive({
  ...topLevelParams.value,
  ...operatingParams.value,
  ...drivingParams.value,
  ...separationComponents.value,
})
const prevModel = reactive({ ...formModel })

function isPositiveReal(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

function msgOf(key: string) {
  return `${getFieldLabel(key as any, fieldLabelMode.value)}应输入大于0的实数，请重新输入！`
}

// 需要进行「>0 实数」校验的字段列表
const positiveFields = [
  'angularVelocity',
  'rotorRadius',
  'rotorShoulderLength',
  'rotorSidewallPressure',
  'gasDiffusionCoefficient',
  'feedFlowRate',
  'splitRatio',
  'depletedEndCapTemperature',
  'enrichedEndCapTemperature',
  'feedAxialDisturbance',
  'feedAngularDisturbance',
  'depletedMechanicalDriveAmount',
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
]

const rules: Record<string, any[]> = {}
positiveFields.forEach((key) => {
  rules[key] = [
    {
      validator: (_: any, v: any) => (isPositiveReal(v) ? Promise.resolve() : Promise.reject(msgOf(key))),
      trigger: 'blur',
    },
  ]
})

// 成对约束：贫取料口部「内径 < 外径」
rules.depletedExtractionPortInnerDiameter = [
  ...(rules.depletedExtractionPortInnerDiameter || []),
  {
    validator: (_: any, v: any) => {
      const outer = formModel.depletedExtractionPortOuterDiameter
      if (!isPositiveReal(v) || !isPositiveReal(outer))
        return Promise.resolve()
      return v < outer
        ? Promise.resolve()
        : Promise.reject(new Error('贫取料口部内径应小于贫取料口部外径，请重新输入！'))
    },
    trigger: 'change',
  },
]

rules.depletedExtractionPortOuterDiameter = [
  ...(rules.depletedExtractionPortOuterDiameter || []),
  {
    validator: (_: any, v: any) => {
      const inner = formModel.depletedExtractionPortInnerDiameter
      if (!isPositiveReal(v) || !isPositiveReal(inner))
        return Promise.resolve()
      return v > inner
        ? Promise.resolve()
        : Promise.reject(new Error('贫取料口部外径应大于贫取料口部内径，请重新输入！'))
    },
    trigger: 'change',
  },
]

// 成对约束：贫料挡板外孔「内径 < 外径」
rules.depletedBaffleOuterHoleInnerDiameter = [
  ...(rules.depletedBaffleOuterHoleInnerDiameter || []),
  {
    validator: (_: any, v: any) => {
      const outer = formModel.depletedBaffleOuterHoleOuterDiameter
      if (!isPositiveReal(v) || !isPositiveReal(outer))
        return Promise.resolve()
      return v < outer
        ? Promise.resolve()
        : Promise.reject(new Error('贫料挡板外孔内径应小于贫料挡板外孔外径，请重新输入！'))
    },
    trigger: 'change',
  },
]

rules.depletedBaffleOuterHoleOuterDiameter = [
  ...(rules.depletedBaffleOuterHoleOuterDiameter || []),
  {
    validator: (_: any, v: any) => {
      const inner = formModel.depletedBaffleOuterHoleInnerDiameter
      if (!isPositiveReal(v) || !isPositiveReal(inner))
        return Promise.resolve()
      return v > inner
        ? Promise.resolve()
        : Promise.reject(new Error('贫料挡板外孔外径应大于贫料挡板外孔内径，请重新输入！'))
    },
    trigger: 'change',
  },
]

function updateStoreByField(name: string, val: number | null) {
  if (val == null)
    return
  const topKeys = ['angularVelocity', 'rotorRadius', 'rotorShoulderLength']
  const opKeys = ['rotorSidewallPressure', 'gasDiffusionCoefficient', 'feedFlowRate', 'splitRatio']
  const drvKeys = ['depletedEndCapTemperature', 'enrichedEndCapTemperature', 'feedAxialDisturbance', 'feedAngularDisturbance', 'depletedMechanicalDriveAmount']
  const sepKeys = ['extractionChamberHeight', 'enrichedBaffleHoleDiameter', 'feedBoxShockDiskHeight', 'depletedExtractionArmRadius', 'depletedExtractionPortInnerDiameter', 'depletedBaffleInnerHoleOuterDiameter', 'enrichedBaffleHoleDistributionCircleDiameter', 'depletedExtractionPortOuterDiameter', 'depletedBaffleOuterHoleInnerDiameter', 'minAxialDistance', 'depletedBaffleAxialPosition', 'depletedBaffleOuterHoleOuterDiameter']
  if (topKeys.includes(name)) {
    designStore.updateTopLevelParams({ [name]: val } as any)
  }
  else if (opKeys.includes(name)) {
    designStore.updateOperatingParams({ [name]: val } as any)
  }
  else if (drvKeys.includes(name)) {
    designStore.updateDrivingParams({ [name]: val } as any)
  }
  else if (sepKeys.includes(name)) {
    designStore.updateSeparationComponents({ [name]: val } as any)
  }
}

async function onFieldChange(name: string, val: number | null) {
  const prev = (prevModel as any)[name]
  ;(formModel as any)[name] = val
  try {
    await formRef.value?.validateFields([name])
    ;(prevModel as any)[name] = val
    updateStoreByField(name, val)
    // 变更一方后，联动校验另一方，清除或更新其错误提示
    const PAIR_PARTNER: Record<string, string> = {
      depletedExtractionPortInnerDiameter: 'depletedExtractionPortOuterDiameter',
      depletedExtractionPortOuterDiameter: 'depletedExtractionPortInnerDiameter',
      depletedBaffleOuterHoleInnerDiameter: 'depletedBaffleOuterHoleOuterDiameter',
      depletedBaffleOuterHoleOuterDiameter: 'depletedBaffleOuterHoleInnerDiameter',
    }
    const partner = PAIR_PARTNER[name]
    if (partner) {
      try {
        await formRef.value?.validateFields([partner])
      }
      catch {
        // 不在此处回退另一字段，保持用户对另一字段的控制；仅更新其错误状态
      }
    }
  }
  catch (e: any) {
    const msg = e?.errorFields?.[0]?.errors?.[0] || '参数校验未通过，请重新输入！'
    message.error(msg)
    ;(formModel as any)[name] = prev
  }
}

function syncFormFromStore() {
  Object.assign(formModel, {
    ...topLevelParams.value,
    ...operatingParams.value,
    ...drivingParams.value,
    ...separationComponents.value,
  })
  Object.assign(prevModel, formModel)
}

/**
 * 仿真计算
 */
async function simulateCalculation(): Promise<void> {
  syncFormFromStore()

  try {
    await formRef.value?.validate()
  }
  catch (e: any) {
    const msg = e?.errorFields?.[0]?.errors?.[0] || '参数校验未通过，请检查输入！'
    message.error(msg)
    return
  }

  isLoading.value = true

  message.loading({ content: '正在仿真计算...' })

  logStore.info('开始仿真计算')

  const exeName = 'ns-linear.exe'

  // 校验通过，确保 store 与 formModel 一致（在即时校验中已更新过，这里再统一提交一次）
  // commitFormToStore()

  const designForm = {
    ...topLevelParams.value,
    ...operatingParams.value,
    ...drivingParams.value,
    ...separationComponents.value,
    ...outputResults.value,
  }

  const res = await $app.file.writeDatFile('input.dat', designForm)

  logStore.success(res.message)

  const result = await $app.callExe(exeName)

  console.log(result)

  if (result.status === 'started') {
    logStore.info('调用Fortran开始仿真计算')
    logStore.info('生成输入文件')
    startProgress()
  }
  else {
    logStore.error('Fortran调用失败')
    logStore.error(result.reason)
    message.error(`仿真计算启动失败: ${result.reason}`)
    completeProgress(false)
    stopProgress()
    isLoading.value = false
    // 调用失败时立即停止，不继续执行
  }
}

/**
 * 提交设计
 */
async function submitDesign(): Promise<void> {
  // 提交前，将当前 store 值同步到 formModel，以规则进行整体校验
  syncFormFromStore()
  try {
    await formRef.value?.validate()
  }
  catch (e: any) {
    const msg = e?.errorFields?.[0]?.errors?.[0] || '参数校验未通过，请检查输入！'
    message.error(msg)
    return
  }

  // 校验通过，确保 store 与 formModel 一致（在即时校验中已更新过，这里再统一提交一次）
  // commitFormToStore()

  const designForm = {
    ...topLevelParams.value,
    ...operatingParams.value,
    ...drivingParams.value,
    ...separationComponents.value,
    ...outputResults.value,
  }

  const res = await $app.file.writeDatFile('input.dat', designForm)
  if (res?.code === 0) {
    message.success('提交参数校验通过，已生成输入文件')
  }
  else {
    message.error(res?.message ?? '生成输入文件失败')
  }
}

/**
 * 读取Sep_power.dat替换结果中的分离功率 和 分离系数
 */
function replaceSepPowerParams(content: string): void {
  logStore.info('读取仿真结果文件')

  const lineArr = content
    .replace(/\r\n/g, '\n') // 统一换行符为 \n（兼容 Windows 环境）
    .split('\n') // 按换行符拆分
    .filter(line => line.trim() !== '') // 过滤空行

  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const regex = /^\s*([^=]+?)\s*=\s*(\d+)\s*$/
  const result = {}
  lineArr.forEach((line) => {
    const match = line.match(regex) // 执行匹配
    if (match) {
      const key = match[1].trim() // 指标名（去除前后空格）
      const value = Number(match[2]) // 数值（转为 Number 类型，避免字符串）
      result[key] = value
    }
  })

  designStore.updateOutputResults({
    separationPower: result['ACTURAL SEPERATIVE POWER'],
    separationFactor: result['ACTURAL SEPERATIVE FACTOR'],
  })

  logStore.info('仿真计算完成')

  message.success('仿真计算完成')
}

/**
 * 处理读取的文本内容填充到设计方案中
 * @param content 读取的文本内容
 * 12,12         !径向与轴向网格数
  12,12,12,12,12,12
        !角速度HZ,半径mm,两肩长mm,取料腔高度mm,侧壁压力Pa,扩散系数
  1        !贫料端盖温度K
  2        !精料盖温度K
  3        !贫料机械驱动mm
  4        !贫料取料支臂半径mm
  5        !内边界镜像位置mm
  6        !网格生成方式
  7        !精挡板孔分布圆直径mm
  8        !精挡板孔直径mm
  9        !贫取料口部内径mm
  10        !贫取料口部外径mm
  11        !供料箱与贫取料器最近轴向间距mm
  12        !供料箱激波盘高度mm
  13        !供料流量kg/s
  14        !分流比
  15        !供料角向扰动
  16        !供料轴向扰动
  17        !贫料挡板内孔外径mm
  18        !贫料挡板外孔内径mm
  19        !贫料挡板外孔外径mm
  20        !贫料挡板轴向位置mm
  21        !BWG径向凸起高度mm
  22        !BWG轴向高度mm
  23        !BWG轴向位置mm从贫取料器至BWG中间
  24        !径向网格比
  0        !供料方式
  26        !补偿系数
  27        !流线数据
 */

async function parseDatContent(content: string): Promise<void> {
  const lines = content.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const [angularVelocity, rotorRadius, rotorShoulderLength, rotorSidewallPressure, gasDiffusionCoefficient]
    = lines[1].replace(/!.*/, '').split(',').map(Number)
  designStore.updateTopLevelParams({ angularVelocity, rotorRadius, rotorShoulderLength })
  designStore.updateOperatingParams({ rotorSidewallPressure, gasDiffusionCoefficient })

  const paramKeys = [
    'depletedEndCapTemperature',
    'enrichedEndCapTemperature',
    'depletedMechanicalDriveAmount',
    'depletedExtractionArmRadius',
    'innerBoundaryMirrorPosition',
    'gridGenerationMethod',
    'enrichedBaffleHoleDistributionCircleDiameter',
    'enrichedBaffleHoleDiameter',
    'depletedExtractionPortInnerDiameter',
    'depletedExtractionPortOuterDiameter',
    'minAxialDistance',
    'feedBoxShockDiskHeight',
    'feedFlowRate',
    'splitRatio',
    'feedAngularDisturbance',
    'feedAxialDisturbance',
    'depletedBaffleInnerHoleOuterDiameter',
    'depletedBaffleOuterHoleInnerDiameter',
    'depletedBaffleOuterHoleOuterDiameter',
    'depletedBaffleAxialPosition',
    'bwgRadialProtrusionHeight',
    'bwgAxialHeight',
    'bwgAxialPosition',
    'radialGridRatio',
    'feedingMethod',
    'compensationCoefficient',
    'streamlineData',
  ]

  for (let i = 0; i < paramKeys.length; i++) {
    const raw = lines[i + 2].replace(/!.*/, '').trim()
    const val = Number.isNaN(Number(raw)) ? raw : Number(raw)
    switch (paramKeys[i]) {
      case 'depletedEndCapTemperature':
      case 'enrichedEndCapTemperature':
      case 'feedAxialDisturbance':
      case 'feedAngularDisturbance':
      case 'depletedMechanicalDriveAmount':
        designStore.updateDrivingParams({ [paramKeys[i]]: val })
        break
      case 'feedFlowRate':
      case 'splitRatio':
      case 'feedingMethod':
        designStore.updateOperatingParams({ [paramKeys[i]]: val })
        break
      case 'extractionChamberHeight':
      case 'enrichedBaffleHoleDistributionCircleDiameter':
      case 'enrichedBaffleHoleDiameter':
      case 'depletedExtractionPortInnerDiameter':
      case 'depletedExtractionPortOuterDiameter':
      case 'minAxialDistance':
      case 'feedBoxShockDiskHeight':
      case 'depletedExtractionArmRadius':
      case 'depletedBaffleInnerHoleOuterDiameter':
      case 'depletedBaffleOuterHoleInnerDiameter':
      case 'depletedBaffleOuterHoleOuterDiameter':
      case 'depletedBaffleAxialPosition':
      case 'bwgRadialProtrusionHeight':
      case 'bwgAxialHeight':
      case 'bwgAxialPosition':
      case 'radialGridRatio':
      case 'compensationCoefficient':
      case 'streamlineData':
      case 'innerBoundaryMirrorPosition':
      case 'gridGenerationMethod':
        designStore.updateSeparationComponents({ [paramKeys[i]]: val })
        break
      default:
      // 无匹配则忽略
    }
  }
  // 解析完毕后，同步到表单模型，保证成对约束读到最新值
  syncFormFromStore()
}

// exe关闭事件监听器
async function handleExeClose(_: Electron.IpcRendererEvent, exeName: string, result: any) {
  const fileName = 'Sep_power.dat'

  if (result.isSuccess === false) {
    $app.message.error(`${exeName} 程序异常退出，退出码: ${result.exitCode}`)
    isLoading.value = false
    completeProgress(false)
  }

  else {
    const content = await $app.file.readDatFile(fileName)
    if (!content) {
      isLoading.value = false
      completeProgress(false)
      return
    }
    replaceSepPowerParams(content)
    isLoading.value = false
    completeProgress(true)
  }
}

onMounted(() => {
  window.electron.ipcRenderer.removeAllListeners?.('exe-closed')
  window.electron.ipcRenderer.on('exe-closed', handleExeClose)
  // 初始化一次表单模型与前次合法值
  syncFormFromStore()
  // readTakeData()
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener?.('exe-closed', handleExeClose)
  stopProgress()
})
</script>

<template>
  <div class="initial-design-container">
    <div class="form-content">
      <!-- 顶部按钮 -->
      <div class="top-actions">
        <a-button @click="readTakeData">
          <template #icon>
            <FileTextOutlined />
          </template>
          读取任务数据
        </a-button>
      </div>

      <!-- 设计类型 -->
      <a-card :title="getFieldLabel('designType', fieldLabelMode)">
        <a-card-body>
          <a-checkbox :checked="isMultiScheme" @update:checked="designStore.setIsMultiScheme">
            {{ getFieldLabel('isMultiScheme', fieldLabelMode) }}
          </a-checkbox>
        </a-card-body>
      </a-card>

      <div style="height: 10px;" />

      <a-card :title="getFieldLabel('operatingParams', fieldLabelMode)">
        <a-form ref="formRef" layout="vertical" :model="formModel" :rules="rules">
          <!-- 顶层参数 -->
          <div class="section-title">
            {{ getFieldLabel('topLevelParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item name="angularVelocity" :label="getFieldLabel('angularVelocity', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.angularVelocity"
                  :placeholder="`请输入${getFieldLabel('angularVelocity', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Hz"
                  @update:value="(val) => onFieldChange('angularVelocity', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="rotorRadius" :label="getFieldLabel('rotorRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorRadius"
                  :placeholder="`请输入${getFieldLabel('rotorRadius', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" @update:value="(val) => onFieldChange('rotorRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="rotorShoulderLength" :label="getFieldLabel('rotorShoulderLength', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorShoulderLength"
                  :placeholder="`请输入${getFieldLabel('rotorShoulderLength', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('rotorShoulderLength', val as number | null)"
                />
              </a-form-item>
            </div>
          </div>

          <!-- 运行参数 -->
          <div class="section-title">
            {{ getFieldLabel('operatingParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item name="rotorSidewallPressure" :label="getFieldLabel('rotorSidewallPressure', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.rotorSidewallPressure"
                  :placeholder="`请输入${getFieldLabel('rotorSidewallPressure', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Pa"
                  @update:value="(val) => onFieldChange('rotorSidewallPressure', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="gasDiffusionCoefficient" :label="getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.gasDiffusionCoefficient"
                  :placeholder="`请输入${getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)}`" style="width: 100%"
                  @update:value="(val) => onFieldChange('gasDiffusionCoefficient', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="feedFlowRate" :label="getFieldLabel('feedFlowRate', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.feedFlowRate"
                  :placeholder="`请输入${getFieldLabel('feedFlowRate', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Kg/s"
                  @update:value="(val) => onFieldChange('feedFlowRate', val as number | null)"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedingMethod', fieldLabelMode)" class="form-col">
                <a-select
                  :value="operatingParams.feedingMethod"
                  :placeholder="`请选择${getFieldLabel('feedingMethod', fieldLabelMode)}`" style="width: 100%"
                  @update:value="(val) => designStore.updateOperatingParams({ feedingMethod: val as FeedingMethod })"
                >
                  <a-select-option v-for="option in FEEDING_METHOD_MAP" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item name="splitRatio" :label="getFieldLabel('splitRatio', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.splitRatio"
                  :placeholder="`请输入${getFieldLabel('splitRatio', fieldLabelMode)}`" style="width: 100%"
                  @update:value="(val) => onFieldChange('splitRatio', val as number | null)"
                />
              </a-form-item>
            </div>
          </div>

          <!-- 驱动参数 -->
          <div class="section-title">
            {{ getFieldLabel('drivingParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item name="depletedEndCapTemperature" :label="getFieldLabel('depletedEndCapTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.depletedEndCapTemperature"
                  :placeholder="`请输入${getFieldLabel('depletedEndCapTemperature', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => onFieldChange('depletedEndCapTemperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="enrichedEndCapTemperature" :label="getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.enrichedEndCapTemperature"
                  :placeholder="`请输入${getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => onFieldChange('enrichedEndCapTemperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="feedAxialDisturbance" :label="getFieldLabel('feedAxialDisturbance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.feedAxialDisturbance"
                  :placeholder="`请输入${getFieldLabel('feedAxialDisturbance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('feedAxialDisturbance', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="feedAngularDisturbance" :label="getFieldLabel('feedAngularDisturbance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.feedAngularDisturbance"
                  :placeholder="`请输入${getFieldLabel('feedAngularDisturbance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('feedAngularDisturbance', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="depletedMechanicalDriveAmount" :label="getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.depletedMechanicalDriveAmount"
                  :placeholder="`请输入${getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedMechanicalDriveAmount', val as number | null)"
                />
              </a-form-item>
            </div>
          </div>

          <!-- 分离部件 -->
          <div class="section-title">
            {{ getFieldLabel('separationComponents', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item name="extractionChamberHeight" :label="getFieldLabel('extractionChamberHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.extractionChamberHeight"
                  :placeholder="`请输入${getFieldLabel('extractionChamberHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('extractionChamberHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="enrichedBaffleHoleDiameter" :label="getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('enrichedBaffleHoleDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="feedBoxShockDiskHeight" :label="getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.feedBoxShockDiskHeight"
                  :placeholder="`请输入${getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('feedBoxShockDiskHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="depletedExtractionArmRadius" :label="getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedExtractionArmRadius"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionArmRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionPortInnerDiameter"
                :label="getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionPortInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionPortInnerDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleInnerHoleOuterDiameter"
                :label="getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedBaffleInnerHoleOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedBaffleInnerHoleOuterDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="enrichedBaffleHoleDistributionCircleDiameter"
                :label="getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDistributionCircleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('enrichedBaffleHoleDistributionCircleDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionPortOuterDiameter"
                :label="getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionPortOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionPortOuterDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleOuterHoleInnerDiameter"
                :label="getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedBaffleOuterHoleInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedBaffleOuterHoleInnerDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="minAxialDistance" :label="getFieldLabel('minAxialDistance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.minAxialDistance"
                  :placeholder="`请输入${getFieldLabel('minAxialDistance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('minAxialDistance', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="depletedBaffleAxialPosition" :label="getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedBaffleAxialPosition"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedBaffleAxialPosition', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleOuterHoleOuterDiameter"
                :label="getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedBaffleOuterHoleOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedBaffleOuterHoleOuterDiameter', val as number | null)"
                />
              </a-form-item>
            </div>
          </div>
        </a-form>
      </a-card>
    </div>
  </div>

  <div class="bottom-actions">
    <!-- 输出结果 -->
    <div class="output-results">
      <a-space size="large">
        <div class="result-item">
          <span class="result-label">{{ getFieldLabel('separationPower', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{ outputResults.separationPower !== null && outputResults.separationPower !== undefined
              ? outputResults.separationPower.toFixed(2) : '-' }} W
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">{{ getFieldLabel('separationFactor', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{ outputResults.separationFactor !== null && outputResults.separationFactor !== undefined
              ? outputResults.separationFactor.toFixed(4) : '-' }}
          </span>
        </div>
      </a-space>
    </div>

    <!-- 操作按钮 -->
    <div class="action-row">
      <div v-if="progressVisible" class="progress-wrapper">
        <a-progress :percent="progressPercent" :status="progressStatus" />
      </div>
      <a-space>
        <a-button type="primary" :disabled="isLoading" @click="simulateCalculation">
          仿真计算
        </a-button>
        <a-button type="primary" @click="submitDesign">
          提交设计
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<style scoped>
.initial-design-container {
  padding: 10px;
}

.top-actions {
  margin-bottom: 10px;
}

.section-content {
  margin-bottom: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 24px;
  margin-bottom: 16px;
}

.form-col {
  margin-bottom: 0;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-label {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.result-value {
  font-weight: 600;
  color: #1890ff;
  font-size: 14px;
}

.output-results {
  width: 100%;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-wrapper {
  min-width: 240px;
}

/* 调试面板样式 */
.debug-panel {
  border: 2px dashed #1890ff;
  border-radius: 8px;
  padding: 8px;
  background-color: #f0f8ff;
}

.debug-info {
  font-size: 12px;
  line-height: 1.4;
}

.debug-info p {
  margin: 4px 0;
}

.debug-info ul {
  margin: 4px 0 0 16px;
  padding: 0;
}

.debug-info li {
  margin: 2px 0;
  color: #1890ff;
  font-weight: 500;
}
</style>

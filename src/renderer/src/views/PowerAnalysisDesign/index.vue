<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'

import { FileTextOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useLogStore } from '../../store/logStore'
import { usePowerAnalysisDesignStore } from '../../store/powerAnalysisDesignStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getFieldLabel } from '../../utils/field-labels'

const designStore = usePowerAnalysisDesignStore()
const logStore = useLogStore()
const settingsStore = useSettingsStore()

const { isMultiScheme, topLevelParams, fluidParams, separationComponents, outputResults } = storeToRefs(designStore)

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
  const content = await app.file.readDatFile(fileName)
  if (content) {
    parseDatContent(content)
  }
  else {
    message.error('未找到input.dat文件')
  }
}

const formRef = ref<FormInstance>()
const formModel = reactive({
  ...topLevelParams.value,
  ...fluidParams.value,
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
  'averageTemperature',
  'enrichedBaffleTemperature',
  'feedFlowRate',
  'rotorSidewallPressure',
  'depletedExtractionPortInnerDiameter',
  'depletedExtractionPortOuterDiameter',
  'depletedExtractionRootOuterDiameter',
  'extractorAngleOfAttack',
  'extractionChamberHeight',
  'depletedExtractionCenterDistance',
  'enrichedExtractionCenterDistance',
  'constantSectionStraightPipeLength',
  'extractorCuttingAngle',
  'enrichedBaffleHoleDiameter',
  'variableSectionStraightPipeLength',
  'bendRadiusOfCurvature',
  'extractorSurfaceRoughness',
  'extractorTaperAngle',
  'enrichedBaffleHoleDistributionCircleDiameter',
]

const rules: Record<string, any[]> = {}
positiveFields.forEach((key) => {
  rules[key] = [
    {
      validator: (_: any, v: any) => {
        // 不允许空值
        if (v === null || v === undefined || v === '')
          return Promise.reject(msgOf(key))
        // 处理字符串 '0' 的情况
        const numValue = typeof v === 'string' ? Number(v) : v
        // 如果输入了0（无论是数字0还是字符串'0'），必须拒绝
        if (numValue === 0)
          return Promise.reject(msgOf(key))
        // 验证是否为正数
        return isPositiveReal(numValue) ? Promise.resolve() : Promise.reject(msgOf(key))
      },
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
      return v < outer ? Promise.resolve() : Promise.reject(new Error('贫取料口部内径应小于贫取料口部外径，请重新输入！'))
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
      return v > inner ? Promise.resolve() : Promise.reject(new Error('贫取料口部外径应大于贫取料口部内径，请重新输入！'))
    },
    trigger: 'change',
  },
]

function updateStoreByField(name: string, val: number | null) {
  if (val == null)
    return
  const topKeys = ['angularVelocity', 'rotorRadius']
  const fluidKeys = ['averageTemperature', 'enrichedBaffleTemperature', 'feedFlowRate', 'rotorSidewallPressure']
  const sepKeys = [
    'depletedExtractionPortInnerDiameter',
    'depletedExtractionPortOuterDiameter',
    'depletedExtractionRootOuterDiameter',
    'extractorAngleOfAttack',
    'extractionChamberHeight',
    'depletedExtractionCenterDistance',
    'enrichedExtractionCenterDistance',
    'constantSectionStraightPipeLength',
    'extractorCuttingAngle',
    'enrichedBaffleHoleDiameter',
    'variableSectionStraightPipeLength',
    'bendRadiusOfCurvature',
    'extractorSurfaceRoughness',
    'extractorTaperAngle',
    'enrichedBaffleHoleDistributionCircleDiameter',
  ]
  if (topKeys.includes(name)) {
    designStore.updateTopLevelParams({ [name]: val } as any)
  }
  else if (fluidKeys.includes(name)) {
    designStore.updateFluidParams({ [name]: val } as any)
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
    }
    const partner = PAIR_PARTNER[name]
    if (partner) {
      // 如果对方字段有值，才进行联动验证
      const partnerValue = formModel[partner]
      if (partnerValue !== null && partnerValue !== undefined && partnerValue !== '') {
        try {
          await formRef.value?.validateFields([partner])
        }
        catch {
          // 不在此处回退另一字段，保持用户对另一字段的控制；仅更新其错误状态
        }
      }
      else {
        // 如果对方字段为空，清除其验证错误
        formRef.value?.clearValidate([partner])
      }
    }
  }
  catch {
    // 去掉轻提示，只保留表单字段的错误提示
    ;(formModel as any)[name] = prev
  }
}

function syncFormFromStore() {
  Object.assign(formModel, {
    ...topLevelParams.value,
    ...fluidParams.value,
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

  const designForm = {
    ...topLevelParams.value,
    ...fluidParams.value,
    ...separationComponents.value,
    ...outputResults.value,
  }

  const res = await app.file.writeDatFile('input.dat', designForm)

  logStore.success(res.message)

  const result = await app.callExe(exeName)

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
  }
}

/**
 * 提交设计
 */
async function submitDesign(): Promise<void> {
  syncFormFromStore()
  try {
    await formRef.value?.validate()
  }
  catch (e: any) {
    const msg = e?.errorFields?.[0]?.errors?.[0] || '参数校验未通过，请检查输入！'
    message.error(msg)
    return
  }

  const designForm = {
    ...topLevelParams.value,
    ...fluidParams.value,
    ...separationComponents.value,
    ...outputResults.value,
  }

  const res = await app.file.writeDatFile('input.dat', designForm)
  if (res?.code === 0) {
    message.success('提交参数校验通过，已生成输入文件')
  }
  else {
    message.error(res?.message ?? '生成输入文件失败')
  }
}

/**
 * 读取Sep_power.dat替换结果中的功耗
 */
function replacePowerParams(content: string): void {
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
    depletedExtractorPowerConsumption: result.DEPLETED_EXTRACTOR_POWER_CONSUMPTION,
    totalExtractorPowerConsumption: result.TOTAL_EXTRACTOR_POWER_CONSUMPTION,
  })

  logStore.info('仿真计算完成')

  message.success('仿真计算完成')
}

/**
 * 处理读取的文本内容填充到设计方案中
 */
// async function parseDatContent(content: string): Promise<void> {
//   // 这里可以根据实际的文件格式来解析
//   // 暂时使用简单的解析逻辑
//   const lines = content
//     .trim()
//     .split('\n')
//     .map(l => l.trim())
//     .filter(Boolean)

//   // 解析逻辑根据实际 input.dat 格式实现
//   // 这里只是示例
//   syncFormFromStore()
// }

// exe关闭事件监听器
async function handleExeClose(_: Electron.IpcRendererEvent, exeName: string, result: any) {
  const fileName = 'Sep_power.dat'

  if (result.isSuccess === false) {
    app.message.error(`${exeName} 程序异常退出，退出码: ${result.exitCode}`)
    isLoading.value = false
    completeProgress(false)
  }
  else {
    const content = await app.file.readDatFile(fileName)
    if (!content) {
      isLoading.value = false
      completeProgress(false)
      return
    }
    replacePowerParams(content)
    isLoading.value = false
    completeProgress(true)
  }
}

onMounted(() => {
  window.electron.ipcRenderer.removeAllListeners?.('exe-closed')
  window.electron.ipcRenderer.on('exe-closed', handleExeClose)
  // 初始化一次表单模型与前次合法值
  syncFormFromStore()
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener?.('exe-closed', handleExeClose)
  stopProgress()
})
</script>

<template>
  <div class="power-analysis-design-container">
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
        <a-checkbox :checked="isMultiScheme" @update:checked="designStore.setIsMultiScheme">
          {{ getFieldLabel('isMultiScheme', fieldLabelMode) }}
        </a-checkbox>
      </a-card>

      <div style="height: 10px" />

      <a-card :title="getFieldLabel('designType', fieldLabelMode)">
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
                  :placeholder="`请输入${getFieldLabel('angularVelocity', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Hz"
                  @update:value="(val) => onFieldChange('angularVelocity', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="rotorRadius" :label="getFieldLabel('rotorRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorRadius"
                  :placeholder="`请输入${getFieldLabel('rotorRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('rotorRadius', val as number | null)"
                />
              </a-form-item>
            </div>
          </div>

          <!-- 流体参数 -->
          <div class="section-title">
            {{ getFieldLabel('fluidParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item name="averageTemperature" :label="getFieldLabel('averageTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="fluidParams.averageTemperature"
                  :placeholder="`请输入${getFieldLabel('averageTemperature', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => onFieldChange('averageTemperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="enrichedBaffleTemperature" :label="getFieldLabel('enrichedBaffleTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="fluidParams.enrichedBaffleTemperature"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleTemperature', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => onFieldChange('enrichedBaffleTemperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="feedFlowRate" :label="getFieldLabel('feedFlowRate', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="fluidParams.feedFlowRate"
                  :placeholder="`请输入${getFieldLabel('feedFlowRate', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Kg/s"
                  @update:value="(val) => onFieldChange('feedFlowRate', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="rotorSidewallPressure" :label="getFieldLabel('rotorSidewallPressure', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="fluidParams.rotorSidewallPressure"
                  :placeholder="`请输入${getFieldLabel('rotorSidewallPressure', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Pa"
                  @update:value="(val) => onFieldChange('rotorSidewallPressure', val as number | null)"
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
              <a-form-item
                name="depletedExtractionPortInnerDiameter"
                :label="getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionPortInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionPortInnerDiameter', val as number | null)"
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
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionPortOuterDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionRootOuterDiameter"
                :label="getFieldLabel('depletedExtractionRootOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionRootOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionRootOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionRootOuterDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="extractorAngleOfAttack"
                :label="getFieldLabel('extractorAngleOfAttack', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.extractorAngleOfAttack"
                  :placeholder="`请输入${getFieldLabel('extractorAngleOfAttack', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="rad"
                  @update:value="(val) => onFieldChange('extractorAngleOfAttack', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="extractionChamberHeight" :label="getFieldLabel('extractionChamberHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.extractionChamberHeight"
                  :placeholder="`请输入${getFieldLabel('extractionChamberHeight', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('extractionChamberHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionCenterDistance"
                :label="getFieldLabel('depletedExtractionCenterDistance', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionCenterDistance"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionCenterDistance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('depletedExtractionCenterDistance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="enrichedExtractionCenterDistance"
                :label="getFieldLabel('enrichedExtractionCenterDistance', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.enrichedExtractionCenterDistance"
                  :placeholder="`请输入${getFieldLabel('enrichedExtractionCenterDistance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('enrichedExtractionCenterDistance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="constantSectionStraightPipeLength"
                :label="getFieldLabel('constantSectionStraightPipeLength', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.constantSectionStraightPipeLength"
                  :placeholder="`请输入${getFieldLabel('constantSectionStraightPipeLength', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('constantSectionStraightPipeLength', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="extractorCuttingAngle" :label="getFieldLabel('extractorCuttingAngle', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.extractorCuttingAngle"
                  :placeholder="`请输入${getFieldLabel('extractorCuttingAngle', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="rad"
                  @update:value="(val) => onFieldChange('extractorCuttingAngle', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="enrichedBaffleHoleDiameter" :label="getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('enrichedBaffleHoleDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="variableSectionStraightPipeLength"
                :label="getFieldLabel('variableSectionStraightPipeLength', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.variableSectionStraightPipeLength"
                  :placeholder="`请输入${getFieldLabel('variableSectionStraightPipeLength', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('variableSectionStraightPipeLength', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="bendRadiusOfCurvature" :label="getFieldLabel('bendRadiusOfCurvature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.bendRadiusOfCurvature"
                  :placeholder="`请输入${getFieldLabel('bendRadiusOfCurvature', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('bendRadiusOfCurvature', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="extractorSurfaceRoughness" :label="getFieldLabel('extractorSurfaceRoughness', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.extractorSurfaceRoughness"
                  :placeholder="`请输入${getFieldLabel('extractorSurfaceRoughness', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('extractorSurfaceRoughness', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="extractorTaperAngle" :label="getFieldLabel('extractorTaperAngle', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.extractorTaperAngle"
                  :placeholder="`请输入${getFieldLabel('extractorTaperAngle', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="rad"
                  @update:value="(val) => onFieldChange('extractorTaperAngle', val as number | null)"
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
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('enrichedBaffleHoleDistributionCircleDiameter', val as number | null)"
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
          <span class="result-label">{{ getFieldLabel('depletedExtractorPowerConsumption', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{
              outputResults.depletedExtractorPowerConsumption !== null && outputResults.depletedExtractorPowerConsumption !== undefined
                ? outputResults.depletedExtractorPowerConsumption.toFixed(2)
                : '-'
            }}
            W
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">{{ getFieldLabel('totalExtractorPowerConsumption', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{
              outputResults.totalExtractorPowerConsumption !== null && outputResults.totalExtractorPowerConsumption !== undefined
                ? outputResults.totalExtractorPowerConsumption.toFixed(2)
                : '-'
            }}
            W
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
.power-analysis-design-container {
  padding: 10px;
  margin-bottom: 60px;
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
</style>

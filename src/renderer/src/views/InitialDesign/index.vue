<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'

import type { FeedingMethod } from '../../store/designStore'
import { FileTextOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useSchemeOptimizationStore } from '../../store'
import { FEEDING_METHOD_MAP, useDesignStore } from '../../store/designStore'
import { useLogStore } from '../../store/logStore'
import { useSettingsStore } from '../../store/settingsStore'
import { FIELD_LABELS, getFieldLabel } from '../../utils/field-labels'
import { findValue, parseSepPowerFile } from '../../utils/parseSepPower'

const props = defineProps({
  showButton: {
    type: Boolean,
    default: true,
  },
  selectedScheme: {
    type: Object as () => any,
    default: null,
  },
} as const)

const designStore = useDesignStore()
const logStore = useLogStore()
const settingsStore = useSettingsStore()
const schemeOptStore = useSchemeOptimizationStore()

const { isMultiScheme, formData, outputResults } = storeToRefs(designStore)

// 从方案优化仓库读取已添加的设计因子，用于禁用设计表单对应字段
const { designFactors: optDesignFactors } = storeToRefs(schemeOptStore)

function getFieldKeyByLabel(label: string): string | null {
  for (const [key, map] of Object.entries(FIELD_LABELS)) {
    if (map['zh-CN'] === label)
      return key
  }
  return null
}

// 需要禁用的字段集合：由“方案优化”里已添加的设计因子名称反查得到
const disabledKeys = computed(() => {
  const set = new Set<string>()
  optDesignFactors.value.forEach((f) => {
    const key = getFieldKeyByLabel(f.name)
    if (key)
      set.add(key)
  })
  return set
})

function isFactorDisabledByKey(key: string): boolean {
  return disabledKeys.value.has(key)
}

const { fieldLabelMode } = storeToRefs(settingsStore)

const isLoading = ref(false)

/**  读取 input.txt 文件内容 */
async function readTakeData() {
  const fileName = 'input.txt'
  const content = await app.file.readDatFile(fileName)
  if (content) {
    console.log(content, 'content')
    // 自动识别格式：包含 '=' 使用 txt 解析，否则使用 dat 解析
    if (content.includes('=')) {
      parseTxtContent(content)
    }
    else {
      parseDatContent(content)
    }
  }
  else {
    message.error('未找到input.txt文件')
  }
}

const formRef = ref<FormInstance>()
const formModel = reactive({
  ...formData.value,
})
const prevModel = reactive({ ...formModel })

function isPositiveReal(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

function msgOf(key: string) {
  return `${getFieldLabel(key as any, fieldLabelMode.value)}应输入大于0的实数，请重新输入！`
}

// 需要进行「> 0 的实数」校验的字段列表
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

// 成对约束：贫料挡板外孔「内径 < 外径」
rules.depletedBaffleOuterHoleInnerDiameter = [
  ...(rules.depletedBaffleOuterHoleInnerDiameter || []),
  {
    validator: (_: any, v: any) => {
      const outer = formModel.depletedBaffleOuterHoleOuterDiameter
      if (!isPositiveReal(v) || !isPositiveReal(outer))
        return Promise.resolve()
      return v < outer ? Promise.resolve() : Promise.reject(new Error('贫料挡板外孔内径应小于贫料挡板外孔外径，请重新输入！'))
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
      return v > inner ? Promise.resolve() : Promise.reject(new Error('贫料挡板外孔外径应大于贫料挡板外孔内径，请重新输入！'))
    },
    trigger: 'change',
  },
]

function updateStoreByField(name: string, val: number | null) {
  if (val == null)
    return
  designStore.updateFormData({ [name]: val } as any)
}

async function onFieldChange(name: string, val: number | null) {
  const prev = (prevModel as any)[name]
    ; (formModel as any)[name] = val
  try {
    await formRef.value?.validateFields([name])
    ; (prevModel as any)[name] = val
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
    ; (formModel as any)[name] = prev
  }
}

/**
 * 从 store 同步表单数据到模型
 */
function syncFormFromStore() {
  Object.assign(formModel, {
    ...formData.value,
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
  catch {
    const msg = '参数校验未通过，请检查输入！'
    message.error(msg)
    return
  }

  // 显示确认弹窗
  app.dialog.confirm({
    title: '确认仿真计算',
    content: '是否开始执行仿真计算？这可能需要较长时间。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      await executeSimulateCalculation()
    },
  })
}

/**
 * 执行仿真计算
 */
async function executeSimulateCalculation(): Promise<void> {
  isLoading.value = true

  logStore.info('开始仿真计算')

  const exeName = 'ns-linear.exe'

  const designForm = {
    ...formData.value,
    ...outputResults.value,
  }

  const res = await app.file.writeDatFile('input.dat', designForm)

  logStore.success(res.message)

  const result = await app.callExe(exeName)

  if (result.status === 'started') {
    logStore.info('调用Fortran开始仿真计算')
    logStore.info('生成输入文件')
    app.window.loading.open({
      data: {
        title: '正在进行仿真计算...',
      },
    })
  }
  else {
    logStore.error('Fortran调用失败')
    logStore.error(result.reason)
    message.error(`仿真计算启动失败: ${result.reason}`)
    app.window.loading.close()
    isLoading.value = false
  }
}

/**
 * 提交设计
 */
async function submitDesign(): Promise<void> {
  syncFormFromStore()
  if (!outputResults.value.separationPower || !outputResults.value.separationFactor) {
    message.error('请先进行仿真计算，获取分离功率和分离系数')
    return
  }
  try {
    await formRef.value?.validate()
  }
  catch (e: any) {
    const msg = e?.errorFields?.[0]?.errors?.[0] || '参数校验未通过，请检查输入！'
    message.error(msg)
    return
  }
  // 生成 output.txt（key=value）内容
  const ORDERED_KEYS: Array<{ key: string, field: string }> = [
    { key: 'DegSpeed', field: 'angularVelocity' },
    { key: 'RotorRadius', field: 'rotorRadius' },
    { key: 'RotorLength', field: 'rotorShoulderLength' },
    { key: 'FeedMethod', field: 'feedingMethod' },
    { key: 'RotorPressure', field: 'rotorSidewallPressure' },
    { key: 'GasParam', field: 'gasDiffusionCoefficient' },
    { key: 'FeedFlow', field: 'feedFlowRate' },
    { key: 'SplitRatio', field: 'splitRatio' },
    { key: 'PoorCoverTemp', field: 'depletedEndCapTemperature' },
    { key: 'RichCoverTemp', field: 'enrichedEndCapTemperature' },
    { key: 'FeedAxialDist', field: 'feedAxialDisturbance' },
    { key: 'FeedDegDist', field: 'feedAngularDisturbance' },
    { key: 'PoorDrive', field: 'depletedMechanicalDriveAmount' },
    { key: 'TackHeight', field: 'extractionChamberHeight' },
    { key: 'RichBaffleHoleDiam', field: 'enrichedBaffleHoleDiameter' },
    { key: 'FeedBoxHeight', field: 'feedBoxShockDiskHeight' },
    { key: 'PoorArmRadius', field: 'depletedExtractionArmRadius' },
    { key: 'PoorTackInnerRadius', field: 'depletedExtractionPortInnerDiameter' },
    { key: 'PoorTackOuterRadius', field: 'depletedExtractionPortOuterDiameter' },
    { key: 'PoorBaffleInnerHoleOuterRadius', field: 'depletedBaffleInnerHoleOuterDiameter' },
    { key: 'PoorBaffleOuterHoleInnerRadius', field: 'depletedBaffleOuterHoleInnerDiameter' },
    { key: 'PoorBaffleOuterHoleOuterRadius', field: 'depletedBaffleOuterHoleOuterDiameter' },
    { key: 'RichBaffleArrayHoleDiam', field: 'enrichedBaffleHoleDistributionCircleDiameter' },
    { key: 'FeedBoxAndPoorInterval', field: 'minAxialDistance' },
    { key: 'PoorBaffleAxialSpace', field: 'depletedBaffleAxialPosition' },
  ]

  const lines: string[] = ORDERED_KEYS.map(({ key, field }) => {
    const v: any = (formData.value as any)[field]
    // feedingMethod：保证输出为数字 0/1
    if (field === 'feedingMethod') {
      const n = Number(v)
      return `${key}=${Number.isFinite(n) ? n : 0}`
    }
    return `${key}=${v ?? ''}`
  })

  // 输出结果
  lines.push(`SplitPower=${outputResults.value.separationPower ?? ''}`)
  lines.push(`SplitParam=${outputResults.value.separationFactor ?? ''}`)

  // 写入到 testFile/output.txt
  const baseDir = await app.file.getWorkDir()
  const outPath = baseDir.includes('\\') ? `${baseDir}\\output.txt` : `${baseDir}/output.txt`
  await app.file.writeFile(outPath, lines.join('\n'))

  message.success(`方案提交成功，已生成 ${outPath}`)
}

/**
 * 读取Sep_power.dat替换结果中的分离功率 和 分离系数
 */
function replaceSepPowerParams(content: string): void {
  logStore.info('读取仿真结果文件')

  const result = parseSepPowerFile(content)

  designStore.updateOutputResults({
    separationPower: findValue(result, ['ACTURAL SEPERATIVE POWER', 'ACTUAL SEPERATIVE POWER']),
    separationFactor: findValue(result, ['ACTURAL SEPERATIVE FACTOR', 'ACTUAL SEPERATIVE FACTOR']),
  })

  logStore.info('仿真计算完成')
  message.success('仿真计算完成')
}

/**
 * 处理读取的文本内容填充到设计方案中
 * @param content 读取的文本内容
 */
async function parseDatContent(content: string): Promise<void> {
  const lines = content
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  const [angularVelocity, rotorRadius, rotorShoulderLength, rotorSidewallPressure, gasDiffusionCoefficient] = lines[1]
    .replace(/!.*/, '')
    .split(',')
    .map(Number)
  designStore.updateFormData({ angularVelocity, rotorRadius, rotorShoulderLength, rotorSidewallPressure, gasDiffusionCoefficient } as any)

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
    // 扁平化结构：统一更新
    designStore.updateFormData({ [paramKeys[i]]: val } as any)
  }
  // 解析完毕后，同步到表单模型，保证成对约束读到最新值
  syncFormFromStore()
}

/**
 * 解析 input.txt (key=value) 内容并填充到 formData
 * 映射关系来源于产品字段清单：将英文键映射到扁平化的表单字段
 */
function parseTxtContent(content: string): void {
  // 使用字符串键映射到扁平化字段名
  const KEY_MAP: Record<string, string> = {
    // 顶层参数
    DegSpeed: 'angularVelocity',
    RotorRadius: 'rotorRadius',
    RotorLength: 'rotorShoulderLength',

    // 运行参数
    FeedMethod: 'feedingMethod',
    RotorPressure: 'rotorSidewallPressure',
    GasParam: 'gasDiffusionCoefficient',
    FeedFlow: 'feedFlowRate',
    SplitRatio: 'splitRatio',

    // 驱动参数
    PoorCoverTemp: 'depletedEndCapTemperature',
    RichCoverTemp: 'enrichedEndCapTemperature',
    FeedAxialDist: 'feedAxialDisturbance',
    FeedDegDist: 'feedAngularDisturbance',
    PoorDrive: 'depletedMechanicalDriveAmount',

    // 分离部件
    TackHeight: 'extractionChamberHeight',
    RichBaffleHoleDiam: 'enrichedBaffleHoleDiameter',
    FeedBoxHeight: 'feedBoxShockDiskHeight',
    PoorArmRadius: 'depletedExtractionArmRadius',
    PoorTackInnerRadius: 'depletedExtractionPortInnerDiameter',
    PoorTackOuterRadius: 'depletedExtractionPortOuterDiameter',
    PoorBaffleInnerHoleOuterRadius: 'depletedBaffleInnerHoleOuterDiameter',
    PoorBaffleOuterHoleInnerRadius: 'depletedBaffleOuterHoleInnerDiameter',
    PoorBaffleOuterHoleOuterRadius: 'depletedBaffleOuterHoleOuterDiameter',
    RichBaffleArrayHoleDiam: 'enrichedBaffleHoleDistributionCircleDiameter',
    FeedBoxAndPoorInterval: 'minAxialDistance',
    PoorBaffleAxialSpace: 'depletedBaffleAxialPosition',
  }

  const updates: Record<string, any> = {}

  const removeInvisible = (s: string) => s.replace(/[\u200B-\u200D\uFEFF]/g, '')

  content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawKey, rawVal] = line.split('=')
      if (!rawKey)
        return
      const key = removeInvisible(rawKey.trim())
      const mapped = KEY_MAP[key]
      if (!mapped)
        return
      const valStr = removeInvisible((rawVal ?? '').trim())
      const num = Number(valStr)
      let val: any = Number.isFinite(num) ? num : valStr
      if (mapped === 'feedingMethod') {
        // 供料方式：支持数值(0/1)或中文枚举
        if (typeof val === 'number') {
          val = val === 1 ? 1 : 0
        }
        else if (typeof val === 'string') {
          val = val.includes('均') ? 1 : 0
        }
      }
      updates[mapped] = val
    })

  if (Object.keys(updates).length > 0) {
    designStore.updateFormData(updates)
    syncFormFromStore()
    message.success('已从 input.txt 填充到表单')
  }
  else {
    message.warning('input.txt 未包含可识别的参数键')
  }
}

// Fortran关闭事件监听器
async function handleExeClose(_: Electron.IpcRendererEvent, _exeName: string, result: any) {
  const fileName = 'Sep_power.dat'

  if (result.isSuccess === false) {
    app.message.error(`Fortran 程序异常退出，退出码: ${result.exitCode}`)
    isLoading.value = false
    app.window.loading.close()
  }
  else {
    const content = await app.file.readDatFile(fileName)
    if (!content) {
      isLoading.value = false
      app.window.loading.close()
      return
    }
    replaceSepPowerParams(content)
    isLoading.value = false
    app.window.loading.close()
  }
}

// 监听 selectedScheme 变化，自动填充表单
function fillFormFromScheme(scheme: any) {
  if (!scheme)
    return

  // 更新 store 中的各个参数
  designStore.updateFormData({
    angularVelocity: scheme.angularVelocity,
    rotorRadius: scheme.rotorRadius,
    rotorShoulderLength: scheme.rotorShoulderLength,
    rotorSidewallPressure: scheme.rotorSidewallPressure,
    gasDiffusionCoefficient: scheme.gasDiffusionCoefficient,
    feedFlowRate: scheme.feedFlowRate,
    splitRatio: scheme.splitRatio,
    feedingMethod: scheme.feedingMethod,
    depletedEndCapTemperature: scheme.depletedEndCapTemperature,
    enrichedEndCapTemperature: scheme.enrichedEndCapTemperature,
    feedAxialDisturbance: scheme.feedAxialDisturbance,
    feedAngularDisturbance: scheme.feedAngularDisturbance,
    depletedMechanicalDriveAmount: scheme.depletedMechanicalDriveAmount,
    extractionChamberHeight: scheme.extractionChamberHeight,
    enrichedBaffleHoleDiameter: scheme.enrichedBaffleHoleDiameter,
    feedBoxShockDiskHeight: scheme.feedBoxShockDiskHeight,
    depletedExtractionArmRadius: scheme.depletedExtractionArmRadius,
    depletedExtractionPortInnerDiameter: scheme.depletedExtractionPortInnerDiameter,
    depletedBaffleInnerHoleOuterDiameter: scheme.depletedBaffleInnerHoleOuterDiameter,
    enrichedBaffleHoleDistributionCircleDiameter: scheme.enrichedBaffleHoleDistributionCircleDiameter,
    depletedExtractionPortOuterDiameter: scheme.depletedExtractionPortOuterDiameter,
    depletedBaffleOuterHoleInnerDiameter: scheme.depletedBaffleOuterHoleInnerDiameter,
    minAxialDistance: scheme.minAxialDistance,
    depletedBaffleAxialPosition: scheme.depletedBaffleAxialPosition,
    depletedBaffleOuterHoleOuterDiameter: scheme.depletedBaffleOuterHoleOuterDiameter,
  } as any)

  // 同步到表单
  syncFormFromStore()

  message.success('已填充选中方案数据')
}

watch(() => props.selectedScheme, (newScheme) => {
  if (newScheme) {
    fillFormFromScheme(newScheme)
  }
}, { immediate: true })

onMounted(() => {
  window.electron.ipcRenderer.removeAllListeners?.('exe-closed')
  window.electron.ipcRenderer.on('exe-closed', handleExeClose)
  syncFormFromStore()
  readTakeData()
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener?.('exe-closed', handleExeClose)
  app.window.loading.close()
})
</script>

<template>
  <div
    :class="{ 'initial-design-container': props.showButton }"
    style="margin-bottom: 80px;"
  >
    <div class="form-content">
      <!-- 顶部按钮 -->
      <div v-if="props.showButton" class="top-actions">
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

      <div style="height: 5px" />

      <a-card :title="getFieldLabel('operatingParams', fieldLabelMode)">
        <a-form ref="formRef" layout="vertical" :model="formModel" :rules="rules">
          <!-- 顶层参数 -->
          <div class="section-title">
            {{ getFieldLabel('topLevelParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item
                name="angularVelocity" :label="getFieldLabel('angularVelocity', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.angularVelocity"
                  :placeholder="`请输入${getFieldLabel('angularVelocity', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Hz" :disabled="isFactorDisabledByKey('angularVelocity')"
                  @update:value="(val) => onFieldChange('angularVelocity', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="rotorRadius" :label="getFieldLabel('rotorRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.rotorRadius"
                  :placeholder="`请输入${getFieldLabel('rotorRadius', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('rotorRadius')"
                  @update:value="(val) => onFieldChange('rotorRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="rotorShoulderLength" :label="getFieldLabel('rotorShoulderLength', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.rotorShoulderLength"
                  :placeholder="`请输入${getFieldLabel('rotorShoulderLength', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('rotorShoulderLength')"
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
              <a-form-item
                name="rotorSidewallPressure" :label="getFieldLabel('rotorSidewallPressure', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.rotorSidewallPressure"
                  :placeholder="`请输入${getFieldLabel('rotorSidewallPressure', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Pa" :disabled="isFactorDisabledByKey('rotorSidewallPressure')"
                  @update:value="(val) => onFieldChange('rotorSidewallPressure', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="gasDiffusionCoefficient"
                :label="getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.gasDiffusionCoefficient"
                  :placeholder="`请输入${getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)}`" style="width: 100%"
                  :disabled="isFactorDisabledByKey('gasDiffusionCoefficient')"
                  @update:value="(val) => onFieldChange('gasDiffusionCoefficient', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="feedFlowRate" :label="getFieldLabel('feedFlowRate', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.feedFlowRate"
                  :placeholder="`请输入${getFieldLabel('feedFlowRate', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Kg/s" :disabled="isFactorDisabledByKey('feedFlowRate')"
                  @update:value="(val) => onFieldChange('feedFlowRate', val as number | null)"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedingMethod', fieldLabelMode)" class="form-col">
                <a-select
                  :value="formData.feedingMethod"
                  :placeholder="`请选择${getFieldLabel('feedingMethod', fieldLabelMode)}`" style="width: 100%"
                  :disabled="isFactorDisabledByKey('feedingMethod')"
                  @update:value="(val) => designStore.updateFormData({ feedingMethod: val as FeedingMethod })"
                >
                  <a-select-option v-for="option in FEEDING_METHOD_MAP" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item name="splitRatio" :label="getFieldLabel('splitRatio', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.splitRatio"
                  :placeholder="`请输入${getFieldLabel('splitRatio', fieldLabelMode)}`" style="width: 100%"
                  :disabled="isFactorDisabledByKey('splitRatio')"
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
              <a-form-item
                name="depletedEndCapTemperature"
                :label="getFieldLabel('depletedEndCapTemperature', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedEndCapTemperature"
                  :placeholder="`请输入${getFieldLabel('depletedEndCapTemperature', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K" :disabled="isFactorDisabledByKey('depletedEndCapTemperature')"
                  @update:value="(val) => onFieldChange('depletedEndCapTemperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="enrichedEndCapTemperature"
                :label="getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.enrichedEndCapTemperature"
                  :placeholder="`请输入${getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K" :disabled="isFactorDisabledByKey('enrichedEndCapTemperature')"
                  @update:value="(val) => onFieldChange('enrichedEndCapTemperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="feedAxialDisturbance" :label="getFieldLabel('feedAxialDisturbance', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.feedAxialDisturbance"
                  :placeholder="`请输入${getFieldLabel('feedAxialDisturbance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('feedAxialDisturbance')"
                  @update:value="(val) => onFieldChange('feedAxialDisturbance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="feedAngularDisturbance"
                :label="getFieldLabel('feedAngularDisturbance', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.feedAngularDisturbance"
                  :placeholder="`请输入${getFieldLabel('feedAngularDisturbance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('feedAngularDisturbance')"
                  @update:value="(val) => onFieldChange('feedAngularDisturbance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedMechanicalDriveAmount"
                :label="getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedMechanicalDriveAmount"
                  :placeholder="`请输入${getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('depletedMechanicalDriveAmount')"
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
              <a-form-item
                name="extractionChamberHeight"
                :label="getFieldLabel('extractionChamberHeight', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.extractionChamberHeight"
                  :placeholder="`请输入${getFieldLabel('extractionChamberHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('extractionChamberHeight')"
                  @update:value="(val) => onFieldChange('extractionChamberHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="enrichedBaffleHoleDiameter"
                :label="getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.enrichedBaffleHoleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('enrichedBaffleHoleDiameter')"
                  @update:value="(val) => onFieldChange('enrichedBaffleHoleDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="feedBoxShockDiskHeight"
                :label="getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.feedBoxShockDiskHeight"
                  :placeholder="`请输入${getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('feedBoxShockDiskHeight')"
                  @update:value="(val) => onFieldChange('feedBoxShockDiskHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionArmRadius"
                :label="getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedExtractionArmRadius"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm" :disabled="isFactorDisabledByKey('depletedExtractionArmRadius')"
                  @update:value="(val) => onFieldChange('depletedExtractionArmRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionPortInnerDiameter"
                :label="getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedExtractionPortInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('depletedExtractionPortInnerDiameter')"
                  @update:value="(val) => onFieldChange('depletedExtractionPortInnerDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleInnerHoleOuterDiameter"
                :label="getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedBaffleInnerHoleOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('depletedBaffleInnerHoleOuterDiameter')"
                  @update:value="(val) => onFieldChange('depletedBaffleInnerHoleOuterDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="enrichedBaffleHoleDistributionCircleDiameter"
                :label="getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.enrichedBaffleHoleDistributionCircleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('enrichedBaffleHoleDistributionCircleDiameter')"
                  @update:value="(val) => onFieldChange('enrichedBaffleHoleDistributionCircleDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedExtractionPortOuterDiameter"
                :label="getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedExtractionPortOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('depletedExtractionPortOuterDiameter')"
                  @update:value="(val) => onFieldChange('depletedExtractionPortOuterDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleOuterHoleInnerDiameter"
                :label="getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedBaffleOuterHoleInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('depletedBaffleOuterHoleInnerDiameter')"
                  @update:value="(val) => onFieldChange('depletedBaffleOuterHoleInnerDiameter', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="minAxialDistance" :label="getFieldLabel('minAxialDistance', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.minAxialDistance"
                  :placeholder="`请输入${getFieldLabel('minAxialDistance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('minAxialDistance')"
                  @update:value="(val) => onFieldChange('minAxialDistance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleAxialPosition"
                :label="getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedBaffleAxialPosition"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm" :disabled="isFactorDisabledByKey('depletedBaffleAxialPosition')"
                  @update:value="(val) => onFieldChange('depletedBaffleAxialPosition', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="depletedBaffleOuterHoleOuterDiameter"
                :label="getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.depletedBaffleOuterHoleOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('depletedBaffleOuterHoleOuterDiameter')"
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
            {{
              outputResults.separationPower !== null && outputResults.separationPower !== undefined
                ? outputResults.separationPower.toFixed(2) : '-'
            }}
            W
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">{{ getFieldLabel('separationFactor', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{
              outputResults.separationFactor !== null && outputResults.separationFactor !== undefined
                ? outputResults.separationFactor.toFixed(4)
                : '-'
            }}
          </span>
        </div>
      </a-space>
    </div>

    <!-- 操作按钮 -->
    <div class="action-row">
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
  padding: 5px;
}

.top-actions {
  margin-bottom: 5px;
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

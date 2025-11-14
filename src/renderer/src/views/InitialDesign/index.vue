<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'

import type { FeedingMethod } from '../../store/designStore'
import { FileTextOutlined } from '@ant-design/icons-vue'

import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useSchemeOptimizationStore } from '../../store'
import { useLogStore } from '../../store/logStore'
import { FEEDING_METHOD_MAP, useMPhysSimDesignStore } from '../../store/mPhysSimDesignStore'
import { useSettingsStore } from '../../store/settingsStore'
import { FIELD_LABELS, getFieldLabel } from '../../utils/field-labels'
import { createPairConstraintRules, createPositiveFieldRules, handleFieldChange } from '../../utils/form-validation'
import { findValue, parseSepPowerFile } from '../../utils/parseSepPower'

const props = defineProps({
  showButton: {
    type: Boolean,
    default: true,
  },
  /** 当前选择的方案 */
  selectedScheme: {
    type: Object as () => any,
    default: null,
  },
} as const)

const emit = defineEmits<{
  (e: 'submitted', payload: { formData: any, outputResults: any }): void
}>()

const designStore = useMPhysSimDesignStore()
const logStore = useLogStore()
const settingsStore = useSettingsStore()
const schemeOptStore = useSchemeOptimizationStore()
const { isMultiScheme, formData, outputResults } = storeToRefs(designStore)

// 从方案优化仓库读取已添加的设计因子，用于禁用设计表单对应字段
const { designFactors: optDesignFactors } = storeToRefs(schemeOptStore)

function getFieldKeyByLabel(label: string): string | null {
  // 首先尝试通过中文标签查找文件字段名
  for (const [key, map] of Object.entries(FIELD_LABELS)) {
    if (map['zh-CN'] === label)
      return key
  }
  return null
}

// 移除旧的字段名映射函数，现在统一使用文件字段名

// 需要禁用的字段集合：由“方案优化”里已添加的设计因子名称反查得到
const disabledKeys = computed(() => {
  const set = new Set<string>()
  optDesignFactors.value.forEach((f) => {
    const key = getFieldKeyByLabel(f.name)
    if (key) {
      set.add(key)
    }
  })
  return set
})

function isFactorDisabledByKey(key: string): boolean {
  // 在方案修正页面（showButton=false）不禁用任何字段
  if (!props.showButton)
    return false

  // 现在统一使用文件字段名，直接检查
  return disabledKeys.value.has(key)
}

const { fieldLabelMode } = storeToRefs(settingsStore)

const isLoading = ref(false)

/**  读取任务文件内容（优先 input.txt，其次 input.dat），自动填充表单 */
async function readTakeData() {
  try {
    const source = app.productConfig.file?.inputFileName

    if (!source) {
      message.error('未找到任务文件')
      return
    }

    let content = await app.file.readDatFile(source)

    if (!content) {
      message.error(`未找到任务文件 (${source})`)
      // 如果没找到就手动选择文件
      const files = await app.file.selectFile()
      if (files) {
        content = await app.file.readDatFile(files[0])
      }
      else {
        message.error('未选择文件')
        return
      }
    }

    if (content.includes('=')) {
      parseTxtContent(content)
    }
    else {
      await parseDatContent(content)
    }
    message.success(`已从 ${source} 填充到表单`)
  }
  catch (error) {
    message.error(`解析任务文件失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const formRef = ref<FormInstance>()
const formModel = reactive({
  ...formData.value,
})
const prevModel = reactive({ ...formModel })

/**
 * 同步 store 数据到表单模型
 */
function syncFormFromStore(): void {
  Object.assign(formModel, {
    ...formData.value,
  })
  Object.assign(prevModel, formModel)
}

// 需要进行「> 0 的实数」校验的字段列表（使用文件字段名）
const positiveFields = [
  'DegSpeed',
  'RotorRadius',
  'RotorLength',
  'RotorPressure',
  'GasParam',
  'FeedFlow',
  'SplitRatio',
  'PoorCoverTemp',
  'RichCoverTemp',
  'FeedAxialDist',
  'FeedDegDist',
  'PoorDrive',
  'TackHeight',
  'RichBaffleHoleDiam',
  'FeedBoxHeight',
  'PoorArmRadius',
  'PoorTackInnerRadius',
  'PoorBaffleInnerHoleOuterRadius',
  'RichBaffleArrayHoleDiam',
  'PoorTackOuterRadius',
  'PoorBaffleOuterHoleInnerRadius',
  'FeedBoxAndPoorInterval',
  'PoorBaffleAxialSpace',
  'PoorBaffleOuterHoleOuterRadius',
]

// 创建校验规则
const rules: Record<string, any[]> = createPositiveFieldRules(positiveFields, fieldLabelMode.value)

// 添加成对约束规则（合并到已有的正数校验规则）
const pairRules1 = createPairConstraintRules(
  'PoorTackInnerRadius',
  'PoorTackOuterRadius',
  '贫料取料口内径',
  '贫料取料口外径',
  formModel,
)

const pairRules2 = createPairConstraintRules(
  'PoorBaffleOuterHoleInnerRadius',
  'PoorBaffleOuterHoleOuterRadius',
  '贫料挡板外孔内径',
  '贫料挡板外孔外径',
  formModel,
)

// 合并规则，确保正数校验规则不被覆盖
Object.keys(pairRules1).forEach((key) => {
  if (rules[key]) {
    rules[key] = [...rules[key], ...pairRules1[key]]
  }
  else {
    rules[key] = pairRules1[key]
  }
})

Object.keys(pairRules2).forEach((key) => {
  if (rules[key]) {
    rules[key] = [...rules[key], ...pairRules2[key]]
  }
  else {
    rules[key] = pairRules2[key]
  }
})

function updateStoreByField(name: string, val: number | null) {
  if (val == null)
    return
  designStore.updateFormData({ [name]: val } as any)
}

// 成对约束字段映射
const PAIR_PARTNERS: Record<string, string> = {
  PoorTackInnerRadius: 'PoorTackOuterRadius',
  PoorTackOuterRadius: 'PoorTackInnerRadius',
  PoorBaffleOuterHoleInnerRadius: 'PoorBaffleOuterHoleOuterRadius',
  PoorBaffleOuterHoleOuterRadius: 'PoorBaffleOuterHoleInnerRadius',
}

async function onFieldChange(name: string, val: number | null): Promise<void> {
  await handleFieldChange(
    name,
    val,
    formModel,
    prevModel,
    formRef.value,
    updateStoreByField,
    PAIR_PARTNERS,
  )
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

  if (!outputResults.value.sepPower || !outputResults.value.sepFactor) {
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
  // 现在直接使用文件字段名，不需要映射
  const ORDERED_KEYS: Array<string> = [
    'DegSpeed',
    'RotorRadius',
    'RotorLength',
    'FeedMethod',
    'RotorPressure',
    'GasParam',
    'FeedFlow',
    'SplitRatio',
    'PoorCoverTemp',
    'RichCoverTemp',
    'FeedAxialDist',
    'FeedDegDist',
    'PoorDrive',
    'TackHeight',
    'RichBaffleHoleDiam',
    'FeedBoxHeight',
    'PoorArmRadius',
    'PoorTackInnerRadius',
    'PoorTackOuterRadius',
    'PoorBaffleInnerHoleOuterRadius',
    'PoorBaffleOuterHoleInnerRadius',
    'PoorBaffleOuterHoleOuterRadius',
    'RichBaffleArrayHoleDiam',
    'FeedBoxAndPoorInterval',
    'PoorBaffleAxialSpace',
  ]

  const lines: string[] = ORDERED_KEYS.map((key) => {
    const v: any = (formData.value as any)[key]
    // FeedMethod：保证输出为数字 0/1
    if (key === 'FeedMethod') {
      const n = Number(v)
      return `${key}=${Number.isFinite(n) ? n : 0}`
    }
    return `${key}=${v ?? ''}`
  })

  // 输出结果
  lines.push(`SplitPower=${outputResults.value.sepPower ?? ''}`)
  lines.push(`SplitParam=${outputResults.value.sepFactor ?? ''}`)

  // 写入到 testFile/output.txt
  const baseDir = await app.file.getWorkDir()
  const outPath = baseDir.includes('\\') ? `${baseDir}\\output.txt` : `${baseDir}/output.txt`
  await app.file.writeFile(outPath, lines.join('\n'))

  message.success(`方案提交成功，已生成 ${outPath}`)

  // 通知父组件（如多方案修正页）以便更新表格数据
//   emit('submitted', {
//     formData: { ...formData.value },
//     outputResults: { ...outputResults.value },
//   })
}

/**
 * 读取Sep_power.dat替换结果中的分离功率 和 分离系数
 */
function replaceSepPowerParams(content: string): void {
  logStore.info('读取仿真结果文件')

  const result = parseSepPowerFile(content)

  // 记录解析到的所有字段，用于调试
  logStore.info(`解析到的字段: ${Object.keys(result).join(', ')}`)

  const sepPower = findValue(result, ['ACTURAL SEPERATIVE POWER', 'ACTUAL SEPERATIVE POWER'])
  const sepFactor = findValue(result, ['ACTURAL SEPERATIVE FACTOR', 'ACTUAL SEPERATIVE FACTOR'])

  if (sepPower !== undefined || sepFactor !== undefined) {
    designStore.updateOutputResults({
      sepPower,
      sepFactor,
    })
    syncFormFromStore()
    logStore.info(`成功读取结果值: 分离功率=${sepPower ?? '未找到'}, 分离系数=${sepFactor ?? '未找到'}`)
  }
  else {
    logStore.warning(`未找到结果字段，解析到的字段名: ${Object.keys(result).join(', ')}`)
  }

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

  // 检查文件格式是否有效
  if (lines.length < 2) {
    throw new Error('文件格式错误：文件行数不足')
  }

  // 解析第2行（索引1）：角速度、半径、两肩长、侧壁压力、扩散系数
  const line2 = lines[1]?.replace(/!.*/, '').trim()
  if (!line2) {
    throw new Error('文件格式错误：第2行数据为空')
  }

  const [angularVelocity, rotorRadius, rotorShoulderLength, rotorSidewallPressure, gasDiffusionCoefficient] = line2
    .split(',')
    .map(Number)

  designStore.updateFormData({ DegSpeed: angularVelocity, RotorRadius: rotorRadius, RotorLength: rotorShoulderLength, RotorPressure: rotorSidewallPressure, GasParam: gasDiffusionCoefficient } as any)

  const paramKeys = [
    'PoorCoverTemp',
    'RichCoverTemp',
    'PoorDrive',
    'PoorArmRadius',
    'innerBoundaryMirrorPosition',
    'gridGenerationMethod',
    'RichBaffleArrayHoleDiam',
    'RichBaffleHoleDiam',
    'PoorTackInnerRadius',
    'PoorTackOuterRadius',
    'FeedBoxAndPoorInterval',
    'FeedBoxHeight',
    'FeedFlow',
    'SplitRatio',
    'FeedDegDist',
    'FeedAxialDist',
    'PoorBaffleInnerHoleOuterRadius',
    'PoorBaffleOuterHoleInnerRadius',
    'PoorBaffleOuterHoleOuterRadius',
    'PoorBaffleAxialSpace',
    'bwgRadialProtrusionHeight',
    'bwgAxialHeight',
    'bwgAxialPosition',
    'radialGridRatio',
    'FeedMethod',
    'compensationCoefficient',
    'streamlineData',
  ]

  for (let i = 0; i < paramKeys.length; i++) {
    const lineIndex = i + 2
    if (lineIndex >= lines.length) {
      // 如果行数不足，跳过剩余字段
      break
    }
    const raw = lines[lineIndex]?.replace(/!.*/, '').trim() || ''
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
  // 现在直接使用文件字段名，不需要映射

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
      const valStr = removeInvisible((rawVal ?? '').trim())
      const num = Number(valStr)
      let val: any = Number.isFinite(num) ? num : valStr
      if (key === 'FeedMethod') {
        // 供料方式：支持数值(0/1)或中文枚举
        if (typeof val === 'number') {
          val = val === 1 ? 1 : 0
        }
        else if (typeof val === 'string') {
          val = val.includes('均') ? 1 : 0
        }
      }
      updates[key] = val
    })

  if (Object.keys(updates).length > 0) {
    designStore.updateFormData(updates)
    syncFormFromStore()

    message.success('读取文件内容成功')
    logStore.info('读取文件内容成功')
  }
  else {
    message.warning('读取文件内容失败')
    logStore.error('读取文件内容失败')
  }
}

async function handleExeClose(_: Electron.IpcRendererEvent, exeName: string, result: any) {
  const fileName = 'Sep_power.dat'

  if (result.isSuccess === false) {
    app.message.error(`${exeName} 程序异常退出，退出码: ${result.exitCode}`)
    logStore.error(`${exeName} 程序异常退出，退出码: ${result.exitCode}`)
    app.window.loading.close()
    isLoading.value = false
  }
  else {
    // 从 Sep_power.dat 读取
    const content = await app.file.readDatFile(fileName)
    if (!content) {
      logStore.warning(`未找到 ${fileName} 文件`)
      app.window.loading.close()
      isLoading.value = false
      return
    }
    replaceSepPowerParams(content)
    app.window.loading.close()
    isLoading.value = false
  }

  if (!props.showButton) {
    emit('submitted', {
      formData: { ...formData.value },
      outputResults: { ...outputResults.value },
    })
  }
}

watch(() => props.selectedScheme, (newScheme, oldScheme) => {
  if (newScheme) {
    // 🔧 修复：检查是否为真正的方案变化
    // 避免在页面切换或重新渲染时覆盖已修正的数据
    const schemeChanged = !oldScheme
      || (newScheme.index !== oldScheme.index || newScheme.fileName !== oldScheme.fileName)

    if (schemeChanged) {
      // 选中方案变化时，formData 已经在 handleRowSelectionChange 中通过 updateFormData 更新
      // 这里只需要同步到表单模型
      syncFormFromStore()
    }
  }
})

// 注释掉自动路由跳转逻辑，用户不希望自动跳转
// watch(() => isMultiScheme.value, (newValue) => {
//   if (props.showButton) {
//     // 只有在主页面（showButton=true）时才更新路由
//     const currentRoute = router.currentRoute.value
//     if (newValue && currentRoute.name !== 'MultiScheme') {
//       // 切换到多方案页面
//       router.push({ name: 'MultiScheme' })
//     } else if (!newValue && currentRoute.name === 'MultiScheme') {
//       // 切换回初始设计页面
//       router.push({ name: 'InitialDesign' })
//     }
//   }
// })

onMounted(() => {
  window.electron.ipcRenderer.removeAllListeners?.('exe-closed')
  window.electron.ipcRenderer.on('exe-closed', handleExeClose)

  // 初始化一次表单模型与前次合法值
  syncFormFromStore()

  /** 只有在多方案模式且表单完全为空时，才从文件读取数据 */
  /** 这样可以避免覆盖从多方案修正页面传来的数据 */
  if (isMultiScheme.value && !designStore.isFormValid()) {
    // 检查是否有任何字段有值，如果有值说明是从多方案修正来的，不要重新加载
    const hasAnyValue = Object.values(formData.value).some(value =>
      value !== undefined && value !== null && value !== 0,
    )

    if (!hasAnyValue) {
      readTakeData()
    }
  }
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener?.('exe-closed', handleExeClose)
  app.window.loading.close()
})

/** 导出给父组件 */
defineExpose({
  submitDesign,
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
      <a-card v-if="props.showButton" :title="getFieldLabel('designType', fieldLabelMode)">
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
                name="DegSpeed" :label="getFieldLabel('DegSpeed', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.DegSpeed"
                  :placeholder="`请输入${getFieldLabel('DegSpeed', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Hz" :disabled="isFactorDisabledByKey('DegSpeed')"
                  @update:value="(val) => onFieldChange('DegSpeed', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RotorRadius" :label="getFieldLabel('RotorRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.RotorRadius"
                  :placeholder="`请输入${getFieldLabel('RotorRadius', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('RotorRadius')"
                  @update:value="(val) => onFieldChange('RotorRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RotorLength" :label="getFieldLabel('RotorLength', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.RotorLength"
                  :placeholder="`请输入${getFieldLabel('RotorLength', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('RotorLength')"
                  @update:value="(val) => onFieldChange('RotorLength', val as number | null)"
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
                name="RotorPressure" :label="getFieldLabel('RotorPressure', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.RotorPressure"
                  :placeholder="`请输入${getFieldLabel('RotorPressure', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Pa" :disabled="isFactorDisabledByKey('RotorPressure')"
                  @update:value="(val) => onFieldChange('RotorPressure', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="GasParam"
                :label="getFieldLabel('GasParam', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.GasParam"
                  :placeholder="`请输入${getFieldLabel('GasParam', fieldLabelMode)}`" style="width: 100%"
                  :disabled="isFactorDisabledByKey('GasParam')"
                  @update:value="(val) => onFieldChange('GasParam', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="FeedFlow" :label="getFieldLabel('FeedFlow', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.FeedFlow"
                  :placeholder="`请输入${getFieldLabel('FeedFlow', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Kg/s" :disabled="isFactorDisabledByKey('FeedFlow')"
                  @update:value="(val) => onFieldChange('FeedFlow', val as number | null)"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('FeedMethod', fieldLabelMode)" class="form-col">
                <a-select
                  :value="formData.FeedMethod"
                  :placeholder="`请选择${getFieldLabel('FeedMethod', fieldLabelMode)}`" style="width: 100%"
                  :disabled="isFactorDisabledByKey('FeedMethod')"
                  @update:value="(val) => designStore.updateFormData({ FeedMethod: val as FeedingMethod })"
                >
                  <a-select-option v-for="option in FEEDING_METHOD_MAP" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item name="SplitRatio" :label="getFieldLabel('SplitRatio', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.SplitRatio"
                  :placeholder="`请输入${getFieldLabel('SplitRatio', fieldLabelMode)}`" style="width: 100%"
                  :disabled="isFactorDisabledByKey('SplitRatio')"
                  @update:value="(val) => onFieldChange('SplitRatio', val as number | null)"
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
                name="PoorCoverTemp"
                :label="getFieldLabel('PoorCoverTemp', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorCoverTemp"
                  :placeholder="`请输入${getFieldLabel('PoorCoverTemp', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K" :disabled="isFactorDisabledByKey('PoorCoverTemp')"
                  @update:value="(val) => onFieldChange('PoorCoverTemp', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RichCoverTemp"
                :label="getFieldLabel('RichCoverTemp', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.RichCoverTemp"
                  :placeholder="`请输入${getFieldLabel('RichCoverTemp', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K" :disabled="isFactorDisabledByKey('RichCoverTemp')"
                  @update:value="(val) => onFieldChange('RichCoverTemp', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="FeedAxialDist" :label="getFieldLabel('FeedAxialDist', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.FeedAxialDist"
                  :placeholder="`请输入${getFieldLabel('FeedAxialDist', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('FeedAxialDist')"
                  @update:value="(val) => onFieldChange('FeedAxialDist', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="FeedDegDist"
                :label="getFieldLabel('FeedDegDist', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.FeedDegDist"
                  :placeholder="`请输入${getFieldLabel('FeedDegDist', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('FeedDegDist')"
                  @update:value="(val) => onFieldChange('FeedDegDist', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorDrive"
                :label="getFieldLabel('PoorDrive', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorDrive"
                  :placeholder="`请输入${getFieldLabel('PoorDrive', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('PoorDrive')"
                  @update:value="(val) => onFieldChange('PoorDrive', val as number | null)"
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
                name="TackHeight" :label="getFieldLabel('TackHeight', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.TackHeight"
                  :placeholder="`请输入${getFieldLabel('TackHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('TackHeight')"
                  @update:value="(val) => onFieldChange('TackHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RichBaffleHoleDiam"
                :label="getFieldLabel('RichBaffleHoleDiam', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.RichBaffleHoleDiam"
                  :placeholder="`请输入${getFieldLabel('RichBaffleHoleDiam', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm" :disabled="isFactorDisabledByKey('RichBaffleHoleDiam')"
                  @update:value="(val) => onFieldChange('RichBaffleHoleDiam', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="FeedBoxHeight"
                :label="getFieldLabel('FeedBoxHeight', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.FeedBoxHeight"
                  :placeholder="`请输入${getFieldLabel('FeedBoxHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('FeedBoxHeight')"
                  @update:value="(val) => onFieldChange('FeedBoxHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorArmRadius"
                :label="getFieldLabel('PoorArmRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorArmRadius"
                  :placeholder="`请输入${getFieldLabel('PoorArmRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm" :disabled="isFactorDisabledByKey('PoorArmRadius')"
                  @update:value="(val) => onFieldChange('PoorArmRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorTackInnerRadius"
                :label="getFieldLabel('PoorTackInnerRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorTackInnerRadius"
                  :placeholder="`请输入${getFieldLabel('PoorTackInnerRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('PoorTackInnerRadius')"
                  @update:value="(val) => onFieldChange('PoorTackInnerRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorBaffleInnerHoleOuterRadius"
                :label="getFieldLabel('PoorBaffleInnerHoleOuterRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorBaffleInnerHoleOuterRadius"
                  :placeholder="`请输入${getFieldLabel('PoorBaffleInnerHoleOuterRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('PoorBaffleInnerHoleOuterRadius')"
                  @update:value="(val) => onFieldChange('PoorBaffleInnerHoleOuterRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RichBaffleArrayHoleDiam"
                :label="getFieldLabel('RichBaffleArrayHoleDiam', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.RichBaffleArrayHoleDiam"
                  :placeholder="`请输入${getFieldLabel('RichBaffleArrayHoleDiam', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('RichBaffleArrayHoleDiam')"
                  @update:value="(val) => onFieldChange('RichBaffleArrayHoleDiam', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorTackOuterRadius"
                :label="getFieldLabel('PoorTackOuterRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorTackOuterRadius"
                  :placeholder="`请输入${getFieldLabel('PoorTackOuterRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('PoorTackOuterRadius')"
                  @update:value="(val) => onFieldChange('PoorTackOuterRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorBaffleOuterHoleInnerRadius"
                :label="getFieldLabel('PoorBaffleOuterHoleInnerRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorBaffleOuterHoleInnerRadius"
                  :placeholder="`请输入${getFieldLabel('PoorBaffleOuterHoleInnerRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('PoorBaffleOuterHoleInnerRadius')"
                  @update:value="(val) => onFieldChange('PoorBaffleOuterHoleInnerRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="FeedBoxAndPoorInterval" :label="getFieldLabel('FeedBoxAndPoorInterval', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.FeedBoxAndPoorInterval"
                  :placeholder="`请输入${getFieldLabel('FeedBoxAndPoorInterval', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" :disabled="isFactorDisabledByKey('FeedBoxAndPoorInterval')"
                  @update:value="(val) => onFieldChange('FeedBoxAndPoorInterval', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorBaffleAxialSpace"
                :label="getFieldLabel('PoorBaffleAxialSpace', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorBaffleAxialSpace"
                  :placeholder="`请输入${getFieldLabel('PoorBaffleAxialSpace', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm" :disabled="isFactorDisabledByKey('PoorBaffleAxialSpace')"
                  @update:value="(val) => onFieldChange('PoorBaffleAxialSpace', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorBaffleOuterHoleOuterRadius"
                :label="getFieldLabel('PoorBaffleOuterHoleOuterRadius', fieldLabelMode)" class="form-col"
              >
                <a-input-number
                  :value="formData.PoorBaffleOuterHoleOuterRadius"
                  :placeholder="`请输入${getFieldLabel('PoorBaffleOuterHoleOuterRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  :disabled="isFactorDisabledByKey('PoorBaffleOuterHoleOuterRadius')"
                  @update:value="(val) => onFieldChange('PoorBaffleOuterHoleOuterRadius', val as number | null)"
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
          <span class="result-label">{{ getFieldLabel('sepPower', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{
              outputResults.sepPower !== undefined
                ? outputResults.sepPower.toFixed(2) : '-'
            }}
            W
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">{{ getFieldLabel('sepFactor', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{
              outputResults.sepFactor !== undefined
                ? outputResults.sepFactor.toFixed(2)
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
        <a-button v-if="props.showButton" type="primary" @click="submitDesign">
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

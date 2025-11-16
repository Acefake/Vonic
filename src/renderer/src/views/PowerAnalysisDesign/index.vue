<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'

import { FileTextOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useTake } from '../../hooks/useTake'
import { useLogStore } from '../../store/logStore'
import { usePowerAnalysisDesignStore } from '../../store/powerAnalysisDesignStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getFieldLabel } from '../../utils/field-labels'

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

const { fillFormFromScheme } = useTake()

const designStore = usePowerAnalysisDesignStore()
const logStore = useLogStore()
const settingsStore = useSettingsStore()
const themeColor = ref(app.productConfig.themeColor)

const { isMultiScheme, formData, outputResults } = storeToRefs(designStore)

const { fieldLabelMode } = storeToRefs(settingsStore)

const isLoading = ref(false)

/**  读取任务文件内容（优先 input.txt，其次 input.dat），自动填充表单 */
async function readTakeData() {
  try {
    const source = app.productConfig.file?.inputFileName
    if (!source) {
      message.error('读取任务文件名称未配置')
      return
    }

    const content = await app.file.readDatFile(source)

    if (content.includes('=')) {
      parseTxtContent(content)
    }
    else {
      await parseDatContent(content)
    }
    message.success(`已从 ${source} 填充到表单`)
    console.log('readTakeData - 更新后的 store 数据:', designStore.formData)
  }
  catch (error) {
    message.error(`解析任务文件失败: ${error instanceof Error ? error.message : String(error)}`)
    const files = await app.file.selectFile()
    if (files) {
      const content = await app.file.readDatFile(files[0])
      if (content.includes('=')) {
        parseTxtContent(content)
      }
      else {
        await parseDatContent(content)
      }
      message.success(`已从 ${files[0]} 填充到表单`)
    }
    else {
      message.error('未选择文件')
    }
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

// 需要进行「>0 实数」校验的字段列表 - 使用文件字段名
const positiveFields = [
  'DegSpeed',
  'RotorRadius',
  'Temperature',
  'RichBaffleTemp',
  'PowerFlow',
  'RotorPressure',
  'PoorTackInnerRadius',
  'PoorTackOuterRadius',
  'PoorTackRootOuterRadius',
  'TackAttkAngle',
  'TackHeight',
  'PoorTackDistance',
  'RichTackDistance',
  'EvenSectionPipeLength',
  'TackChamferAngle',
  'RichBaffleHoleDiam',
  'ChangeSectionPipeLength',
  'PipeRadius',
  'TackSurfaceRoughness',
  'TackTaperAngle',
  'RichBaffleArrayHoleDiam',
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

// 成对约束：贫取料口部「内径 < 外径」- 使用文件字段名
rules.PoorTackInnerRadius = [
  ...(rules.PoorTackInnerRadius || []),
  {
    validator: (_: any, v: any) => {
      const outer = formModel.PoorTackOuterRadius
      if (!isPositiveReal(v) || !isPositiveReal(outer))
        return Promise.resolve()
      return v < outer ? Promise.resolve() : Promise.reject(new Error('贫取料口部内径应小于贫取料口部外径，请重新输入！'))
    },
    trigger: 'change',
  },
]

rules.PoorTackOuterRadius = [
  ...(rules.PoorTackOuterRadius || []),
  {
    validator: (_: any, v: any) => {
      const inner = formModel.PoorTackInnerRadius
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
  designStore.updateFormData({ [name]: val } as any)
}

async function onFieldChange(name: string, val: number | null) {
  const prev = (prevModel as any)[name]
  ;(formModel as any)[name] = val
  try {
    await formRef.value?.validateFields([name])
    ;(prevModel as any)[name] = val
    updateStoreByField(name, val)
    // 变更一方后，联动校验另一方，清除或更新其错误提示 - 使用文件字段名
    const PAIR_PARTNER: Record<string, string> = {
      PoorTackInnerRadius: 'PoorTackOuterRadius',
      PoorTackOuterRadius: 'PoorTackInnerRadius',
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
    ...formData.value,
  })
  Object.assign(prevModel, formModel)
}

/**
 * 生成 input.txt 文件（数字+注释格式）
 */
function buildInputTxtContent(data: typeof formData.value): string {
  const getVal = (field: keyof typeof data, defaultValue = 0) => {
    const val = data[field]
    return val !== null && val !== undefined ? val : defaultValue
  }

  // 根据用户提供的格式生成 1-26 行
  const lines: string[] = []

  // 1. 半径
  lines.push(`${getVal('RotorRadius')}    !半径`)
  // 2. 转速
  lines.push(`${getVal('DegSpeed')}    !转速`)
  // 3. T0
  lines.push(`${getVal('Temperature')}    !T0`)
  // 4. 精料挡板温度
  lines.push(`${getVal('RichBaffleTemp')}    !精料挡板温度`)
  // 5. Pw_w
  lines.push(`${getVal('RotorPressure')}    !Pw_w`)
  // 6. 供料流量
  lines.push(`${getVal('PowerFlow')}    !供料流量`)
  // 7. 贫料流量（表单中没有，设为0）
  lines.push(`0    !贫料流量`)
  // 8. ds
  lines.push(`${getVal('PoorTackInnerRadius')}    !ds`)
  // 9. ds1
  lines.push(`${getVal('PoorTackOuterRadius')}    !ds1`)
  // 10. ds0
  lines.push(`${getVal('PoorTackRootOuterRadius')}    !ds0`)
  // 11. rw
  lines.push(`${getVal('PoorTackDistance')}    !rw`)
  // 12. rp
  lines.push(`${getVal('RichTackDistance')}    !rp`)
  // 13. Ls
  lines.push(`${getVal('EvenSectionPipeLength')}    !Ls`)
  // 14. Lss
  lines.push(`${getVal('ChangeSectionPipeLength')}    !Lss`)
  // 15. rss
  lines.push(`${getVal('PipeRadius')}    !rss`)
  // 16. Hr_Scoop=roughness 取料器镀镍后的表面粗糙度
  lines.push(`${getVal('TackSurfaceRoughness')}    !Hr_Scoop=roughness 取料器镀镍后的表面粗糙度`)
  // 17,18,19. angle_angle(1:3) - 三个角度
  lines.push(`${getVal('TackAttkAngle')}    !angle_angle(1)`)
  lines.push(`${getVal('TackChamferAngle')}    !angle_angle(2)`)
  lines.push(`${getVal('TackTaperAngle')}    !angle_angle(3)`)
  // 20. hs取料腔高度的一半
  const extractionChamberHeight = getVal('TackHeight')
  lines.push(`${extractionChamberHeight / 2}    !hs取料腔高度的一半`)
  // 21. holedia_p
  lines.push(`${getVal('RichBaffleHoleDiam')}    !holedia_p`)
  // 22. sigma_p精料挡板孔的面积(单个) - 计算或设为0
  const holeDiameter = getVal('RichBaffleHoleDiam')
  const sigmaP = holeDiameter > 0 ? Math.PI * (holeDiameter / 2) ** 2 : 0
  lines.push(`${sigmaP}    !sigma_p精料挡板孔的面积(单个)`)
  // 23. ka最大流量公式对应的值域与气体料类有关的参数k
  lines.push(`0    !ka最大流量公式对应的值域与气体料类有关的参数k`)
  // 24. rk_p精料挡板空的中心距
  lines.push(`${getVal('RichBaffleArrayHoleDiam')}    !rk_p精料挡板空的中心距`)
  // 25. Ma_x孔板气体马赫数
  lines.push(`0    !Ma_x孔板气体马赫数`)
  // 26. w_prot
  lines.push(`0    !w_prot`)
  // 27. cpipe1
  lines.push(`0    !cpipe1`)
  // 28. pws
  lines.push(`0    !pws`)

  return lines.join('\n')
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

  const exeName = app.productConfig.file?.exeName

  if (!exeName) {
    message.error('可执行文件名称未配置')
    return
  }

  // 生成 input.txt 文件内容
  const inputTxtContent = buildInputTxtContent(formData.value)

  // 写入 input.txt 文件
  const baseDir = await app.file.getWorkDir()
  const inputPath = baseDir.includes('\\') ? `${baseDir}\\${app.productConfig.file?.inputFileName_fortran}` : `${baseDir}/${app.productConfig.file?.inputFileName_fortran}`
  await app.file.writeFile(inputPath, inputTxtContent)

  logStore.success(`已生成输入文件: ${inputPath}`)

  const result = await app.callExe(exeName)

  console.log(result)

  if (result.status === 'started') {
    logStore.info('调用PowerLoss.exe开始仿真计算')
    logStore.info('生成输入文件')
    app.window.loading.open({
      data: {
        title: '正在进行仿真计算...',
      },
    })
  }
  else {
    logStore.error('PowerLoss.exe调用失败')
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
  try {
    await formRef.value?.validate()
  }
  catch (e: any) {
    const msg = e?.errorFields?.[0]?.errors?.[0] || '参数校验未通过，请检查输入！'
    message.error(msg)
    return
  }

  // 生成 output.txt（key=value）内容（字段名与需求图片一致）
  const ORDERED_KEYS: Array<{ key: string, field: string }> = [
    // 顶层参数
    { key: 'DegSpeed', field: 'DegSpeed' },
    { key: 'RotorRadius', field: 'RotorRadius' },
    // 流体参数
    { key: 'Temperature', field: 'Temperature' },
    { key: 'RichBaffleTemp', field: 'RichBaffleTemp' },
    { key: 'RotorPressure', field: 'RotorPressure' },
    { key: 'PowerFlow', field: 'PowerFlow' },
    // 分离部件
    { key: 'PoorTackInnerRadius', field: 'PoorTackInnerRadius' },
    { key: 'PoorTackOuterRadius', field: 'PoorTackOuterRadius' },
    { key: 'PoorTackRootOuterRadius', field: 'PoorTackRootOuterRadius' },
    { key: 'PoorTackDistance', field: 'PoorTackDistance' },
    { key: 'RichTackDistance', field: 'RichTackDistance' },
    { key: 'EvenSectionPipeLength', field: 'EvenSectionPipeLength' },
    { key: 'ChangeSectionPipeLength', field: 'ChangeSectionPipeLength' },
    { key: 'PipeRadius', field: 'PipeRadius' },
    { key: 'TackSurfaceRoughness', field: 'TackSurfaceRoughness' },
    { key: 'TackAttkAngle', field: 'TackAttkAngle' },
    { key: 'TackChamferAngle', field: 'TackChamferAngle' },
    { key: 'TackTaperAngle', field: 'TackTaperAngle' },
    { key: 'TackHeight', field: 'TackHeight' },
    { key: 'RichBaffleHoleDiam', field: 'RichBaffleHoleDiam' },
    { key: 'RichBaffleArrayHoleDiam', field: 'RichBaffleArrayHoleDiam' },
  ]

  const lines: string[] = ORDERED_KEYS.map(({ key, field }) => {
    const v: any = (formData.value as any)[field]
    return `${key}=${v ?? ''}`
  })

  // 输出结果
  lines.push(`PoorTackPower=${outputResults.value.poorTackPower ?? ''}`)
  lines.push(`TackPower=${outputResults.value.tackPower ?? ''}`)

  const baseDir = await app.file.getWorkDir()
  const outPath = baseDir.includes('\\') ? `${baseDir}\\output.txt` : `${baseDir}/output.txt`
  await app.file.writeFile(outPath, lines.join('\n'))

  message.success(`提交参数校验通过，已生成 ${outPath}`)

  // 通知父组件（如多方案修正页）以便更新表格数据
  emit('submitted', {
    formData: { ...formData.value },
    outputResults: { ...outputResults.value },
  })
}

/**
 * 读取output.dat替换结果中的功耗
 */
function replacePowerParams(content: string): void {
  logStore.info('读取仿真结果文件')

  const lineArr = content
    .replace(/\r\n/g, '\n') // 统一换行符为 \n（兼容 Windows 环境）
    .split('\n') // 按换行符拆分
    .map(line => line.trim()) // 去除前后空格
    .filter(line => line !== '') // 过滤空行

  const result: Record<string, number> = {}
  lineArr.forEach((line) => {
    // 解析 output.dat 格式：key = value 或 key=value（等号前后可能有空格）
    // 支持格式：beta  =0.22 或 total_scoop=   23.33      total_accele =   22
    // 一行可能包含多个键值对，使用正则表达式匹配所有键值对
    // 匹配模式：key（可能包含空格）=（可能包含空格）value（数字，可能包含前后空格）
    const keyValuePattern = /(\w+)\s*=\s*([+-]?\d*\.?\d+)/g
    const matches = Array.from(line.matchAll(keyValuePattern))
    matches.forEach((match) => {
      const key = match[1].trim()
      const valueStr = match[2].trim()
      const value = Number(valueStr)
      if (!Number.isNaN(value) && Number.isFinite(value)) {
        result[key] = value
      }
    })
  })

  // 记录解析到的所有字段，用于调试
  logStore.info(`解析到的字段: ${Object.keys(result).join(', ')}`)

  // 从 output.dat 读取：W_waccele（贫取料器功耗）和 total_accele（取料器总功耗）
  // eslint-disable-next-line dot-notation
  const poorTackPower = result['W_waccele']
  // eslint-disable-next-line dot-notation
  const tackPower = result['total_accele']

  if (poorTackPower !== undefined || tackPower !== undefined) {
    designStore.updateOutputResults({
      poorTackPower,
      tackPower,
    })
    logStore.info(`成功读取功耗值: 贫取料器功耗=${poorTackPower ?? '未找到'}, 取料器总功耗=${tackPower ?? '未找到'}`)

    // 🔧 修复：如果在多方案修正页面（有 selectedScheme prop），仿真计算完成后自动触发 submitted 事件更新表格
    if (props.selectedScheme) {
      emit('submitted', {
        formData: { ...formData.value },
        outputResults: { ...outputResults.value },
      })
    }
  }
  else {
    logStore.warning(`未找到功耗字段，解析到的字段名: ${Object.keys(result).join(', ')}`)
  }

  logStore.info('仿真计算完成')

  message.success('仿真计算完成')
}

/**
 * 处理读取的文本内容填充到设计方案中
 */
async function parseDatContent(content: string): Promise<void> {
  const lines = content
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  // 行2：角速度、半径、两肩长、取料腔高度、侧壁压力、扩散系数
  const [angularVelocity, rotorRadius, _rotorShoulderLength, extractionChamberHeight, rotorSidewallPressure] = lines[1]
    .replace(/!.*/, '')
    .split(',')
    .map(Number)

  designStore.updateFormData({ DegSpeed: angularVelocity, RotorRadius: rotorRadius, TackHeight: extractionChamberHeight, RotorPressure: rotorSidewallPressure } as any)

  // 后续字段（从第3行开始），只解析功率分析需要的部分 - 使用文件字段名
  const paramKeys = [
    'RichBaffleArrayHoleDiam', // 第9行
    'RichBaffleHoleDiam', // 第10行
    'PoorTackInnerRadius', // 第11行
    'PoorTackOuterRadius', // 第12行
    'minAxialDistance', // 第13行（可选，仅同步，不用于校验）
    'feedBoxShockDiskHeight', // 第14行（可选，仅同步，不用于校验）
    'PowerFlow', // 第15行
  ]

  for (let i = 0; i < paramKeys.length; i++) {
    const rawLine = lines[i + 2]
    if (!rawLine)
      continue
    const raw = rawLine.replace(/!.*/, '').trim()
    const num = Number(raw)
    const val = Number.isNaN(num) ? raw : num
    designStore.updateFormData({ [paramKeys[i]]: val } as any)
  }

  syncFormFromStore()
}

/**
 * 解析 input.txt (key=value) 内容并填充到 formData / outputResults
 */
function parseTxtContent(content: string): void {
  const KEY_MAP: Record<string, string> = {
    // 直接映射到文件字段名（不再需要转换）
    DegSpeed: 'DegSpeed',
    RotorRadius: 'RotorRadius',
    Temperature: 'Temperature',
    RichBaffleTemp: 'RichBaffleTemp',
    RotorPressure: 'RotorPressure',
    PowerFlow: 'PowerFlow',
    PoorTackInnerRadius: 'PoorTackInnerRadius',
    PoorTackOuterRadius: 'PoorTackOuterRadius',
    PoorTackRootOuterRadius: 'PoorTackRootOuterRadius',
    PoorTackDistance: 'PoorTackDistance',
    RichTackDistance: 'RichTackDistance',
    EvenSectionPipeLength: 'EvenSectionPipeLength',
    ChangeSectionPipeLength: 'ChangeSectionPipeLength',
    PipeRadius: 'PipeRadius',
    TackSurfaceRoughness: 'TackSurfaceRoughness',
    TackAttkAngle: 'TackAttkAngle',
    TackChamferAngle: 'TackChamferAngle',
    TackTaperAngle: 'TackTaperAngle',
    TackHeight: 'TackHeight',
    RichBaffleHoleDiam: 'RichBaffleHoleDiam',
    RichBaffleArrayHoleDiam: 'RichBaffleArrayHoleDiam',
  }

  const RESULT_KEY_MAP: Record<string, string> = {
    PoorTackPower: 'poorTackPower',
    TackPower: 'tackPower',
  }

  const removeInvisible = (s: string) => s.replace(/[\u200B-\u200D\uFEFF]/g, '')

  const updates: Record<string, any> = {}
  const resultUpdates: Record<string, any> = {}

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
      const val = Number.isFinite(num) ? num : valStr

      if (KEY_MAP[key]) {
        updates[KEY_MAP[key]] = val
      }
      else if (RESULT_KEY_MAP[key]) {
        resultUpdates[RESULT_KEY_MAP[key]] = val
      }
    })

  if (Object.keys(updates).length > 0)
    designStore.updateFormData(updates)
  if (Object.keys(resultUpdates).length > 0)
    designStore.updateOutputResults(resultUpdates)

  syncFormFromStore()
}

// exe关闭事件监听器
async function handleExeClose(_: Electron.IpcRendererEvent, exeName: string, result: any) {
  const fileName = 'output.dat'

  if (result.isSuccess === false) {
    app.message.error(`${exeName} 程序异常退出，退出码: ${result.exitCode}`)
    app.window.loading.close()
    isLoading.value = false
  }
  else {
    // 从 output.dat 读取
    const content = await app.file.readDatFile(fileName)
    if (!content) {
      logStore.warning(`未找到 ${fileName} 文件`)
      app.window.loading.close()
      isLoading.value = false
      return
    }
    replacePowerParams(content)

    app.window.loading.close()
    isLoading.value = false
  }
}

watch(() => props.selectedScheme, (newScheme) => {
  if (newScheme) {
    fillFormFromScheme(newScheme)
  }
}, { immediate: true })

onMounted(() => {
  window.electron.ipcRenderer.removeAllListeners?.('exe-closed')
  window.electron.ipcRenderer.on('exe-closed', handleExeClose)
  // 初始化一次表单模型与前次合法值
  syncFormFromStore()
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener?.('exe-closed', handleExeClose)
  app.window.loading.close()
})

defineExpose({
  submitDesign,
})
</script>

<template>
  <div class="power-analysis-design-container">
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

      <a-card :title="getFieldLabel('designType', fieldLabelMode)">
        <a-form ref="formRef" layout="vertical" :model="formModel" :rules="rules">
          <!-- 顶层参数 -->
          <div class="section-title">
            {{ getFieldLabel('topLevelParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item name="DegSpeed" :label="getFieldLabel('DegSpeed', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.DegSpeed"
                  :placeholder="`请输入${getFieldLabel('DegSpeed', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Hz"
                  @update:value="(val) => onFieldChange('DegSpeed', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="RotorRadius" :label="getFieldLabel('RotorRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.RotorRadius"
                  :placeholder="`请输入${getFieldLabel('RotorRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('RotorRadius', val as number | null)"
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
              <a-form-item name="Temperature" :label="getFieldLabel('Temperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.Temperature"
                  :placeholder="`请输入${getFieldLabel('Temperature', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => onFieldChange('Temperature', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="RichBaffleTemp" :label="getFieldLabel('RichBaffleTemp', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.RichBaffleTemp"
                  :placeholder="`请输入${getFieldLabel('RichBaffleTemp', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => onFieldChange('RichBaffleTemp', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="PowerFlow" :label="getFieldLabel('PowerFlow', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.PowerFlow"
                  :placeholder="`请输入${getFieldLabel('PowerFlow', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Kg/s"
                  @update:value="(val) => onFieldChange('PowerFlow', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="RotorPressure" :label="getFieldLabel('RotorPressure', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.RotorPressure"
                  :placeholder="`请输入${getFieldLabel('RotorPressure', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Pa"
                  @update:value="(val) => onFieldChange('RotorPressure', val as number | null)"
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
                name="PoorTackInnerRadius"
                :label="getFieldLabel('PoorTackInnerRadius', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.PoorTackInnerRadius"
                  :placeholder="`请输入${getFieldLabel('PoorTackInnerRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('PoorTackInnerRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorTackOuterRadius"
                :label="getFieldLabel('PoorTackOuterRadius', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.PoorTackOuterRadius"
                  :placeholder="`请输入${getFieldLabel('PoorTackOuterRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('PoorTackOuterRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorTackRootOuterRadius"
                :label="getFieldLabel('PoorTackRootOuterRadius', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.PoorTackRootOuterRadius"
                  :placeholder="`请输入${getFieldLabel('PoorTackRootOuterRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('PoorTackRootOuterRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="TackAttkAngle"
                :label="getFieldLabel('TackAttkAngle', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.TackAttkAngle"
                  :placeholder="`请输入${getFieldLabel('TackAttkAngle', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="rad"
                  @update:value="(val) => onFieldChange('TackAttkAngle', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="TackHeight" :label="getFieldLabel('TackHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.TackHeight"
                  :placeholder="`请输入${getFieldLabel('TackHeight', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('TackHeight', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="PoorTackDistance"
                :label="getFieldLabel('PoorTackDistance', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.PoorTackDistance"
                  :placeholder="`请输入${getFieldLabel('PoorTackDistance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('PoorTackDistance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RichTackDistance"
                :label="getFieldLabel('RichTackDistance', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.RichTackDistance"
                  :placeholder="`请输入${getFieldLabel('RichTackDistance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('RichTackDistance', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="EvenSectionPipeLength"
                :label="getFieldLabel('EvenSectionPipeLength', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.EvenSectionPipeLength"
                  :placeholder="`请输入${getFieldLabel('EvenSectionPipeLength', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('EvenSectionPipeLength', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="TackChamferAngle" :label="getFieldLabel('TackChamferAngle', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.TackChamferAngle"
                  :placeholder="`请输入${getFieldLabel('TackChamferAngle', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="rad"
                  @update:value="(val) => onFieldChange('TackChamferAngle', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="RichBaffleHoleDiam" :label="getFieldLabel('RichBaffleHoleDiam', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.RichBaffleHoleDiam"
                  :placeholder="`请输入${getFieldLabel('RichBaffleHoleDiam', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('RichBaffleHoleDiam', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="ChangeSectionPipeLength"
                :label="getFieldLabel('ChangeSectionPipeLength', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.ChangeSectionPipeLength"
                  :placeholder="`请输入${getFieldLabel('ChangeSectionPipeLength', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('ChangeSectionPipeLength', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="PipeRadius" :label="getFieldLabel('PipeRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.PipeRadius"
                  :placeholder="`请输入${getFieldLabel('PipeRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('PipeRadius', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="TackSurfaceRoughness" :label="getFieldLabel('TackSurfaceRoughness', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.TackSurfaceRoughness"
                  :placeholder="`请输入${getFieldLabel('TackSurfaceRoughness', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('TackSurfaceRoughness', val as number | null)"
                />
              </a-form-item>

              <a-form-item name="TackTaperAngle" :label="getFieldLabel('TackTaperAngle', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="formData.TackTaperAngle"
                  :placeholder="`请输入${getFieldLabel('TackTaperAngle', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="rad"
                  @update:value="(val) => onFieldChange('TackTaperAngle', val as number | null)"
                />
              </a-form-item>

              <a-form-item
                name="RichBaffleArrayHoleDiam"
                :label="getFieldLabel('RichBaffleArrayHoleDiam', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="formData.RichBaffleArrayHoleDiam"
                  :placeholder="`请输入${getFieldLabel('RichBaffleArrayHoleDiam', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => onFieldChange('RichBaffleArrayHoleDiam', val as number | null)"
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
          <span class="result-label">贫取料器功耗:</span>
          <span class="result-value" :style="{ color: themeColor }">
            {{
              outputResults.poorTackPower !== null && outputResults.poorTackPower !== undefined
                ? outputResults.poorTackPower.toFixed(2)
                : '-'
            }}
            W
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">取料器总功耗:</span>
          <span class="result-value" :style="{ color: themeColor }">
            {{
              outputResults.tackPower !== null && outputResults.tackPower !== undefined
                ? outputResults.tackPower.toFixed(2)
                : '-'
            }}
            W
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
.power-analysis-design-container {
  padding: 5px;
  margin-bottom: 60px;
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
</style>

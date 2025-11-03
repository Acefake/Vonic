<script setup lang="ts">
import type { FeedingMethod } from '../../store/designStore'

import { FileTextOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'

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

async function readTakeData() {
  const content = await readFileData()
  if (content) {
    parseDatContent(content)
  }
}

/**
 * 读取任务数据
 */
async function readFileData(): Promise<string> {
  const hideLoading = $app.message.loading('正在读取任务数据...', 0)
  try {
    // 获取应用程序同级目录作为默认路径
    const appDirectory = await $app.system.getAppDirectory()

    // 开发环境：手动选择文件
    // 生产环境：自动查找同级目录下的 Sep_power.dat 或 input.dat
    let filePath: string | null = null

    if (import.meta.env.DEV) {
      const files = await $app.file.selectFile({
        title: '选择任务数据文件',
        multiple: false,
        defaultPath: 'C:/Users/Administrator/Desktop',
        filters: [
          { name: '数据文件', extensions: ['dat', 'txt'] },
        ],
      })
      if (files && files.length > 0) {
        filePath = files[0]
      }
    }
    else {
      const candidates = ['Sep_power.dat', 'input.dat']
      for (const name of candidates) {
        const candidatePath = `${appDirectory}\\${name}`
        if (await $app.file.exists(candidatePath)) {
          filePath = candidatePath
          break
        }
      }
      if (!filePath) {
        hideLoading()
        $app.message.error('未找到 Sep_power.dat 或 input.dat 文件')
        return ''
      }
    }

    if (!filePath) {
      hideLoading()
      return ''
    }

    logStore.info(`已选择文件: ${filePath}`)

    const content = await $app.file.readDatFile(filePath)

    $app.message.success('任务数据读取并解析成功')

    hideLoading()

    return content
  }
  catch (error) {
    hideLoading()
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStore.error(errorMessage, '读取任务数据失败')
    $app.message.error(`读取任务数据失败: ${errorMessage}`)
    return ''
  }
}

/**
 * 仿真计算
 */
async function simulateCalculation(): Promise<void> {
  const hideLoading = $app.message.loading('正在计算中...', 0)

  try {
    // const content = await readFileData()
    // if (!content) {
    //   return
    // }
    // replaceSepPowerParams(content)

    // hideLoading()

    // 调用 exe 程序

    const result = await $app.callExe('Sep_power.exe')

    logStore.info('正在启动 Sep_power.exe 程序...')

    if (result.status === 'started') {
      logStore.info('Sep_power.exe 程序正常启动')
    }
    else if (result.status === 'exited') {
      logStore.info('Sep_power.exe 程序正常退出')
    }
    else {
      logStore.error(result.reason, 'Sep_power.exe 程序启动失败')
    }
  }
  catch (error) {
    hideLoading()
    logStore.error(error as string, '仿真计算失败')
  }
}

/**
 * 提交设计
 */
async function submitDesign(): Promise<void> {
}

/**
 * 读取Sep_power.dat替换结果中的 分离功率 和 分离系数
 * 参数名称
    Sep_power中字段
    分离功率
    ACTURAL SEPERATIVE POWER
    分离系数
    ACTURAL SEPERATIVE FACTOR
 */
// function replaceSepPowerParams(content: string): void {
//   const lineArr = content
//     .replace(/\r\n/g, '\n') // 统一换行符为 \n（兼容 Windows 环境）
//     .split('\n') // 按换行符拆分
//     .filter(line => line.trim() !== '') // 过滤空行

//   // eslint-disable-next-line regexp/no-super-linear-backtracking
//   const regex = /^\s*([^=]+?)\s*=\s*(\d+)\s*$/

//   const result = {}
//   lineArr.forEach((line) => {
//     const match = line.match(regex) // 执行匹配
//     if (match) {
//       const key = match[1].trim() // 指标名（去除前后空格）
//       const value = Number(match[2]) // 数值（转为 Number 类型，避免字符串）
//       result[key] = value
//     }
//   })

//   // 更新设计方案中的分离功率和分离系数
//   designStore.updateOutputResults({
//     separationPower: result['ACTURAL SEPERATIVE POWER'],
//     separationFactor: result['ACTURAL SEPERATIVE FACTOR'],
//   })
// }

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
}
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
        <a-form layout="vertical" :model="{}">
          <!-- 顶层参数 -->
          <div class="section-title">
            {{ getFieldLabel('topLevelParams', fieldLabelMode) }}
          </div>

          <div class="section-content">
            <div class="form-row">
              <a-form-item :label="getFieldLabel('angularVelocity', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.angularVelocity"
                  :placeholder="`请输入${getFieldLabel('angularVelocity', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Hz"
                  @update:value="(val) => designStore.updateTopLevelParams({ angularVelocity: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('rotorRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorRadius"
                  :placeholder="`请输入${getFieldLabel('rotorRadius', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm" @update:value="(val) => designStore.updateTopLevelParams({ rotorRadius: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('rotorShoulderLength', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorShoulderLength"
                  :placeholder="`请输入${getFieldLabel('rotorShoulderLength', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateTopLevelParams({ rotorShoulderLength: val })"
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
              <a-form-item :label="getFieldLabel('rotorSidewallPressure', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.rotorSidewallPressure"
                  :placeholder="`请输入${getFieldLabel('rotorSidewallPressure', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Pa"
                  @update:value="(val) => designStore.updateOperatingParams({ rotorSidewallPressure: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.gasDiffusionCoefficient"
                  :placeholder="`请输入${getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)}`" style="width: 100%"
                  @update:value="(val) => designStore.updateOperatingParams({ gasDiffusionCoefficient: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedFlowRate', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.feedFlowRate"
                  :placeholder="`请输入${getFieldLabel('feedFlowRate', fieldLabelMode)}`" style="width: 100%"
                  addon-after="Kg/s"
                  @update:value="(val) => designStore.updateOperatingParams({ feedFlowRate: val })"
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

              <a-form-item :label="getFieldLabel('splitRatio', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.splitRatio"
                  :placeholder="`请输入${getFieldLabel('splitRatio', fieldLabelMode)}`" style="width: 100%"
                  @update:value="(val) => designStore.updateOperatingParams({ splitRatio: val })"
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
              <a-form-item :label="getFieldLabel('depletedEndCapTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.depletedEndCapTemperature"
                  :placeholder="`请输入${getFieldLabel('depletedEndCapTemperature', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => designStore.updateDrivingParams({ depletedEndCapTemperature: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.enrichedEndCapTemperature"
                  :placeholder="`请输入${getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)}`" style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => designStore.updateDrivingParams({ enrichedEndCapTemperature: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedAxialDisturbance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.feedAxialDisturbance"
                  :placeholder="`请输入${getFieldLabel('feedAxialDisturbance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateDrivingParams({ feedAxialDisturbance: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedAngularDisturbance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.feedAngularDisturbance"
                  :placeholder="`请输入${getFieldLabel('feedAngularDisturbance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateDrivingParams({ feedAngularDisturbance: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.depletedMechanicalDriveAmount"
                  :placeholder="`请输入${getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateDrivingParams({ depletedMechanicalDriveAmount: val })"
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
              <a-form-item :label="getFieldLabel('extractionChamberHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.extractionChamberHeight"
                  :placeholder="`请输入${getFieldLabel('extractionChamberHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ extractionChamberHeight: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ enrichedBaffleHoleDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.feedBoxShockDiskHeight"
                  :placeholder="`请输入${getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ feedBoxShockDiskHeight: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedExtractionArmRadius"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedExtractionArmRadius: val })"
                />
              </a-form-item>

              <a-form-item
                :label="getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionPortInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedExtractionPortInnerDiameter: val })"
                />
              </a-form-item>

              <a-form-item
                :label="getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedBaffleInnerHoleOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleInnerHoleOuterDiameter: val })"
                />
              </a-form-item>

              <a-form-item
                :label="getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDistributionCircleDiameter"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ enrichedBaffleHoleDistributionCircleDiameter: val })"
                />
              </a-form-item>

              <a-form-item
                :label="getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedExtractionPortOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedExtractionPortOuterDiameter: val })"
                />
              </a-form-item>

              <a-form-item
                :label="getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedBaffleOuterHoleInnerDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleOuterHoleInnerDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('minAxialDistance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.minAxialDistance"
                  :placeholder="`请输入${getFieldLabel('minAxialDistance', fieldLabelMode)}`" style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ minAxialDistance: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedBaffleAxialPosition"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleAxialPosition: val })"
                />
              </a-form-item>

              <a-form-item
                :label="getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)"
                class="form-col"
              >
                <a-input-number
                  :value="separationComponents.depletedBaffleOuterHoleOuterDiameter"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%" addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleOuterHoleOuterDiameter: val })"
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
    <a-space>
      <a-button type="primary" @click="simulateCalculation">
        仿真计算
      </a-button>
      <a-button type="primary" @click="submitDesign">
        提交设计
      </a-button>
    </a-space>
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
</style>

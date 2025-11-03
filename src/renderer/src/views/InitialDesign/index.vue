<script setup lang="ts">
import type { FeedingMethod } from '../../store/designStore'

import { FileTextOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { useApp } from '../../app'
import { useDesignStore } from '../../store/designStore'
import { useLogStore } from '../../store/logStore'
import { useSettingsStore } from '../../store/settingsStore'
import { getFeedingMethodOptions, getFieldLabel } from '../../utils/field-labels'

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
// 供料方式选项（根据显示模式动态获取）
const feedingMethodOptions = computed(() => getFeedingMethodOptions(fieldLabelMode.value))

/**
 * 读取任务数据
 */
async function readTaskData(): Promise<void> {
  const hideLoading = $app.message.loading('正在读取任务数据...', 0)

  try {
    // 获取应用程序同级目录作为默认路径
    const appDirectory = await $app.system.getAppDirectory()

    // 打开文件选择对话框
    // 开发环境：使用桌面目录
    // 生产环境：使用应用同级目录
    const files = await $app.file.selectFile({
      title: '选择任务数据文件',
      multiple: false,
      defaultPath: import.meta.env.DEV ? 'C:/Users/Administrator/Desktop' : appDirectory,
      filters: [
        { name: '数据文件', extensions: ['json', 'dat', 'txt'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: 'DAT 文件', extensions: ['dat'] },
        { name: 'TXT 文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (!files || files.length === 0) {
      hideLoading()
      return
    }

    const filePath = files[0]
    logStore.info(`已选择文件: ${filePath}`)

    hideLoading()
    logStore.info('任务数据读取成功，界面参数已更新')
  }
  catch (error) {
    hideLoading()
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStore.error(errorMessage, '读取任务数据失败')
    $app.message.error(`读取任务数据失败: ${errorMessage}`)
  }
}

/**
 * 仿真计算
 */
async function simulateCalculation(): Promise<void> {
  const hideLoading = $app.message.loading('正在计算中...', 0)

  try {
    // 模拟计算过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 模拟计算结果，更新到 store
    designStore.updateOutputResults({
      separationPower: 1234.56,
      separationFactor: 2.345,
    })

    hideLoading()
    $app.message.success('计算完成')
    logStore.info('计算完成')
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
  try {
    const confirmed = await $app.dialog.confirm({
      title: '确认提交',
      content: '确定要提交当前设计方案吗？',
    })

    if (confirmed) {
      const scheme = designStore.getDesignScheme
      $app.message.success('设计方案已提交')
      $app.logger.info('提交设计方案', scheme)
      // TODO: 调用后端 API 提交数据
    }
  }
  catch (error) {
    $app.message.error('提交失败')
    $app.logger.error('提交设计失败:', error)
  }
}
</script>

<template>
  <div class="initial-design-container">
    <div class="form-content">
      <!-- 顶部按钮 -->
      <div class="top-actions">
        <a-button @click="readTaskData">
          <template #icon>
            <FileTextOutlined />
          </template>
          读取任务数据
        </a-button>
      </div>

      <!-- 设计类型 -->
      <a-card :title="getFieldLabel('designType', fieldLabelMode) ">
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
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('angularVelocity', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="$"
                  @update:value="(val) => designStore.updateTopLevelParams({ angularVelocity: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('rotorRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorRadius"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('rotorRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateTopLevelParams({ rotorRadius: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('rotorShoulderLength', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="topLevelParams.rotorShoulderLength"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('rotorShoulderLength', fieldLabelMode)}`"
                  style="width: 100%"
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
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('rotorSidewallPressure', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Pa"
                  @update:value="(val) => designStore.updateOperatingParams({ rotorSidewallPressure: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.gasDiffusionCoefficient"
                  :min="0"
                  :precision="6"
                  :placeholder="`请输入${getFieldLabel('gasDiffusionCoefficient', fieldLabelMode)}`"
                  style="width: 100%"
                  @update:value="(val) => designStore.updateOperatingParams({ gasDiffusionCoefficient: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedFlowRate', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.feedFlowRate"
                  :min="0"
                  :precision="4"
                  :placeholder="`请输入${getFieldLabel('feedFlowRate', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="Kg/s"
                  @update:value="(val) => designStore.updateOperatingParams({ feedFlowRate: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedingMethod', fieldLabelMode)" class="form-col">
                <a-select
                  :value="operatingParams.feedingMethod"
                  :placeholder="`请选择${getFieldLabel('feedingMethod', fieldLabelMode)}`"
                  style="width: 100%"
                  @update:value="(val) => designStore.updateOperatingParams({ feedingMethod: val as FeedingMethod })"
                >
                  <a-select-option
                    v-for="option in feedingMethodOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item :label="getFieldLabel('splitRatio', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="operatingParams.splitRatio"
                  :min="0"
                  :max="1"
                  :precision="4"
                  :placeholder="`请输入${getFieldLabel('splitRatio', fieldLabelMode)}`"
                  style="width: 100%"
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
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedEndCapTemperature', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => designStore.updateDrivingParams({ depletedEndCapTemperature: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.enrichedEndCapTemperature"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('enrichedEndCapTemperature', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="K"
                  @update:value="(val) => designStore.updateDrivingParams({ enrichedEndCapTemperature: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedAxialDisturbance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.feedAxialDisturbance"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('feedAxialDisturbance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateDrivingParams({ feedAxialDisturbance: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedAngularDisturbance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.feedAngularDisturbance"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('feedAngularDisturbance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateDrivingParams({ feedAngularDisturbance: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="drivingParams.depletedMechanicalDriveAmount"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedMechanicalDriveAmount', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
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
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('extractionChamberHeight', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ extractionChamberHeight: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ enrichedBaffleHoleDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.feedBoxShockDiskHeight"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('feedBoxShockDiskHeight', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ feedBoxShockDiskHeight: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedExtractionArmRadius"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionArmRadius', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedExtractionArmRadius: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedExtractionPortInnerDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedExtractionPortInnerDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedBaffleInnerHoleOuterDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleInnerHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleInnerHoleOuterDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.enrichedBaffleHoleDistributionCircleDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ enrichedBaffleHoleDistributionCircleDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedExtractionPortOuterDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedExtractionPortOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedExtractionPortOuterDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedBaffleOuterHoleInnerDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleInnerDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleOuterHoleInnerDiameter: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('minAxialDistance', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.minAxialDistance"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('minAxialDistance', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ minAxialDistance: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedBaffleAxialPosition"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleAxialPosition', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
                  @update:value="(val) => designStore.updateSeparationComponents({ depletedBaffleAxialPosition: val })"
                />
              </a-form-item>

              <a-form-item :label="getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)" class="form-col">
                <a-input-number
                  :value="separationComponents.depletedBaffleOuterHoleOuterDiameter"
                  :min="0"
                  :precision="2"
                  :placeholder="`请输入${getFieldLabel('depletedBaffleOuterHoleOuterDiameter', fieldLabelMode)}`"
                  style="width: 100%"
                  addon-after="mm"
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
            {{ outputResults.separationPower !== null && outputResults.separationPower !== undefined ? outputResults.separationPower.toFixed(2) : '-' }} W
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">{{ getFieldLabel('separationFactor', fieldLabelMode) }}:</span>
          <span class="result-value">
            {{ outputResults.separationFactor !== null && outputResults.separationFactor !== undefined ? outputResults.separationFactor.toFixed(4) : '-' }}
          </span>
        </div>
      </a-space>
    </div>

    <!-- 操作按钮 -->
    <a-space>
      <a-button type="primary" @click="simulateCalculation">
        仿真计算
      </a-button>
      <a-button @click="submitDesign">
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

.output-results{
  width: 100%;
}
</style>

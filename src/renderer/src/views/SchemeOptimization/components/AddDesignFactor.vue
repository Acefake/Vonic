<script setup lang="ts">
import { ref, watch } from 'vue'

import { useApp } from '../../../app'
import { useWindowParams } from '../../../hooks/useWindowParams'
import { getFieldLabel } from '../../../utils/field-labels'

interface FieldItem {
  key: string
  label: string
  checked: boolean
}

interface FieldGroup {
  title: string
  items: FieldItem[]
}

interface WindowData {
  selectedKeys?: string[]
  selected?: Array<{ key: string, label?: string }>
}

const app = useApp()

// 使用 hook 获取窗口参数，自动处理数据获取和 IPC 监听
const { data: windowData } = useWindowParams<WindowData>()

// 将设计表单中的字段分组，并显示中文名
const fieldGroups = ref<FieldGroup[]>([
  {
    title: getFieldLabel('topLevelParams'),
    items: [
      { key: 'angularVelocity', label: getFieldLabel('angularVelocity'), checked: false },
      { key: 'rotorRadius', label: getFieldLabel('rotorRadius'), checked: false },
      { key: 'rotorShoulderLength', label: getFieldLabel('rotorShoulderLength'), checked: false },
    ],
  },
  {
    title: getFieldLabel('operatingParams'),
    items: [
      { key: 'rotorSidewallPressure', label: getFieldLabel('rotorSidewallPressure'), checked: false },
      { key: 'gasDiffusionCoefficient', label: getFieldLabel('gasDiffusionCoefficient'), checked: false },
      { key: 'feedFlowRate', label: getFieldLabel('feedFlowRate'), checked: false },
      { key: 'feedingMethod', label: getFieldLabel('feedingMethod'), checked: false },
      { key: 'splitRatio', label: getFieldLabel('splitRatio'), checked: false },
    ],
  },
  {
    title: getFieldLabel('drivingParams'),
    items: [
      { key: 'depletedEndCapTemperature', label: getFieldLabel('depletedEndCapTemperature'), checked: false },
      { key: 'enrichedEndCapTemperature', label: getFieldLabel('enrichedEndCapTemperature'), checked: false },
      { key: 'feedAxialDisturbance', label: getFieldLabel('feedAxialDisturbance'), checked: false },
      { key: 'feedAngularDisturbance', label: getFieldLabel('feedAngularDisturbance'), checked: false },
      { key: 'depletedMechanicalDriveAmount', label: getFieldLabel('depletedMechanicalDriveAmount'), checked: false },
    ],
  },
  {
    title: getFieldLabel('separationComponents'),
    items: [
      { key: 'extractionChamberHeight', label: getFieldLabel('extractionChamberHeight'), checked: false },
      { key: 'enrichedBaffleHoleDiameter', label: getFieldLabel('enrichedBaffleHoleDiameter'), checked: false },
      { key: 'feedBoxShockDiskHeight', label: getFieldLabel('feedBoxShockDiskHeight'), checked: false },
      { key: 'depletedExtractionArmRadius', label: getFieldLabel('depletedExtractionArmRadius'), checked: false },
      { key: 'depletedExtractionPortInnerDiameter', label: getFieldLabel('depletedExtractionPortInnerDiameter'), checked: false },
      { key: 'depletedBaffleInnerHoleOuterDiameter', label: getFieldLabel('depletedBaffleInnerHoleOuterDiameter'), checked: false },
      { key: 'enrichedBaffleHoleDistributionCircleDiameter', label: getFieldLabel('enrichedBaffleHoleDistributionCircleDiameter'), checked: false },
      { key: 'depletedExtractionPortOuterDiameter', label: getFieldLabel('depletedExtractionPortOuterDiameter'), checked: false },
      { key: 'depletedBaffleOuterHoleInnerDiameter', label: getFieldLabel('depletedBaffleOuterHoleInnerDiameter'), checked: false },
      { key: 'minAxialDistance', label: getFieldLabel('minAxialDistance'), checked: false },
      { key: 'depletedBaffleAxialPosition', label: getFieldLabel('depletedBaffleAxialPosition'), checked: false },
      { key: 'depletedBaffleOuterHoleOuterDiameter', label: getFieldLabel('depletedBaffleOuterHoleOuterDiameter'), checked: false },
    ],
  },
])

/**
 * 更新选中状态
 */
function updateCheckedState(data: WindowData | null): void {
  const keys: string[] = Array.isArray(data?.selectedKeys)
    ? (data!.selectedKeys as string[])
    : Array.isArray(data?.selected)
      ? (data!.selected!.map(item => item.key))
      : []

  // 重置所有选中状态
  fieldGroups.value.forEach((group) => {
    group.items.forEach((item) => {
      item.checked = keys.includes(item.key)
    })
  })
}

// 监听窗口数据变化，自动更新选中状态（包括懒加载窗口重新打开的场景）
watch(windowData, (newData) => {
  updateCheckedState(newData)
}, { immediate: true })

function onConfirm(): void {
  const selected = fieldGroups.value.flatMap(group => group.items.filter(i => i.checked))
  const result = selected.map(item => ({ key: item.key, label: item.label }))
  app.window.current.close(result)
}

function onCancel(): void {
  app.window.current.close()
}
</script>

<template>
  <div class="add-design-factor">
    <div class="card-body-flex">
      <div class="content">
        <a-card
          v-for="group in fieldGroups"
          :key="group.title"
          :title="group.title"
          size="small"
          style="margin-bottom: 8px"
        >
          <a-space direction="vertical" :size="6" style="width: 100%">
            <div v-for="item in group.items" :key="item.key" class="field-item">
              <a-checkbox v-model:checked="item.checked">
                {{ item.label }}
              </a-checkbox>
            </div>
          </a-space>
        </a-card>
      </div>

      <div class="actions">
        <a-space>
          <a-button type="primary" @click="onConfirm">
            确认并关闭
          </a-button>
          <a-button @click="onCancel">
            取消
          </a-button>
        </a-space>
      </div>
    </div>
  </div>
</template>

<style scoped>
.add-design-factor {
  height: 100vh;
  min-height: 0;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.card-body-flex {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.field-item {
  line-height: 24px;
}
.actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}
</style>

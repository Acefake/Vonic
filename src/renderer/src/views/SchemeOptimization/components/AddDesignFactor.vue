<script setup lang="ts">
import { ref, watch } from 'vue'

import { getProductConfig } from '../../../../../config/product.config'
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

// 使用 hook 获取窗口参数，自动处理数据获取和 IPC 监听
const { data: windowData } = useWindowParams<WindowData>()

/**
 * 创建字段项
 */
function createFieldItem(key: string): FieldItem {
  return {
    key,
    label: getFieldLabel(key),
    checked: false,
  }
}

/**
 * 根据产品配置生成参数组
 */
function createFieldGroups(): FieldGroup[] {
  const productConfig = getProductConfig()
  const productId = productConfig.id

  // mPhysSim 产品的参数组配置
  if (productId === 'mPhysSim') {
    return [
      {
        title: getFieldLabel('topLevelParams'),
        items: [
          createFieldItem('angularVelocity'),
          createFieldItem('rotorRadius'),
          createFieldItem('rotorShoulderLength'),
        ],
      },
      {
        title: getFieldLabel('operatingParams'),
        items: [
          createFieldItem('rotorSidewallPressure'),
          createFieldItem('gasDiffusionCoefficient'),
          createFieldItem('feedFlowRate'),
          createFieldItem('feedingMethod'),
          createFieldItem('splitRatio'),
        ],
      },
      {
        title: getFieldLabel('drivingParams'),
        items: [
          createFieldItem('depletedEndCapTemperature'),
          createFieldItem('enrichedEndCapTemperature'),
          createFieldItem('feedAxialDisturbance'),
          createFieldItem('feedAngularDisturbance'),
          createFieldItem('depletedMechanicalDriveAmount'),
        ],
      },
      {
        title: getFieldLabel('separationComponents'),
        items: [
          createFieldItem('extractionChamberHeight'),
          createFieldItem('enrichedBaffleHoleDiameter'),
          createFieldItem('feedBoxShockDiskHeight'),
          createFieldItem('depletedExtractionArmRadius'),
          createFieldItem('depletedExtractionPortInnerDiameter'),
          createFieldItem('depletedBaffleInnerHoleOuterDiameter'),
          createFieldItem('enrichedBaffleHoleDistributionCircleDiameter'),
          createFieldItem('depletedExtractionPortOuterDiameter'),
          createFieldItem('depletedBaffleOuterHoleInnerDiameter'),
          createFieldItem('minAxialDistance'),
          createFieldItem('depletedBaffleAxialPosition'),
          createFieldItem('depletedBaffleOuterHoleOuterDiameter'),
        ],
      },
    ]
  }

  // powerAnalysis 产品的参数组配置
  if (productId === 'powerAnalysis') {
    return [
      {
        title: getFieldLabel('topLevelParams'),
        items: [
          createFieldItem('angularVelocity'),
          createFieldItem('rotorRadius'),
        ],
      },
      {
        title: getFieldLabel('fluidParams'),
        items: [
          createFieldItem('averageTemperature'),
          createFieldItem('enrichedBaffleTemperature'),
          createFieldItem('feedFlowRate'),
          createFieldItem('rotorSidewallPressure'),
        ],
      },
      {
        title: getFieldLabel('separationComponents'),
        items: [
          createFieldItem('depletedExtractionPortInnerDiameter'),
          createFieldItem('depletedExtractionPortOuterDiameter'),
          createFieldItem('depletedExtractionRootOuterDiameter'),
          createFieldItem('extractorAngleOfAttack'),
          createFieldItem('extractionChamberHeight'),
          createFieldItem('depletedExtractionCenterDistance'),
          createFieldItem('enrichedExtractionCenterDistance'),
          createFieldItem('constantSectionStraightPipeLength'),
          createFieldItem('extractorCuttingAngle'),
          createFieldItem('enrichedBaffleHoleDiameter'),
          createFieldItem('variableSectionStraightPipeLength'),
          createFieldItem('bendRadiusOfCurvature'),
          createFieldItem('extractorSurfaceRoughness'),
          createFieldItem('extractorTaperAngle'),
          createFieldItem('enrichedBaffleHoleDistributionCircleDiameter'),
        ],
      },
    ]
  }

  // 默认返回 mPhysSim 配置
  return [
    {
      title: getFieldLabel('topLevelParams'),
      items: [
        createFieldItem('angularVelocity'),
        createFieldItem('rotorRadius'),
        createFieldItem('rotorShoulderLength'),
      ],
    },
    {
      title: getFieldLabel('operatingParams'),
      items: [
        createFieldItem('rotorSidewallPressure'),
        createFieldItem('gasDiffusionCoefficient'),
        createFieldItem('feedFlowRate'),
        createFieldItem('feedingMethod'),
        createFieldItem('splitRatio'),
      ],
    },
    {
      title: getFieldLabel('drivingParams'),
      items: [
        createFieldItem('depletedEndCapTemperature'),
        createFieldItem('enrichedEndCapTemperature'),
        createFieldItem('feedAxialDisturbance'),
        createFieldItem('feedAngularDisturbance'),
        createFieldItem('depletedMechanicalDriveAmount'),
      ],
    },
    {
      title: getFieldLabel('separationComponents'),
      items: [
        createFieldItem('extractionChamberHeight'),
        createFieldItem('enrichedBaffleHoleDiameter'),
        createFieldItem('feedBoxShockDiskHeight'),
        createFieldItem('depletedExtractionArmRadius'),
        createFieldItem('depletedExtractionPortInnerDiameter'),
        createFieldItem('depletedBaffleInnerHoleOuterDiameter'),
        createFieldItem('enrichedBaffleHoleDistributionCircleDiameter'),
        createFieldItem('depletedExtractionPortOuterDiameter'),
        createFieldItem('depletedBaffleOuterHoleInnerDiameter'),
        createFieldItem('minAxialDistance'),
        createFieldItem('depletedBaffleAxialPosition'),
        createFieldItem('depletedBaffleOuterHoleOuterDiameter'),
      ],
    },
  ]
}

// 将设计表单中的字段分组，并根据产品配置动态生成
const fieldGroups = ref<FieldGroup[]>(createFieldGroups())

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

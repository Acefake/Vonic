import type { SchemeData } from '../views/MultiScheme/index.vue'
import { Button } from 'ant-design-vue'
import { defineStore, storeToRefs } from 'pinia'
import { computed, h, ref } from 'vue'
import { FIELD_LABELS, getFieldLabel } from '../utils/field-labels'
import { useSchemeOptimizationStore } from './schemeOptimizationStore'

const fieldConfigs = computed(() => {
  const isPowerAnalysis = app.productConfig.id === 'powerAnalysis'

  // 共同字段（两种产品都有的字段）- 使用文件字段名
  const commonFields = [
    { key: 'DegSpeed', label: getFieldLabel('DegSpeed'), width: 120, unit: 'Hz' },
    { key: 'RotorRadius', label: getFieldLabel('RotorRadius'), width: 120, unit: 'mm' },
    { key: 'TackHeight', label: getFieldLabel('TackHeight'), width: 140, unit: 'mm' },
    { key: 'RotorPressure', label: getFieldLabel('RotorPressure'), width: 140, unit: 'Pa' },
    // 流量字段根据产品类型动态显示
    ...(isPowerAnalysis
      ? [{ key: 'PowerFlow', label: getFieldLabel('PowerFlow'), width: 120, unit: 'kg/s' }]
      : [{ key: 'FeedFlow', label: getFieldLabel('FeedFlow'), width: 120, unit: 'kg/s' }]
    ),
    { key: 'RichBaffleArrayHoleDiam', label: getFieldLabel('RichBaffleArrayHoleDiam'), width: 180, unit: 'mm' },
    { key: 'RichBaffleHoleDiam', label: getFieldLabel('RichBaffleHoleDiam'), width: 140, unit: 'mm' },
    { key: 'PoorTackInnerRadius', label: getFieldLabel('PoorTackInnerRadius'), width: 160, unit: 'mm' },
    { key: 'PoorTackOuterRadius', label: getFieldLabel('PoorTackOuterRadius'), width: 160, unit: 'mm' },
  ]

  // 功率分析特有字段 - 使用文件字段名
  const powerAnalysisFields = [
    { key: 'Temperature', label: getFieldLabel('Temperature'), width: 140, unit: 'K' },
    { key: 'RichBaffleTemp', label: getFieldLabel('RichBaffleTemp'), width: 160, unit: 'K' },
    { key: 'PoorTackRootOuterRadius', label: getFieldLabel('PoorTackRootOuterRadius'), width: 180, unit: 'mm' },
    { key: 'TackAttkAngle', label: getFieldLabel('TackAttkAngle'), width: 140, unit: 'rad' },
    { key: 'PoorTackDistance', label: getFieldLabel('PoorTackDistance'), width: 160, unit: 'mm' },
    { key: 'RichTackDistance', label: getFieldLabel('RichTackDistance'), width: 160, unit: 'mm' },
    { key: 'EvenSectionPipeLength', label: getFieldLabel('EvenSectionPipeLength'), width: 180, unit: 'mm' },
    { key: 'TackChamferAngle', label: getFieldLabel('TackChamferAngle'), width: 140, unit: 'rad' },
    { key: 'ChangeSectionPipeLength', label: getFieldLabel('ChangeSectionPipeLength'), width: 180, unit: 'mm' },
    { key: 'PipeRadius', label: getFieldLabel('PipeRadius'), width: 140, unit: 'mm' },
    { key: 'TackSurfaceRoughness', label: getFieldLabel('TackSurfaceRoughness'), width: 160, unit: 'mm' },
    { key: 'TackTaperAngle', label: getFieldLabel('TackTaperAngle'), width: 140, unit: 'rad' },
  ]

  // 多物理场数值模拟仿真计算特有字段 - 使用文件字段名
  const mPhysSimFields = [
    { key: 'RotorLength', label: getFieldLabel('RotorLength'), width: 140, unit: 'mm' },
    { key: 'GasParam', label: getFieldLabel('GasParam'), width: 140 },
    { key: 'PoorCoverTemp', label: getFieldLabel('PoorCoverTemp'), width: 140, unit: 'K' },
    { key: 'RichCoverTemp', label: getFieldLabel('RichCoverTemp'), width: 140, unit: 'K' },
    { key: 'PoorDrive', label: getFieldLabel('PoorDrive'), width: 160, unit: 'mm' },
    { key: 'PoorArmRadius', label: getFieldLabel('PoorArmRadius'), width: 160, unit: 'mm' },
    { key: 'innerBoundaryMirrorPosition', label: '内边界镜像位置', width: 140, unit: 'mm' },
    { key: 'gridGenerationMethod', label: '网格生成方式', width: 120 },
    { key: 'FeedBoxAndPoorInterval', label: getFieldLabel('FeedBoxAndPoorInterval'), width: 200, unit: 'mm' },
    { key: 'FeedBoxHeight', label: getFieldLabel('FeedBoxHeight'), width: 160, unit: 'mm' },
    { key: 'SplitRatio', label: getFieldLabel('SplitRatio'), width: 100 },
    { key: 'FeedDegDist', label: getFieldLabel('FeedDegDist'), width: 140, unit: 'mm' },
    { key: 'FeedAxialDist', label: getFieldLabel('FeedAxialDist'), width: 140, unit: 'mm' },
    { key: 'PoorBaffleInnerHoleOuterRadius', label: getFieldLabel('PoorBaffleInnerHoleOuterRadius'), width: 200, unit: 'mm' },
    { key: 'PoorBaffleOuterHoleInnerRadius', label: getFieldLabel('PoorBaffleOuterHoleInnerRadius'), width: 200, unit: 'mm' },
    { key: 'PoorBaffleOuterHoleOuterRadius', label: getFieldLabel('PoorBaffleOuterHoleOuterRadius'), width: 200, unit: 'mm' },
    { key: 'PoorBaffleAxialSpace', label: getFieldLabel('PoorBaffleAxialSpace'), width: 160, unit: 'mm' },
    { key: 'bwgRadialProtrusionHeight', label: 'BWG径向凸起高度', width: 140, unit: 'mm' },
    { key: 'bwgAxialHeight', label: 'BWG轴向高度', width: 120, unit: 'mm' },
    { key: 'bwgAxialPosition', label: 'BWG轴向位置', width: 140, unit: 'mm' },
    { key: 'radialGridRatio', label: '径向网格比', width: 120 },
    { key: 'FeedMethod', label: getFieldLabel('FeedMethod'), width: 120 },
    { key: 'compensationCoefficient', label: '补偿系数', width: 120 },
    { key: 'streamlineData', label: '流线数据', width: 120 },
  ]

  // 根据产品类型返回对应的字段配置
  if (isPowerAnalysis) {
    return [...commonFields, ...powerAnalysisFields]
  }
  else {
    // 多物理场数值模拟仿真计算包含所有字段
    return [...commonFields, ...powerAnalysisFields, ...mPhysSimFields]
  }
})

// 反查：根据中文标签获取字段 key
function getFieldKeyByLabel(label: string): string | null {
  for (const [key, map] of Object.entries(FIELD_LABELS)) {
    if (map['zh-CN'] === label)
      return key
  }
  return null
}

// 从方案优化中获取当前选中的设计因子，转换为字段 key 列表
export const useMultiSchemeStore = defineStore('multiScheme', () => {
  const schemeOptimizationStore = useSchemeOptimizationStore()
  const { designFactors } = storeToRefs(schemeOptimizationStore)

  /** 多方案列表 */
  const schemes = ref<SchemeData[]>([])
  /** 读取的方案列表 */
  const loading = ref(false)
  const hasLoaded = ref(false)
  const outFingerprint = ref('')
  const filteredData = ref<SchemeData[]>([])
  const activeKey = ref('1')
  // 结果字段（用于表格和图表 Y 轴）
  const resultFields = computed(() => app.productConfig.resultFields ?? [])
  // 行选择相关
  const selectedRowKeys = ref<(string | number)[]>([])
  const selectedRows = ref<SchemeData[]>([])

  // 从方案优化中获取当前选中的设计因子，转换为字段 key 列表
  const selectedDesignFactorKeys = computed<string[]>(() => {
    const keys = designFactors.value
      .map(f => getFieldKeyByLabel(f.name))
      .filter((k): k is string => !!k)
    return keys
  })

  // 表格列定义
  const columns = computed(() => {
    const baseColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 50,
        align: 'center' as const,
      },
    ]

    // 仅显示方案优化中选中的设计因子对应的列
    const activeFieldConfigs = fieldConfigs.value.filter(cfg => selectedDesignFactorKeys.value.includes(cfg.key))

    const fieldColumns = activeFieldConfigs.map(config => ({
      title: config.unit ? `${config.label}(${config.unit})` : config.label,
      dataIndex: config.key,
      key: config.key,
      width: config.width,
      align: 'right' as const,
      filterDropdown: createUniqueValueFilterPanel(config.key),
      onFilter: uniqueValueFilter(config.key),
    }))

    const resultColumns = [
      {
        title: app.productConfig.resultFields?.[0]?.label,
        dataIndex: app.productConfig.resultFields?.[0]?.field,
        key: app.productConfig.resultFields?.[0]?.field,
        width: 120,
        align: 'right' as const,
        filterDropdown: createUniqueValueFilterPanel(app.productConfig.resultFields?.[0]?.field ?? ''),
        onFilter: uniqueValueFilter(app.productConfig.resultFields?.[0]?.field ?? ''),
      },
      {
        title: app.productConfig.resultFields?.[1]?.label,
        dataIndex: app.productConfig.resultFields?.[1]?.field,
        key: app.productConfig.resultFields?.[1]?.field,
        width: 120,
        align: 'right' as const,
        filterDropdown: createUniqueValueFilterPanel(app.productConfig.resultFields?.[1]?.field ?? ''),
        onFilter: uniqueValueFilter(app.productConfig.resultFields?.[1]?.field ?? ''),
      },
    ]

    return [...baseColumns, ...fieldColumns, ...resultColumns]
  })

  // 获取某列的所有唯一值（去重）
  function getUniqueValues(dataIndex: string): any[] {
    const values = schemes.value
      .map(record => record[dataIndex as keyof SchemeData])
      .filter((value): value is number => value !== null && value !== undefined)

    // 使用Set去重，然后排序
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b)
    return uniqueValues
  }

  function uniqueValueFilter(dataIndex: string) {
    return (value: any, record: SchemeData) => {
      const recordValue = record[dataIndex as keyof SchemeData]
      return recordValue === value
    }
  }

  // 创建基于唯一值的筛选面板
  function createUniqueValueFilterPanel(dataIndex: string) {
    return ({
      setSelectedKeys,
      selectedKeys,
      confirm,
    }: any) => {
      const uniqueValues = getUniqueValues(dataIndex)

      const handleCheckboxChange = (value: any, checked: boolean): void => {
        const newKeys = checked
          ? [...selectedKeys, value]
          : selectedKeys.filter((k: any) => k !== value)
        setSelectedKeys(newKeys)
        // 选中即生效
        confirm({ closeDropdown: false })
      }

      return h('div', { style: 'max-height: 300px; display: flex; flex-direction: column; min-width: 150px' }, [
        // 重置按钮放在顶部
        h('div', { style: 'padding: 8px; border-bottom: 1px solid #e8e8e8' }, [
          h(
            Button,
            {
              size: 'small',
              block: true,
              onClick: () => {
                setSelectedKeys([])
                confirm({ closeDropdown: true })
              },
            },
            { default: () => '重置' },
          ),
        ]),
        // 可滚动的选项列表
        h('div', { style: 'padding: 8px; overflow-y: auto; flex: 1' }, uniqueValues.map(value =>
          h('div', {
            key: value,
            style: 'padding: 4px 0; cursor: pointer; display: flex; align-items: center;',
            onClick: (e: Event) => {
              e.preventDefault()
              const checked = !selectedKeys.includes(value)
              handleCheckboxChange(value, checked)
            },
          }, [
            h('input', {
              type: 'checkbox',
              checked: selectedKeys.includes(value),
              style: 'margin-right: 8px; pointer-events: none;',
            }),
            h('span', {}, value.toString()),
          ]),
        )),
      ])
    }
  }

  // X 轴列定义（设计因子）- 仅包含方案优化选中的设计因子
  const xColumns = computed(() => {
    const activeFieldConfigs = fieldConfigs.value.filter(cfg => selectedDesignFactorKeys.value.includes(cfg.key))
    return activeFieldConfigs.map(config => ({
      title: config.label,
      dataIndex: config.key,
      key: config.key,
    }))
  })

  // Y 轴列定义（结果指标）- 基于产品配置
  const yColumns = computed(() => {
    if (resultFields.value.length > 0) {
      return resultFields.value.map(f => ({
        title: f.label,
        dataIndex: f.field,
        key: f.field,
      }))
    }
    // 回退到默认（兼容旧数据）
    return [
      { title: '分离功率', dataIndex: 'sepPower', key: 'sepPower' },
      { title: '分离系数', dataIndex: 'sepFactor', key: 'sepFactor' },
    ]
  })

  return {
    schemes,
    filteredData,
    selectedRowKeys,
    selectedRows,
    activeKey,
    loading,
    hasLoaded,
    outFingerprint,
    columns,
    xColumns,
    yColumns,
  }
}, {
  persist: {
    key: 'multi-scheme-store',
    storage: sessionStorage,
  },
})

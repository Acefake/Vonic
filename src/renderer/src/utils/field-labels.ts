/**
 * 字段标签配置
 * 支持中文和英文（大写）两种显示模式
 */

/**
 * 字段标签模式
 */
export type FieldLabelMode = 'zh-CN' | 'en-US'

/**
 * 字段标签映射
 */
export interface FieldLabelMap {
  /** 中文标签 */
  'zh-CN': string
  /** 英文标签（大写） */
  'en-US': string
}

/**
 * 字段标签配置枚举
 */
export const FIELD_LABELS: Record<string, FieldLabelMap> = {
  // 顶层参数
  angularVelocity: {
    'zh-CN': '角速度',
    'en-US': 'ANGULAR_VELOCITY',
  },
  rotorRadius: {
    'zh-CN': '转子半径',
    'en-US': 'ROTOR_RADIUS',
  },
  rotorShoulderLength: {
    'zh-CN': '转子两肩长',
    'en-US': 'ROTOR_SHOULDER_LENGTH',
  },

  // 运行参数
  rotorSidewallPressure: {
    'zh-CN': '转子侧壁压强',
    'en-US': 'ROTOR_SIDEWALL_PRESSURE',
  },
  gasDiffusionCoefficient: {
    'zh-CN': '气体扩散系数',
    'en-US': 'GAS_DIFFUSION_COEFFICIENT',
  },
  feedFlowRate: {
    'zh-CN': '供料流量',
    'en-US': 'FEED_FLOW_RATE',
  },
  feedingMethod: {
    'zh-CN': '供料方式',
    'en-US': 'FEEDING_METHOD',
  },
  splitRatio: {
    'zh-CN': '分流比',
    'en-US': 'SPLIT_RATIO',
  },

  // 驱动参数
  depletedEndCapTemperature: {
    'zh-CN': '贫料端盖温度',
    'en-US': 'DEPLETED_END_CAP_TEMPERATURE',
  },
  enrichedEndCapTemperature: {
    'zh-CN': '精料端盖温度',
    'en-US': 'ENRICHED_END_CAP_TEMPERATURE',
  },
  feedAxialDisturbance: {
    'zh-CN': '供料轴向扰动',
    'en-US': 'FEED_AXIAL_DISTURBANCE',
  },
  feedAngularDisturbance: {
    'zh-CN': '供料角向扰动',
    'en-US': 'FEED_ANGULAR_DISTURBANCE',
  },
  depletedMechanicalDriveAmount: {
    'zh-CN': '贫料机械驱动量',
    'en-US': 'DEPLETED_MECHANICAL_DRIVE_AMOUNT',
  },

  // 分离部件
  extractionChamberHeight: {
    'zh-CN': '取料腔高度',
    'en-US': 'EXTRACTION_CHAMBER_HEIGHT',
  },
  enrichedBaffleHoleDiameter: {
    'zh-CN': '精挡板孔直径',
    'en-US': 'ENRICHED_BAFFLE_HOLE_DIAMETER',
  },
  feedBoxShockDiskHeight: {
    'zh-CN': '供料箱激波盘高度',
    'en-US': 'FEED_BOX_SHOCK_DISK_HEIGHT',
  },
  depletedExtractionArmRadius: {
    'zh-CN': '贫料取料支臂半径',
    'en-US': 'DEPLETED_EXTRACTION_ARM_RADIUS',
  },
  depletedExtractionPortInnerDiameter: {
    'zh-CN': '贫取料口部内径',
    'en-US': 'DEPLETED_EXTRACTION_PORT_INNER_DIAMETER',
  },
  depletedBaffleInnerHoleOuterDiameter: {
    'zh-CN': '贫料挡板内孔外径',
    'en-US': 'DEPLETED_BAFFLE_INNER_HOLE_OUTER_DIAMETER',
  },
  enrichedBaffleHoleDistributionCircleDiameter: {
    'zh-CN': '精挡板孔分布圆直径',
    'en-US': 'ENRICHED_BAFFLE_HOLE_DISTRIBUTION_CIRCLE_DIAMETER',
  },
  depletedExtractionPortOuterDiameter: {
    'zh-CN': '贫取料口部外径',
    'en-US': 'DEPLETED_EXTRACTION_PORT_OUTER_DIAMETER',
  },
  depletedBaffleOuterHoleInnerDiameter: {
    'zh-CN': '贫料挡板外孔内径',
    'en-US': 'DEPLETED_BAFFLE_OUTER_HOLE_INNER_DIAMETER',
  },
  minAxialDistance: {
    'zh-CN': '供料箱与贫取料器最近轴向间距',
    'en-US': 'MIN_AXIAL_DISTANCE',
  },
  depletedBaffleAxialPosition: {
    'zh-CN': '贫料挡板轴向位置',
    'en-US': 'DEPLETED_BAFFLE_AXIAL_POSITION',
  },
  depletedBaffleOuterHoleOuterDiameter: {
    'zh-CN': '贫料挡板外孔外径',
    'en-US': 'DEPLETED_BAFFLE_OUTER_HOLE_OUTER_DIAMETER',
  },

  // 输出结果
  separationPower: {
    'zh-CN': '分离功率',
    'en-US': 'SEPARATION_POWER',
  },
  separationFactor: {
    'zh-CN': '分离系数',
    'en-US': 'SEPARATION_FACTOR',
  },

  // 分组标题
  topLevelParams: {
    'zh-CN': '顶层参数',
    'en-US': 'TOP_LEVEL_PARAMS',
  },
  operatingParams: {
    'zh-CN': '运行参数',
    'en-US': 'OPERATING_PARAMS',
  },
  drivingParams: {
    'zh-CN': '驱动参数',
    'en-US': 'DRIVING_PARAMS',
  },
  separationComponents: {
    'zh-CN': '分离部件',
    'en-US': 'SEPARATION_COMPONENTS',
  },
  outputResults: {
    'zh-CN': '输出结果',
    'en-US': 'OUTPUT_RESULTS',
  },
  designType: {
    'zh-CN': '设计类型',
    'en-US': 'DESIGN_TYPE',
  },
  isMultiScheme: {
    'zh-CN': '是否多方案',
    'en-US': 'IS_MULTI_SCHEME',
  },
}

/**
 * 供料方式选项
 */
export const FEEDING_METHOD_OPTIONS: Record<FieldLabelMode, Array<{ label: string, value: string }>> = {
  'zh-CN': [
    { label: '点供料', value: '点供料' },
    { label: '线供料', value: '线供料' },
    { label: '面供料', value: '面供料' },
  ],
  'en-US': [
    { label: 'POINT_FEEDING', value: '点供料' },
    { label: 'LINE_FEEDING', value: '线供料' },
    { label: 'SURFACE_FEEDING', value: '面供料' },
  ],
}

/**
 * 获取字段标签
 * @param fieldKey 字段键
 * @param mode 显示模式
 * @returns 字段标签
 */
export function getFieldLabel(fieldKey: string, mode: FieldLabelMode = 'zh-CN'): string {
  const labelMap = FIELD_LABELS[fieldKey]
  if (!labelMap) {
    return fieldKey
  }
  return labelMap[mode]
}

/**
 * 获取供料方式选项
 * @param mode 显示模式
 * @returns 供料方式选项列表
 */
export function getFeedingMethodOptions(mode: FieldLabelMode = 'zh-CN'): Array<{ label: string, value: string }> {
  return FEEDING_METHOD_OPTIONS[mode]
}

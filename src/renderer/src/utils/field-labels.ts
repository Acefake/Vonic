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
  // mPhysSim 和 PowerAnalysis 共同字段（使用文件字段名）
  DegSpeed: {
    'zh-CN': '角速度',
    'en-US': 'ANGULAR_VELOCITY',
  },
  RotorRadius: {
    'zh-CN': '转子半径',
    'en-US': 'ROTOR_RADIUS',
  },
  RotorLength: {
    'zh-CN': '转子两肩长',
    'en-US': 'ROTOR_SHOULDER_LENGTH',
  },
  RotorPressure: {
    'zh-CN': '转子侧壁压强',
    'en-US': 'ROTOR_SIDEWALL_PRESSURE',
  },
  TackHeight: {
    'zh-CN': '取料腔高度',
    'en-US': 'EXTRACTION_CHAMBER_HEIGHT',
  },
  RichBaffleHoleDiam: {
    'zh-CN': '精挡板孔直径',
    'en-US': 'ENRICHED_BAFFLE_HOLE_DIAMETER',
  },
  RichBaffleArrayHoleDiam: {
    'zh-CN': '精挡板孔分布圆直径',
    'en-US': 'ENRICHED_BAFFLE_HOLE_DISTRIBUTION_CIRCLE_DIAMETER',
  },
  PoorTackInnerRadius: {
    'zh-CN': '贫取料口部内径',
    'en-US': 'DEPLETED_EXTRACTION_PORT_INNER_DIAMETER',
  },
  PoorTackOuterRadius: {
    'zh-CN': '贫取料口部外径',
    'en-US': 'DEPLETED_EXTRACTION_PORT_OUTER_DIAMETER',
  },

  // mPhysSim 特有字段
  FeedMethod: {
    'zh-CN': '供料方式',
    'en-US': 'FEEDING_METHOD',
  },
  GasParam: {
    'zh-CN': '气体扩散系数',
    'en-US': 'GAS_DIFFUSION_COEFFICIENT',
  },
  FeedFlow: {
    'zh-CN': '供料流量',
    'en-US': 'FEED_FLOW_RATE',
  },
  SplitRatio: {
    'zh-CN': '分流比',
    'en-US': 'SPLIT_RATIO',
  },
  PoorCoverTemp: {
    'zh-CN': '贫料端盖温度',
    'en-US': 'DEPLETED_END_CAP_TEMPERATURE',
  },
  RichCoverTemp: {
    'zh-CN': '精料端盖温度',
    'en-US': 'ENRICHED_END_CAP_TEMPERATURE',
  },
  FeedAxialDist: {
    'zh-CN': '供料轴向扰动',
    'en-US': 'FEED_AXIAL_DISTURBANCE',
  },
  FeedDegDist: {
    'zh-CN': '供料角向扰动',
    'en-US': 'FEED_ANGULAR_DISTURBANCE',
  },
  PoorDrive: {
    'zh-CN': '贫料机械驱动量',
    'en-US': 'DEPLETED_MECHANICAL_DRIVE_AMOUNT',
  },
  FeedBoxHeight: {
    'zh-CN': '供料箱激波盘高度',
    'en-US': 'FEED_BOX_SHOCK_DISK_HEIGHT',
  },
  PoorArmRadius: {
    'zh-CN': '贫料取料支臂半径',
    'en-US': 'DEPLETED_EXTRACTION_ARM_RADIUS',
  },
  PoorBaffleInnerHoleOuterRadius: {
    'zh-CN': '贫料挡板内孔外径',
    'en-US': 'DEPLETED_BAFFLE_INNER_HOLE_OUTER_DIAMETER',
  },
  PoorBaffleOuterHoleInnerRadius: {
    'zh-CN': '贫料挡板外孔内径',
    'en-US': 'DEPLETED_BAFFLE_OUTER_HOLE_INNER_DIAMETER',
  },
  PoorBaffleOuterHoleOuterRadius: {
    'zh-CN': '贫料挡板外孔外径',
    'en-US': 'DEPLETED_BAFFLE_OUTER_HOLE_OUTER_DIAMETER',
  },
  FeedBoxAndPoorInterval: {
    'zh-CN': '供料箱与贫取料器最近轴向间距',
    'en-US': 'MIN_AXIAL_DISTANCE',
  },
  PoorBaffleAxialSpace: {
    'zh-CN': '贫料挡板轴向位置',
    'en-US': 'DEPLETED_BAFFLE_AXIAL_POSITION',
  },
  SplitPower: {
    'zh-CN': '分离功率',
    'en-US': 'SEPARATION_POWER',
  },
  SplitParam: {
    'zh-CN': '分离系数',
    'en-US': 'SEPARATION_FACTOR',
  },

  // PowerAnalysis 特有字段
  Temperature: {
    'zh-CN': '平均温度',
    'en-US': 'AVERAGE_TEMPERATURE',
  },
  RichBaffleTemp: {
    'zh-CN': '精料挡板温度',
    'en-US': 'ENRICHED_BAFFLE_TEMPERATURE',
  },
  PowerFlow: {
    'zh-CN': '供料流量',
    'en-US': 'FEED_FLOW_RATE',
  },
  PoorTackRootOuterRadius: {
    'zh-CN': '贫取料根部外径',
    'en-US': 'DEPLETED_EXTRACTION_ROOT_OUTER_DIAMETER',
  },
  PoorTackDistance: {
    'zh-CN': '贫取料中心距',
    'en-US': 'DEPLETED_EXTRACTION_CENTER_DISTANCE',
  },
  RichTackDistance: {
    'zh-CN': '精取料中心距',
    'en-US': 'ENRICHED_EXTRACTION_CENTER_DISTANCE',
  },
  EvenSectionPipeLength: {
    'zh-CN': '等截面直管段长度',
    'en-US': 'CONSTANT_SECTION_STRAIGHT_PIPE_LENGTH',
  },
  ChangeSectionPipeLength: {
    'zh-CN': '变截面直管段长度',
    'en-US': 'VARIABLE_SECTION_STRAIGHT_PIPE_LENGTH',
  },
  PipeRadius: {
    'zh-CN': '弯管弧度半径',
    'en-US': 'BEND_RADIUS_OF_CURVATURE',
  },
  TackSurfaceRoughness: {
    'zh-CN': '取料器表面粗糙度',
    'en-US': 'EXTRACTOR_SURFACE_ROUGHNESS',
  },
  TackAttkAngle: {
    'zh-CN': '取料器攻角',
    'en-US': 'EXTRACTOR_ANGLE_OF_ATTACK',
  },
  TackChamferAngle: {
    'zh-CN': '取料器切角',
    'en-US': 'EXTRACTOR_CUTTING_ANGLE',
  },
  TackTaperAngle: {
    'zh-CN': '取料器锥角',
    'en-US': 'EXTRACTOR_TAPER_ANGLE',
  },
  PoorTackPower: {
    'zh-CN': '贫取料器功耗',
    'en-US': 'POOR_TACK_POWER',
  },
  TackPower: {
    'zh-CN': '取料器总功耗',
    'en-US': 'TACK_POWER',
  },

  // 兼容性：保留旧的前端字段名（用于向后兼容）
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
  fluidParams: {
    'zh-CN': '流体参数',
    'en-US': 'FLUID_PARAMS',
  },

  // 网格和仿真相关字段
  radialGridCount: {
    'zh-CN': '径向网格数',
    'en-US': 'RADIAL_GRID_COUNT',
  },
  axialGridCount: {
    'zh-CN': '轴向网格数',
    'en-US': 'AXIAL_GRID_COUNT',
  },
  innerBoundaryMirrorPosition: {
    'zh-CN': '内边界镜像位置',
    'en-US': 'INNER_BOUNDARY_MIRROR_POSITION',
  },
  gridGenerationMethod: {
    'zh-CN': '网格生成方法',
    'en-US': 'GRID_GENERATION_METHOD',
  },
  radialGridRatio: {
    'zh-CN': '径向网格比',
    'en-US': 'RADIAL_GRID_RATIO',
  },
  compensationCoefficient: {
    'zh-CN': '补偿系数',
    'en-US': 'COMPENSATION_COEFFICIENT',
  },
  streamlineData: {
    'zh-CN': '流线数据',
    'en-US': 'STREAMLINE_DATA',
  },
  bwgRadialProtrusionHeight: {
    'zh-CN': 'BWG径向突出高度',
    'en-US': 'BWG_RADIAL_PROTRUSION_HEIGHT',
  },
  sepPower: {
    'zh-CN': '分离功率',
    'en-US': 'SEPARATION_POWER',
  },
  sepFactor: {
    'zh-CN': '分离系数',
    'en-US': 'SEPARATION_FACTOR',
  },

  // 兼容性：保留旧的功率分析字段名
  averageTemperature: {
    'zh-CN': '平均温度',
    'en-US': 'AVERAGE_TEMPERATURE',
  },
  enrichedBaffleTemperature: {
    'zh-CN': '精料挡板温度',
    'en-US': 'ENRICHED_BAFFLE_TEMPERATURE',
  },
  depletedExtractionRootOuterDiameter: {
    'zh-CN': '贫取料根部外径',
    'en-US': 'DEPLETED_EXTRACTION_ROOT_OUTER_DIAMETER',
  },
  extractorAngleOfAttack: {
    'zh-CN': '取料器攻角',
    'en-US': 'EXTRACTOR_ANGLE_OF_ATTACK',
  },
  depletedExtractionCenterDistance: {
    'zh-CN': '贫取料中心距',
    'en-US': 'DEPLETED_EXTRACTION_CENTER_DISTANCE',
  },
  enrichedExtractionCenterDistance: {
    'zh-CN': '精取料中心距',
    'en-US': 'ENRICHED_EXTRACTION_CENTER_DISTANCE',
  },
  constantSectionStraightPipeLength: {
    'zh-CN': '等截面直管段长度',
    'en-US': 'CONSTANT_SECTION_STRAIGHT_PIPE_LENGTH',
  },
  extractorCuttingAngle: {
    'zh-CN': '取料器切角',
    'en-US': 'EXTRACTOR_CUTTING_ANGLE',
  },
  variableSectionStraightPipeLength: {
    'zh-CN': '变截面直管段长度',
    'en-US': 'VARIABLE_SECTION_STRAIGHT_PIPE_LENGTH',
  },
  bendRadiusOfCurvature: {
    'zh-CN': '弯管弧度半径',
    'en-US': 'BEND_RADIUS_OF_CURVATURE',
  },
  extractorSurfaceRoughness: {
    'zh-CN': '取料器表面粗糙度',
    'en-US': 'EXTRACTOR_SURFACE_ROUGHNESS',
  },
  extractorTaperAngle: {
    'zh-CN': '取料器锥角',
    'en-US': 'EXTRACTOR_TAPER_ANGLE',
  },
  depletedExtractorPowerConsumption: {
    'zh-CN': '贫取料器功耗',
    'en-US': 'DEPLETED_EXTRACTOR_POWER_CONSUMPTION',
  },
  totalExtractorPowerConsumption: {
    'zh-CN': '取料器总功耗',
    'en-US': 'TOTAL_EXTRACTOR_POWER_CONSUMPTION',
  },
  poorTackPower: {
    'zh-CN': '贫取料器功耗',
    'en-US': 'POOR_TACK_POWER',
  },
  tackPower: {
    'zh-CN': '取料器总功耗',
    'en-US': 'TACK_POWER',
  },
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

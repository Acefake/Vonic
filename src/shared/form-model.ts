export interface mPhysSimConfigFormModel {
  DegSpeed: number
  RotorRadius: number
  RotorLength: number
  FeedMethod: number
  RotorPressure: number
  GasParam: number
  FeedFlow: number
  SplitRatio: number
  PoorCoverTemp: number
  RichCoverTemp: number
  FeedAxialDist: number
  FeedDegDist: number
  PoorDrive: number
  TackHeight: number
  RichBaffleHoleDiam: number
  FeedBoxHeight: number
  PoorArmRadius: number
  PoorTackInnerRadius: number
  PoorTackOuterRadius: number
  PoorBaffleInnerHoleOuterRadius: number
  PoorBaffleOuterHoleInnerRadius: number
  PoorBaffleOuterHoleOuterRadius: number
  RichBaffleArrayHoleDiam: number
  FeedBoxAndPoorInterval: number
  PoorBaffleAxialSpace: number
  SplitPower?: number
  SplitParam?: number
}

export interface powerAnalysisConfigFormModel {
  DegSpeed: number
  RotorRadius: number
  Temperature: number
  RichBaffleTemp: number
  RotorPressure: number
  PowerFlow: number
  PoorTackInnerRadius: number
  PoorTackOuterRadius: number
  PoorTackRootOuterRadius: number
  PoorTackDistance: number
  RichTackDistance: number
  EvenSectionPipeLength: number
  ChangeSectionPipeLength: number
  PipeRadius: number
  TackSurfaceRoughness: number
  TackAttkAngle: number
  TackChamferAngle: number
  TackTaperAngle: number
  TackHeight: number
  RichBaffleHoleDiam: number
  RichBaffleArrayHoleDiam: number
  PoorTackPower?: number
  TackPower?: number
}

// PowerAnalysis 字段列表（直接使用文件字段名）
export const powerAnalysisFields: Array<keyof powerAnalysisConfigFormModel> = [
  'DegSpeed',
  'RotorRadius',
  'Temperature',
  'RichBaffleTemp',
  'RotorPressure',
  'PowerFlow',
  'PoorTackInnerRadius',
  'PoorTackOuterRadius',
  'PoorTackRootOuterRadius',
  'PoorTackDistance',
  'RichTackDistance',
  'EvenSectionPipeLength',
  'ChangeSectionPipeLength',
  'PipeRadius',
  'TackSurfaceRoughness',
  'TackAttkAngle',
  'TackChamferAngle',
  'TackTaperAngle',
  'TackHeight',
  'RichBaffleHoleDiam',
  'RichBaffleArrayHoleDiam',
]

// mPhysSim 字段列表（直接使用文件字段名）
export const mPhysSimFields: Array<keyof mPhysSimConfigFormModel> = [
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

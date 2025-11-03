import type { ProductConfig } from './product'
import mPhysSimConfig from './mPhysSim.config'
import powerAnalysisConfig from './powerAnalysis.config'

/** 产品配置映射表 */
const productConfigs: Map<string, ProductConfig> = new Map<string, ProductConfig>([
  [mPhysSimConfig.id, mPhysSimConfig],
  [powerAnalysisConfig.id, powerAnalysisConfig],
])

/** 获取当前产品配置 */
export function getProductConfig(): ProductConfig {
  const productId: string = import.meta.env?.VITE_APP_PRODUCT || mPhysSimConfig.id
  const config = productConfigs.get(productId)

  if (!config) {
    console.warn(`未找到产品配置: ${productId}，使用默认配置 mPhysSim`)
    return mPhysSimConfig
  }

  return config
}

export const productConfig = getProductConfig()

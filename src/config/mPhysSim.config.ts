import type { ProductConfig } from './product'

/** 多物理场数值模拟仿真计算配置 */
const mPhysSimConfig: ProductConfig = {
  id: 'mPhysSim',
  name: '多物理场数值模拟仿真计算',
  version: '1.0.0',
  themeColor: '#085ab1',
  api: {
    baseUrl: 'http://localhost:53301',
    port: 53301,
    timeout: 30000,
  },
  features: {
    initialDesign: true,
    schemeOptimization: true,
    multiScheme: true,
    experimentalData: true,
    dataComparison: true,
  },
  doe: {
    port: 25504,
    startupTimeout: 30000,
    enabled: true,
  },
  services: {
    startupMode: 'parallel',
    errorStrategy: 'stop-all',
  },
}

export default mPhysSimConfig

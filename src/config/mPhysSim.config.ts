import type { ProductConfig } from './product'

/** 多物理场数值模拟仿真计算配置 */
const mPhysSimConfig: ProductConfig = {
  id: 'mPhysSim',
  name: '多物理场数值模拟仿真计算',
  version: '1.0.0',
  themeColor: '#085ab1',
  api: {
    baseUrl: 'http://localhost:8090',
    port: 8090,
    timeout: 30000,
  },
  window: {
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
  },
  features: {
    initialDesign: true,
    schemeOptimization: true,
    multiScheme: true,
    experimentalData: true,
    dataComparison: true,
  },
  java: {
    jvmArgs: ['-Xmx512m', '-Xms256m'],
    startupTimeout: 30000,
  },
}

export default mPhysSimConfig

import type { ProductConfig } from './product'

const powerAnalysisConfig: ProductConfig = {
  id: 'powerAnalysis',
  name: '功率分析',
  version: '1.0.0',
  themeColor: '#009a3a',
  api: {
    baseUrl: 'http://localhost:53302',
    port: 53302,
    timeout: 30000,
  },
  features: {
    powerAnalysis: true,
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

export default powerAnalysisConfig

import type { ProductConfig } from './product'

const powerAnalysisConfig: ProductConfig = {
  id: 'powerAnalysis',
  name: '功率分析',
  version: '1.0.0',
  themeColor: '#007ACC',
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
  },
  java: {
    jvmArgs: ['-Xmx512m', '-Xms256m'],
    startupTimeout: 30000,
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

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
  file: {
    /** 可执行文件名称 */
    exeName: 'PowerLoss.exe',
    /** Fortran读取输入文件名称 */
    inputFileName: 'input_p.txt',
    /** Fortran运行后生成结果文件名称 */
    outputFileName: 'output.dat',
    /** 提交任务文件名称 */
    submitFileName: 'output.txt',
  },
  resultFields: [
    {
      field: 'PoorTackPower',
      fileKey: 'W_waccele',
      label: '贫料功率',
    },
    {
      field: 'TackPower',
      fileKey: 'total_accele',
      label: '富料功率',
    },
  ],
}

export default powerAnalysisConfig

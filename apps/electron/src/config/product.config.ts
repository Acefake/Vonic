import type { ProductConfig } from './product'

export const productConfig: ProductConfig = {
  id: 'simu-tool',
  name: 'Simulation Tool',
  version: '1.0.0',
  themeColor: '#1890ff',
}

export function getProductConfig(): ProductConfig {
  return productConfig
}

export interface ProductConfig {
  /** 产品标识 */
  id: string
  /** 产品名称 */
  name: string
  /** 版本号 */
  version: string
  /** 主题颜色 */
  themeColor: string
  /** 其他自定义配置 */
  [key: string]: unknown
}

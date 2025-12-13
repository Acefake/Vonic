import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// 定义后端返回的数据结构
export interface Result<T = unknown> {
  code: number
  message: string
  data: T
}

// 请求选项
export interface RequestOptions {
  // 是否直接返回原生响应
  isReturnNativeResponse?: boolean
  // 是否需要 token
  withToken?: boolean
  // 错误消息提示类型
  errorMessageMode?: 'none' | 'modal' | 'message'
  // 成功消息提示类型
  successMessageMode?: 'none' | 'modal' | 'message'
  // 是否加入时间戳
  joinTime?: boolean
  // 忽略重复请求
  ignoreCancelToken?: boolean
  // 是否携带 token
  withCredentials?: boolean
}

// Transform 钩子函数
export interface RequestTransform {
  // 请求前的钩子
  requestHook?: (config: InternalAxiosRequestConfig, options: RequestOptions) => InternalAxiosRequestConfig
  // 响应前的钩子
  responseHook?: <T = unknown>(res: AxiosResponse<Result<T>>, options: RequestOptions) => T | AxiosResponse<Result<T>>
  // 请求失败钩子
  requestCatchHook?: (error: Error, options: RequestOptions) => Promise<never>
  // 响应失败钩子
  responseCatchHook?: (error: Error, options: RequestOptions) => Promise<never>
}

// 扩展 AxiosRequestConfig
export interface CreateRequestConfig extends AxiosRequestConfig {
  requestOptions?: RequestOptions
  transform?: RequestTransform
}

// 扩展请求配置,使其包含 requestOptions
export interface InternalRequestConfig extends InternalAxiosRequestConfig {
  requestOptions?: RequestOptions
}

// 定义上传文件参数
export interface UploadFileParams {
  // 其他参数
  data?: Record<string, string | number | boolean>
  // 文件参数接口字段名
  name?: string
  // 文件
  file: File | Blob
  // 文件名
  filename?: string
}

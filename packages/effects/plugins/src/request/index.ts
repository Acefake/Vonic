import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { CreateRequestConfig, RequestOptions, Result } from './types'
import axios from 'axios'

export class Request {
  private instance: AxiosInstance
  private readonly options: CreateRequestConfig

  constructor(options: CreateRequestConfig) {
    this.options = options
    this.instance = axios.create(options)
    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 这里可以添加 token 逻辑
        // const token = getToken()
        // if (token && (config as any).requestOptions?.withToken !== false) {
        //   config.headers.Authorization = options.authenticationScheme
        //     ? `${options.authenticationScheme} ${token}`
        //     : token
        // }
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const { data } = response
        // 如果配置了直接返回原生响应
        if ((response.config as any).requestOptions?.isReturnNativeResponse) {
          return response
        }
        // 这里可以根据后端约定的状态码进行判断
        // if (data.code !== 200) {
        //   // 处理错误
        //   return Promise.reject(data)
        // }
        return data
      },
      (error) => {
        // 处理 HTTP 错误状态码
        // const { response } = error
        // if (response) {
        //   checkStatus(response.status)
        // }
        return Promise.reject(error)
      },
    )
  }

  get<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'GET' }, options)
  }

  post<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'POST' }, options)
  }

  put<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'PUT' }, options)
  }

  delete<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'DELETE' }, options)
  }

  request<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    const conf: CreateRequestConfig = JSON.parse(JSON.stringify(config))
    const transform = this.getTransform()
    console.log(transform) // Use transform to avoid lint error or implement logic

    const { requestOptions } = this.options
    const opt: RequestOptions = Object.assign({}, requestOptions, options)

    conf.requestOptions = opt

    // 这里可以添加更多配置处理

    return new Promise((resolve, reject) => {
      this.instance
        .request<any, AxiosResponse<Result>>(conf)
        .then((res: AxiosResponse<Result>) => {
          // 因为拦截器已经处理了，这里直接返回
          resolve(res as unknown as Promise<T>)
        })
        .catch((e: Error | AxiosResponse<Result>) => {
          reject(e)
        })
    })
  }

  private getTransform(): any {
    const { transform } = this.options
    return transform
  }
}

export const defHttp = new Request({
  baseURL: import.meta.env?.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json;charset=utf-8' },
  requestOptions: {
    isReturnNativeResponse: false,
    withToken: true,
    errorMessageMode: 'message',
    joinTime: true,
    ignoreCancelToken: true,
    withCredentials: false,
  },

})

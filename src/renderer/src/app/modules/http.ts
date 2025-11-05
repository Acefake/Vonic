import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { HttpAPI, RequestConfig } from '../types'
import axios from 'axios'
import { getProductConfig } from '../../../../config/product.config'

class HttpClient implements HttpAPI {
  public baseURL: string
  public instance: AxiosInstance

  constructor() {
    const productConfig = getProductConfig()
    // 使用配置中的端口构建 baseURL
    this.baseURL = `http://127.0.0.1:${productConfig.api.port}`
    this.instance = axios.create({
      timeout: productConfig.api.timeout || 30000,
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        // 统一错误处理
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          return Promise.reject(new Error('请求超时'))
        }
        if (error.response) {
          return Promise.reject(new Error(`HTTP Error: ${error.response.status} ${error.response.statusText}`))
        }
        return Promise.reject(error)
      },
    )
  }

  /**
   * 设置基础 URL
   * @param url 基础 URL
   */
  setBaseURL(url: string): void {
    this.instance.defaults.baseURL = url
  }

  /**
   * 设置默认请求头
   * @param headers 请求头
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.instance.defaults.headers.common, headers)
  }

  /**
   * 通用请求方法
   * @param config 请求配置
   * @returns Promise<T>
   */
  async request<T = unknown>(config: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      url: config.url,
      method: config.method || 'GET',
      data: config.data,
      params: config.params,
      headers: config.headers,
      timeout: config.timeout,
    }

    const response: AxiosResponse<T> = await this.instance.request(axiosConfig)
    return response.data
  }

  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.instance.get<T>(url, { params })
    return response.data
  }

  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.post<T>(url, data)
    return response.data
  }

  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.put<T>(url, data)
    return response.data
  }

  async delete<T = unknown>(url: string): Promise<T> {
    const response = await this.instance.delete<T>(url)
    return response.data
  }
}

export const httpAPI = new HttpClient()

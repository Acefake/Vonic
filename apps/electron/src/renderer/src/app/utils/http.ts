import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// Minimal, opinionated Axios wrapper for renderer usage
// - single instance with defaults
// - request/response interceptors for JSON and error normalization
// - small helper methods: get/post/put/delete

const DEFAULT_TIMEOUT = 10_000

function createHttp(baseURL?: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  // Request interceptor: can add auth token or tracing headers here
  instance.interceptors.request.use((cfg) => {
    // Example: attach token from window.app.auth (if exists)
    try {
      const token = (window as any).app?.auth?.getToken?.()
      if (token) {
        cfg.headers = cfg.headers || {}
        cfg.headers.Authorization = `Bearer ${token}`
      }
    }
    catch (e) {
      // swallow - optional
    }
    return cfg
  })

  // Response interceptor: normalize success / error
  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    (error) => {
      // Map axios error to a consistent Error with helpful properties
      const err: any = new Error(error.message)
      if (error.response) {
        err.status = error.response.status
        err.data = error.response.data
      }
      else if (error.request) {
        err.request = error.request
      }
      throw err
    }
  )

  return instance
}

// Default exported instance - no baseURL so it works for absolute urls
const http = createHttp()

export default http

// Convenience helpers
export async function get<T = any>(url: string, config?: AxiosRequestConfig) {
  const r = await http.get<T>(url, config)
  return r.data
}

export async function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
  const r = await http.post<T>(url, data, config)
  return r.data
}

export async function put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
  const r = await http.put<T>(url, data, config)
  return r.data
}

export async function del<T = any>(url: string, config?: AxiosRequestConfig) {
  const r = await http.delete<T>(url, config)
  return r.data
}

export { createHttp }

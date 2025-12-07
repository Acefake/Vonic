import type { StorageAPI } from '../types'

/**
 * 存储 API
 * 基于 localStorage 封装，支持异步操作和类型安全
 */
export const storageAPI: StorageAPI = {
  /**
   * 获取存储值
   * @param key 存储键
   * @returns Promise<T | null> 存储值或 null
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    }
    catch (error) {
      console.error('存储读取失败:', error)
      return null
    }
  },

  /**
   * 设置存储值
   * @param key 存储键
   * @param value 存储值（会自动序列化为 JSON）
   */
  async set(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    }
    catch (error) {
      console.error('存储写入失败:', error)
      throw error
    }
  },

  /**
   * 删除存储值
   * @param key 存储键
   */
  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
    }
    catch (error) {
      console.error('存储删除失败:', error)
      throw error
    }
  },

  /**
   * 清空所有存储
   */
  async clear(): Promise<void> {
    try {
      localStorage.clear()
    }
    catch (error) {
      console.error('存储清空失败:', error)
      throw error
    }
  },
}

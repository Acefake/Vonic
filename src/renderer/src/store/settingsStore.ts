import type { FieldLabelMode } from '../utils/field-labels'

import { defineStore } from 'pinia'

/**
 * 设置 Store
 * 管理应用全局设置，包括字段标签显示模式
 */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    /** 字段标签显示模式 */
    fieldLabelMode: 'zh-CN' as FieldLabelMode,
  }),

  getters: {
    /** 是否使用中文模式 */
    isChineseMode(): boolean {
      return this.fieldLabelMode === 'zh-CN'
    },

    /** 是否使用英文模式 */
    isEnglishMode(): boolean {
      return this.fieldLabelMode === 'en-US'
    },
  },

  actions: {
    /**
     * 设置字段标签显示模式
     * @param mode 显示模式
     */
    setFieldLabelMode(mode: FieldLabelMode): void {
      this.fieldLabelMode = mode
    },

    /**
     * 切换字段标签显示模式
     */
    toggleFieldLabelMode(): void {
      this.fieldLabelMode = this.fieldLabelMode === 'zh-CN' ? 'en-US' : 'zh-CN'
    },
  },
})

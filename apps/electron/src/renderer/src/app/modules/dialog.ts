import type { ModalFuncProps } from 'ant-design-vue'
import type { DialogAPI } from '../types'
import { Modal } from 'ant-design-vue'

/**
 * 对话框 API
 * 封装 Ant Design Vue 的 Modal 组件
 */

/**
 * 对话框 API 实现
 */
export const dialogAPI: DialogAPI = {
  /**
   * 确认对话框
   * @param options 对话框配置
   * @returns Promise<boolean> 用户点击确定返回 true，取消返回 false
   */
  async confirm(options: ModalFuncProps): Promise<boolean> {
    return new Promise((resolve) => {
      Modal.confirm({
        ...options,
        onOk() {
          if (options.onOk) {
            options.onOk()
          }
          resolve(true)
        },
        onCancel() {
          if (options.onCancel) {
            options.onCancel()
          }
          resolve(false)
        },
      })
    })
  },

  /**
   * 信息对话框
   */
  info(options: ModalFuncProps): void {
    Modal.info(options)
  },

  /**
   * 警告对话框
   */
  warning(options: ModalFuncProps): void {
    Modal.warning(options)
  },

  /**
   * 错误对话框
   */
  error(options: ModalFuncProps): void {
    Modal.error(options)
  },

  /**
   * 成功对话框
   */
  success(options: ModalFuncProps): void {
    Modal.success(options)
  },
}

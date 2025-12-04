import type { ClipboardAPI } from '../types'

export const clipboardAPI: ClipboardAPI = {
  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   */
  async writeText(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      }
      else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
        }
        finally {
          document.body.removeChild(textArea)
        }
      }
    }
    catch (error) {
      console.error('复制到剪贴板失败:', error)
      throw error
    }
  },

  /**
   * 读取剪贴板文本
   * @returns 剪贴板中的文本
   */
  async readText(): Promise<string> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText()
      }
      else {
        throw new Error('浏览器不支持读取剪贴板')
      }
    }
    catch (error) {
      console.error('读取剪贴板失败:', error)
      throw error
    }
  },

  /**
   * 复制文本并显示成功消息
   * @param text 要复制的文本
   * @param successMessage 成功消息，默认为"复制成功"
   */
  async copy(text: string, successMessage = '复制成功'): Promise<void> {
    await this.writeText(text)
    // 直接导入 app 实例获取 message API，避免动态导入警告
    const { default: app } = await import('../index')
    app.message.success(successMessage)
  },
}

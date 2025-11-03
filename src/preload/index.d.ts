import type { ElectronAPI } from '@electron-toolkit/preload'

// 自定义 API 接口
interface CustomAPI {
  /** 监听存储更新 */
  onUpdateStorage: (callback: (event: Electron.IpcRendererEvent, key: string) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}

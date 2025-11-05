import { ipcMain, webContents } from 'electron'

/**
 * 状态管理器 - 在主进程中集中管理所有窗口共享的状态
 * 实现多窗口间的状态同步（仅在程序运行期间保存，不持久化到磁盘）
 */
export class StoreManage {
  private state: Map<string, unknown> = new Map()

  init(): void {
    ipcMain.on('store:update', (_event, payload: { key: string, value: unknown }) => {
      const { key, value } = payload

      // 更新主进程中的状态
      this.state.set(key, value)

      // 广播给所有窗口（包括发送者）
      const allContents = webContents.getAllWebContents()

      allContents.forEach((webContent) => {
        // 避免发送给已销毁的窗口
        if (!webContent.isDestroyed()) {
          webContent.send('store:sync', { key, value })
        }
      })
    })

    // 监听渲染进程请求获取状态
    ipcMain.handle('store:get', (_, key: string) => {
      return this.state.get(key)
    })

    // 监听渲染进程请求获取所有状态
    ipcMain.handle('store:getAll', () => {
      return Object.fromEntries(this.state)
    })
  }

  get(key: string): unknown {
    return this.state.get(key)
  }

  set(key: string, value: unknown): void {
    this.state.set(key, value)
  }

  clear(): void {
    this.state.clear()
  }
}

import type { AppInfo, SystemInfo } from './types'
import { cpus, freemem, homedir, hostname, platform, release, totalmem } from 'node:os'
import { dirname } from 'node:path'
import { app, ipcMain } from 'electron'

export class SystemManager {
  /**
   * 注册 IPC 处理器
   */
  registerHandlers(): void {
    ipcMain.handle('system:app-info', this.getAppInfo.bind(this))
    ipcMain.handle('system:system-info', this.getSystemInfo.bind(this))
    ipcMain.handle('system:app-directory', this.getAppDirectory.bind(this))
    ipcMain.on('app:restart', this.restartApp.bind(this))
    ipcMain.on('app:quit', this.quitApp.bind(this))
  }

  /**
   * 获取应用信息
   * @returns 应用信息对象
   */
  private async getAppInfo(): Promise<AppInfo> {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    }
  }

  /**
   * 获取系统信息
   * @returns 系统信息对象
   */
  private async getSystemInfo(): Promise<SystemInfo> {
    return {
      platform: platform(),
      cpuCount: cpus().length,
      totalMemory: totalmem(),
      freeMemory: freemem(),
      hostname: hostname(),
      osVersion: release(),
      homeDir: homedir(),
    }
  }

  /**
   * 获取应用程序目录（exe 同级目录）
   * @returns 应用程序目录路径
   */
  private async getAppDirectory(): Promise<string> {
    if (app.isPackaged) {
      return dirname(process.execPath)
    }
    else {
      return app.getAppPath()
    }
  }

  /**
   * 重启应用
   */
  private restartApp(): void {
    app.relaunch()
    app.exit(0)
  }

  /**
   * 退出应用
   */
  private quitApp(): void {
    app.quit()
  }
}

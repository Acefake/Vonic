import { DebugManager } from './handlers/DebugManager'
import { DialogManager } from './handlers/DialogManager'
import { FileManager } from './handlers/FileManager'
import { SystemManager } from './handlers/SystemManager'

export class AppManager {
  private fileManager: FileManager
  private dialogManager: DialogManager
  private systemManager: SystemManager
  private debugManager: DebugManager

  constructor() {
    this.fileManager = new FileManager()
    this.dialogManager = new DialogManager()
    this.systemManager = new SystemManager()
    this.debugManager = new DebugManager()
  }

  registerHandlers(): void {
    this.fileManager.registerHandlers()
    this.dialogManager.registerHandlers()
    this.systemManager.registerHandlers()
    this.debugManager.registerHandlers()
    console.log('[INFO] App 管理器已初始化，所有 IPC 处理器已注册')
  }

  /**
   * 获取文件管理器实例
   */
  getFileManager(): FileManager {
    return this.fileManager
  }

  /**
   * 获取对话框管理器实例
   */
  getDialogManager(): DialogManager {
    return this.dialogManager
  }

  /**
   * 获取系统管理器实例
   */
  getSystemManager(): SystemManager {
    return this.systemManager
  }

  /**
   * 获取调试管理器实例
   */
  getDebugManager(): DebugManager {
    return this.debugManager
  }
}

// 导出类型
export type { AppInfo, FileFilter, MemoryUsage, SaveFileOptions, SelectFileOptions, SystemInfo } from './types'

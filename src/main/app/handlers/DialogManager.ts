import type { SaveFileOptions, SelectFileOptions } from '../types'

import { dialog, ipcMain, shell } from 'electron'
import { FILE_FILTERS_FOR_READ, FILE_FILTERS_FOR_WRITE } from '../../../shared/files-config'

/**
 * 对话框管理器类
 */
export class DialogManager {
  /**
   * 注册 IPC 处理器
   */
  registerHandlers(): void {
    ipcMain.handle('dialog:select-file', this.selectFile.bind(this))
    ipcMain.handle('dialog:select-folder', this.selectFolder.bind(this))
    ipcMain.handle('dialog:save-file', this.saveFile.bind(this))
    ipcMain.handle('shell:open-external', this.openExternal.bind(this))
    ipcMain.handle('shell:show-in-folder', this.showInFolder.bind(this))
  }

  /**
   * 选择文件
   * @param _ IPC 事件对象
   * @param options 选择选项
   * @returns 选择的文件路径数组，取消则返回 null
   */
  private async selectFile(_: Electron.IpcMainInvokeEvent, options?: SelectFileOptions): Promise<string[] | null> {
    const properties: ('openFile' | 'multiSelections')[] = ['openFile']
    if (options?.multiple) {
      properties.push('multiSelections')
    }

    // 确定使用的过滤器
    let filters = options?.filters
    if (!filters && options?.usePresetFilters !== 'none') {
      // 默认使用读取过滤器
      filters = options?.usePresetFilters === 'write' ? FILE_FILTERS_FOR_WRITE : FILE_FILTERS_FOR_READ
    }

    const result = await dialog.showOpenDialog({
      title: options?.title || '选择文件',
      defaultPath: options?.defaultPath,
      properties,
      filters,
    })
    return result.canceled ? null : result.filePaths
  }

  /**
   * 选择文件夹
   * @returns 选择的文件夹路径，取消则返回 null
   */
  private async selectFolder(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择文件夹',
      properties: ['openDirectory' as const],
    })
    return result.canceled ? null : result.filePaths[0]
  }

  /**
   * 保存文件
   * @param _ IPC 事件对象
   * @param options 保存选项
   * @returns 保存的文件路径，取消则返回 null
   */
  private async saveFile(_: Electron.IpcMainInvokeEvent, options?: SaveFileOptions): Promise<string | null> {
    // 确定使用的过滤器
    let filters = options?.filters
    if (!filters && options?.usePresetFilters) {
      filters = FILE_FILTERS_FOR_WRITE
    }

    const result = await dialog.showSaveDialog({
      title: options?.title || '保存文件',
      defaultPath: options?.defaultPath,
      filters,
    })
    return result.canceled ? null : result.filePath
  }

  /**
   * 打开外部链接
   * @param _ IPC 事件对象
   * @param url URL 地址
   */
  private async openExternal(_: Electron.IpcMainInvokeEvent, url: string): Promise<void> {
    await shell.openExternal(url)
  }

  /**
   * 在文件管理器中显示文件
   * @param _ IPC 事件对象
   * @param path 文件路径
   */
  private async showInFolder(_: Electron.IpcMainInvokeEvent, path: string): Promise<void> {
    shell.showItemInFolder(path)
  }
}

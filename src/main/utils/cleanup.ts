import type { Logger } from '../app/handlers/LogerManager'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

/**
 * 删除外部程序输出目录 out（兼容开发与打包环境）
 * - 打包环境：删除 exe 同目录下的 out
 * - 开发环境：删除 testFile/out
 */
export async function deleteOutFolder(logger?: Logger): Promise<void> {
  try {
    const outDirs: string[] = []

    if (app.isPackaged) {
      const exeDir = path.dirname(app.getPath('exe'))
      outDirs.push(path.join(exeDir, 'out'))
    }
    else {
      const testFileOut = path.join(__dirname, '../../testFile', 'out')
      outDirs.push(testFileOut)
    }

    for (const dir of outDirs) {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true })
        await logger?.log?.('info', `已删除输出目录: ${dir}`)
      }
    }
  }
  catch (error) {
    console.error('删除输出目录失败:', error)
  }
}

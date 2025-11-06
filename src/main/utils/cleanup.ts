import type { Logger } from '../app/handlers/LogerManager'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

/**
 * 删除外部程序输出目录 out（兼容开发与打包环境）
 * - 打包环境：删除 exe 同目录下的 out
 * - 开发环境：尝试删除 testFile/out、项目根目录 out、appPath/out
 */
export async function deleteOutFolder(logger: Logger): Promise<void> {
  try {
    const outDirs: string[] = []

    if (app.isPackaged) {
      const exeDir = path.dirname(app.getPath('exe'))
      outDirs.push(path.join(exeDir, 'out'))
    }
    else {
      // 开发环境：testFile/out
      const testFileOut = path.join(__dirname, '../../testFile', 'out')
      outDirs.push(testFileOut)
      // 兼容：项目根目录 out（若存在）
      outDirs.push(path.join(process.cwd(), 'out'))
      // 兼容：app 路径下 out（若存在）
      outDirs.push(path.join(app.getAppPath(), 'out'))
    }

    for (const dir of outDirs) {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true })
        await logger.log('info', `已删除输出目录: ${dir}`)
      }
    }
  }
  catch (error) {
    console.error('删除输出目录失败:', error)
  }
}

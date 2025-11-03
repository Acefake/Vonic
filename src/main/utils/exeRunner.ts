import { execFile } from 'node:child_process'
import path from 'node:path'
import { app, dialog } from 'electron'
import { Logger } from '@/main/app/handlers/LogerManager'

/**
 * 调用同级目录下的exe程序并返回启动状态
 * @param {string} exeName - 目标exe文件名（如 "myTool.exe"）
 * @returns {Promise<object>} 启动状态结果
 */
export async function runExe(exeName: string) {
  const logger: Logger = new Logger()
  if (!app.isPackaged) {
    // 手动选择 exe 路径
    const exePath = dialog.showOpenDialogSync({
      title: '选择要执行的程序',
      defaultPath: __dirname,
      filters: [{ name: 'Executable Files', extensions: ['exe'] }],
      properties: ['openFile'],
    })
    if (!exePath || exePath.length === 0) {
      return {
        status: 'failed_to_start',
        reason: '用户取消选择',
        pid: null,
      }
    }

    // 使用选中的路径继续执行
    return new Promise((resolve) => {
      const child = execFile(exePath[0], (error) => {
        if (error) {
          resolve({
            status: 'failed',
            reason: `执行出错：${error.message}`,
            code: error.code,
            pid: null,
          })
        }
        else {
          resolve({ status: 'exited', reason: '正常退出', pid: child.pid })
        }
      })

      logger.log('info', `正在启动 ${exePath[0]} 程序...`)

      child.on('spawn', () => {
        resolve({
          status: 'started',
          reason: '程序成功启动',
          pid: child.pid,
          startTime: new Date().toISOString(),
        })
      })

      child.on('error', (err) => {
        resolve({
          status: 'failed_to_start',
          reason: `启动失败：${err.message}`,
          details: err.stack === 'ENOENT' ? '文件不存在/路径错误' : err.stack === 'EACCES' ? '权限不足' : '未知错误',
          pid: null,
        })
      })
    })
  }
  else {
    return new Promise((resolve) => {
      const exePath = path.join(__dirname, exeName)
      const child = execFile(exePath, (error) => {
        if (error) {
          resolve({
            status: 'failed',
            reason: `执行出错：${error.message}`,
            code: error.code,
            pid: null,
          })
        }
        else {
          resolve({ status: 'exited', reason: '正常退出', pid: child.pid })
        }
      })

      child.on('spawn', () => {
        resolve({
          status: 'started',
          reason: '程序成功启动',
          pid: child.pid,
          startTime: new Date().toISOString(),
        })
      })

      child.on('error', (err) => {
        resolve({
          status: 'failed_to_start',
          reason: `启动失败：${err.message}`,
          details: err.stack === 'ENOENT' ? '文件不存在/路径错误' : err.stack === 'EACCES' ? '权限不足' : '未知错误',
          pid: null,
        })
      })
    })
  }
}

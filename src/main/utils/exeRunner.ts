import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { Logger } from '@/main/app/handlers/LogerManager'

// 仅允许同时运行一个外部程序（模块级状态）
let currentExeProcess: ReturnType<typeof execFile> | null = null

/**
 * 调用同级目录下的exe程序并返回启动状态
 * @param {string} exeName - 目标exe文件名（如 "myTool.exe"）
 * @returns {Promise<object>} 启动状态结果
 */
export async function runExe(exeName: string) {
  const logger: Logger = new Logger()

  // 获取主窗口实例用于发送IPC消息
  const mainWindow = BrowserWindow.getAllWindows()[0]
  // 如果是开发环境则找到项目根目录的testFile文件夹
  if (!app.isPackaged) {
    const testFileDir = path.join(__dirname, '../../testFile')
    const exePath = path.join(testFileDir, exeName)
    // 若已有程序在运行，直接返回已在运行状态
    if (currentExeProcess && !currentExeProcess.killed) {
      return Promise.resolve({
        status: 'already_running',
        reason: '已有程序正在运行，请先关闭后再启动',
        pid: currentExeProcess.pid ?? null,
      })
    }
    // 启动前进行存在性检查，避免因路径或文件名错误导致 ENOENT
    if (!existsSync(exePath)) {
      return Promise.resolve({
        status: 'failed_to_start',
        reason: '文件不存在或路径错误',
        details: exePath,
        pid: null,
      })
    }
    return new Promise((resolve) => {
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

      logger.log('info', `正在启动 ${exePath} 程序...`)

      currentExeProcess = child
      child.on('close', (code, signal) => {
        console.log(code, signal)

        const closeResult = {
          exitCode: code,
          signal,
          isSuccess: code === 0,
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('exe-closed', exeName, closeResult)
        }
        // 清空当前运行中的进程引用
        currentExeProcess = null
        resolve(closeResult)
      })

      child.on('spawn', () => {
        resolve({
          status: 'started',
          reason: '程序成功启动',
          pid: child.pid,
          startTime: new Date().toISOString(),
          endTime: null,
          runTime: null,
          isSuccess: null,
        })
      })

      child.on('error', (err) => {
        resolve({
          status: 'failed_to_start',
          reason: `启动失败：${err.message}`,
          details: err.stack === 'ENOENT' ? '文件不存在/路径错误' : err.stack === 'EACCES' ? '权限不足' : '未知错误',
          pid: null,
          startTime: null,
          endTime: null,
          runTime: null,
          isSuccess: null,
        })
        currentExeProcess = null
      })
    })
  }

  else {
    if (currentExeProcess && !currentExeProcess.killed) {
      return Promise.resolve({
        status: 'already_running',
        reason: '已有程序正在运行，请先关闭后再启动',
        pid: currentExeProcess.pid ?? null,
      })
    }
    return new Promise((resolve) => {
      const exePath = path.join(__dirname, exeName)
      // 生产环境：启动前检查文件存在
      if (!existsSync(exePath)) {
        resolve({
          status: 'failed_to_start',
          reason: '文件不存在或路径错误',
          details: exePath,
          pid: null,
        })
        return
      }
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
        currentExeProcess = null
      })

      child.on('close', (code, signal) => {
        console.log(code, signal)

        const closeResult = {
          status: 'close',
          reason: '程序正常退出',
          exitCode: code,
          signal,
        }

        // 通知渲染进程exe已关闭
        if (mainWindow && !mainWindow.isDestroyed()) {
          logger.log('info', `程序 ${exePath[0]} 已退出（PID: ${child.pid}）`)
          mainWindow.webContents.send('exe-closed', exeName, closeResult)
        }
        currentExeProcess = null
        resolve(closeResult)
      })
    })
  }
}

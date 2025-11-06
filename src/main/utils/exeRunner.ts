import type { ChildProcess } from 'node:child_process'
import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { Logger } from '@/main/app/handlers/LogerManager'
import getWindowManager, { WindowName } from '@/main/app/handlers/window'

// 跟踪多个正在运行的进程，key 为工作目录路径
const runningProcesses = new Map<string, ChildProcess>()

/**
 * 获取主窗口实例
 */
function getMainWindow(logger: Logger): BrowserWindow | null {
  try {
    const windowManager = getWindowManager()
    const mainWindow = windowManager.getWindowByName(WindowName.MAIN)
    if (mainWindow && !mainWindow.isDestroyed()) {
      logger.log('info', `[主进程] 通过 WindowManager 获取主窗口成功，窗口ID=${mainWindow.id}`)
      return mainWindow
    }
    // 如果 WindowManager 没有主窗口，回退到使用 getAllWindows
    const allWindows = BrowserWindow.getAllWindows()
    logger.log('info', `[主进程] WindowManager 未找到主窗口，使用 getAllWindows，找到 ${allWindows.length} 个窗口`)
    if (allWindows.length > 0) {
      logger.log('info', `[主进程] 使用 getAllWindows[0]，窗口ID=${allWindows[0].id}, isDestroyed=${allWindows[0].isDestroyed()}`)
      return allWindows[0]
    }
    logger.log('warn', `[主进程] 未找到任何窗口`)
    return null
  }
  catch (error) {
    // 如果 WindowManager 未初始化，回退到使用 getAllWindows
    const allWindows = BrowserWindow.getAllWindows()
    logger.log('warn', `[主进程] 获取 WindowManager 失败，使用 getAllWindows: ${error instanceof Error ? error.message : String(error)}`)
    if (allWindows.length > 0) {
      logger.log('info', `[主进程] 使用 getAllWindows[0]，窗口ID=${allWindows[0].id}, isDestroyed=${allWindows[0].isDestroyed()}`)
      return allWindows[0]
    }
    return null
  }
}

/**
 * 调用同级目录下的exe程序并返回启动状态
 * @param {string} exeName - 目标exe文件名（如 "myTool.exe"）
 * @param {string} workingDir - 可选的工作目录，如果提供则在该目录中执行
 * @returns {Promise<object>} 启动状态结果
 */
export async function runExe(exeName: string, workingDir?: string) {
  const logger: Logger = new Logger()

  // 获取主窗口实例用于发送IPC消息（延迟获取，在需要时再获取）
  // 注意：这里不立即获取，而是在 close 事件处理中获取，确保窗口已初始化
  // 如果是开发环境则找到项目根目录的testFile文件夹
  if (!app.isPackaged) {
    // 确定工作目录和exe路径
    let workingDirectory: string | undefined
    let exePath: string

    if (workingDir) {
      // 如果指定了工作目录，必须使用工作目录中的 exe（因为已经复制过去了）
      // 这样每个样本的 exe 会在自己的工作目录中生成输出文件，互不干扰
      workingDirectory = workingDir
      exePath = path.join(workingDir, exeName)
      // 如果工作目录中没有 exe，直接报错，不回退到 testFile
      // 因为优化计算中，exe 应该已经被复制到工作目录中了
      if (!existsSync(exePath)) {
        logger.log('error', `工作目录 ${workingDir} 中不存在 ${exeName}，请确保 exe 已复制到工作目录`)
        return Promise.resolve({
          status: 'failed_to_start',
          reason: `工作目录中不存在 ${exeName}，请确保 exe 已复制到工作目录`,
          details: exePath,
          pid: null,
        })
      }
    }
    else {
      // 如果没有指定工作目录，从 testFile 目录查找（用于单次运行场景）
      const testFileDir = path.join(process.cwd(), 'testFile')
      exePath = path.join(testFileDir, exeName)
    }

    // 如果指定了工作目录，检查该目录是否已有进程在运行
    if (workingDir && runningProcesses.has(workingDir)) {
      const existingProcess = runningProcesses.get(workingDir)
      if (existingProcess && !existingProcess.killed) {
        return Promise.resolve({
          status: 'already_running',
          reason: '该工作目录已有程序正在运行',
          pid: existingProcess.pid ?? null,
        })
      }
      // 如果进程已结束但未清理，移除它
      runningProcesses.delete(workingDir)
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
      const child = execFile(exePath, { cwd: workingDirectory }, (error) => {
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

      // 如果指定了工作目录，记录进程
      if (workingDirectory) {
        runningProcesses.set(workingDirectory, child)
      }

      child.on('close', (code, signal) => {
        console.log(code, signal)

        const closeResult = {
          exitCode: code,
          signal,
          isSuccess: code === 0,
        }

        // 在 close 事件中获取主窗口（确保窗口已初始化）
        const mainWindow = getMainWindow(logger)

        if (mainWindow && !mainWindow.isDestroyed()) {
          // 检查 webContents 是否可用
          if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
            // 发送事件时包含工作目录信息，以便渲染进程区分不同的进程
            const eventData = { ...closeResult, workingDir: workingDirectory }
            logger.log('info', `[主进程] 准备发送 exe-closed 事件: exeName=${exeName}, workingDir=${workingDirectory}, exitCode=${code}, isSuccess=${eventData.isSuccess}`)
            logger.log('info', `[主进程] 主窗口信息: id=${mainWindow.id}, webContents.isDestroyed=${mainWindow.webContents.isDestroyed()}`)

            try {
              mainWindow.webContents.send('exe-closed', exeName, eventData)
              logger.log('info', `[主进程] exe-closed 事件已发送到窗口 ${mainWindow.id}`)
            }
            catch (sendError) {
              logger.log('error', `[主进程] 发送 exe-closed 事件时出错: ${sendError instanceof Error ? sendError.message : String(sendError)}`)
            }
          }
          else {
            logger.log('warn', `[主进程] 主窗口的 webContents 不可用: webContents=${mainWindow.webContents ? 'exists' : 'null'}, isDestroyed=${mainWindow.webContents?.isDestroyed()}`)
          }
        }
        else {
          logger.log('warn', `[主进程] 无法发送 exe-closed 事件: mainWindow=${mainWindow ? 'exists' : 'null'}, isDestroyed=${mainWindow?.isDestroyed()}`)
          // 尝试列出所有窗口用于调试
          const allWindows = BrowserWindow.getAllWindows()
          logger.log('info', `[主进程] 当前所有窗口数量: ${allWindows.length}`)
          allWindows.forEach((win, index) => {
            logger.log('info', `[主进程] 窗口[${index}]: id=${win.id}, isDestroyed=${win.isDestroyed()}, webContents.isDestroyed=${win.webContents.isDestroyed()}`)
          })
        }
        // 从运行进程列表中移除
        if (workingDirectory) {
          runningProcesses.delete(workingDirectory)
        }
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
        // 从运行进程列表中移除
        if (workingDirectory) {
          runningProcesses.delete(workingDirectory)
        }
      })
    })
  }

  else {
    // 如果指定了工作目录，检查该目录是否已有进程在运行
    if (workingDir && runningProcesses.has(workingDir)) {
      const existingProcess = runningProcesses.get(workingDir)
      if (existingProcess && !existingProcess.killed) {
        return Promise.resolve({
          status: 'already_running',
          reason: '该工作目录已有程序正在运行',
          pid: existingProcess.pid ?? null,
        })
      }
      // 如果进程已结束但未清理，移除它
      runningProcesses.delete(workingDir)
    }
    return new Promise((resolve) => {
      // 生产环境：定位 exe 所在目录（常见位置：exe 同级、resources、resources/unpacked）
      const exeDir = path.dirname(app.getPath('exe'))
      const candidatePaths = [
        path.join(exeDir, exeName),
        path.join(exeDir, 'resources', exeName),
        path.join(exeDir, 'resources', 'unpacked', exeName),
      ]
      const exePath = candidatePaths.find(p => existsSync(p))

      // 生产环境：启动前检查文件存在
      if (!exePath) {
        resolve({
          status: 'failed_to_start',
          reason: '文件不存在或路径错误',
          details: candidatePaths.join(' | '),
          pid: null,
        })
        return
      }

      // 生产环境：如果提供了工作目录，使用该目录作为执行目录
      // 这样程序输出的文件（如 Sep_power.dat）会输出到工作目录中
      const execOptions: { cwd?: string } = {}
      if (workingDir) {
        execOptions.cwd = workingDir
      }

      const logger: Logger = new Logger()
      if (workingDir) {
        logger.log('info', `将在工作目录中执行: ${workingDir}`)
      }
      logger.log('info', `正在启动外部程序: ${exePath}`)
      const child = execFile(exePath, execOptions, (error) => {
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

      // 如果指定了工作目录，记录进程
      if (workingDir) {
        runningProcesses.set(workingDir, child)
      }

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
        // 从运行进程列表中移除
        if (workingDir) {
          runningProcesses.delete(workingDir)
        }
      })

      child.on('close', async (code, signal) => {
        console.log(code, signal)

        // 生产环境：如果提供了工作目录，程序执行完成后，将输出文件从 exe 所在目录的 out 文件夹复制到目标目录
        if (workingDir) {
          try {
            // 获取 exe 所在目录
            const exeDirectory = path.dirname(exePath)
            const exeOutDir = path.join(exeDirectory, 'out')

            // 检查 exe 所在目录的 out 文件夹是否存在
            if (existsSync(exeOutDir)) {
              logger.log('info', `检查输出目录: ${exeOutDir}`)

              // 读取 out 目录中的所有文件
              const files = readdirSync(exeOutDir)
              const copiedFiles: string[] = []

              for (const file of files) {
                const sourcePath = path.join(exeOutDir, file)
                const targetPath = path.join(workingDir, file)

                // 只复制文件，跳过目录
                const stats = statSync(sourcePath)
                if (stats.isFile()) {
                  copyFileSync(sourcePath, targetPath)
                  copiedFiles.push(file)
                  logger.log('info', `已复制输出文件: ${file} -> ${targetPath}`)
                }
              }

              if (copiedFiles.length > 0) {
                logger.log('info', `成功复制 ${copiedFiles.length} 个输出文件到工作目录: ${workingDir}`)
              }
              else {
                logger.log('info', `输出目录 ${exeOutDir} 中未找到输出文件`)
              }
            }
            else {
              logger.log('info', `输出目录不存在: ${exeOutDir}`)
            }
          }
          catch (error) {
            logger.log('error', `复制输出文件时出错: ${error instanceof Error ? error.message : String(error)}`)
          }
        }

        const closeResult = {
          status: 'close',
          reason: '程序正常退出',
          exitCode: code,
          signal,
          isSuccess: code === 0,
        }

        // 在 close 事件中获取主窗口（确保窗口已初始化）
        const mainWindow = getMainWindow(logger)

        if (mainWindow && !mainWindow.isDestroyed()) {
          // 检查 webContents 是否可用
          if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
            logger.log('info', `程序 ${exePath} 已退出（PID: ${child.pid}）`)
            // 发送事件时包含工作目录信息，以便渲染进程区分不同的进程
            const eventData = { ...closeResult, workingDir }
            logger.log('info', `[主进程] 准备发送 exe-closed 事件: exeName=${exeName}, workingDir=${workingDir}, exitCode=${code}, isSuccess=${eventData.isSuccess}`)
            logger.log('info', `[主进程] 主窗口信息: id=${mainWindow.id}, webContents.isDestroyed=${mainWindow.webContents.isDestroyed()}`)

            try {
              mainWindow.webContents.send('exe-closed', exeName, eventData)
              logger.log('info', `[主进程] exe-closed 事件已发送到窗口 ${mainWindow.id}`)
            }
            catch (sendError) {
              logger.log('error', `[主进程] 发送 exe-closed 事件时出错: ${sendError instanceof Error ? sendError.message : String(sendError)}`)
            }
          }
          else {
            logger.log('warn', `[主进程] 主窗口的 webContents 不可用: webContents=${mainWindow.webContents ? 'exists' : 'null'}, isDestroyed=${mainWindow.webContents?.isDestroyed()}`)
          }
        }
        else {
          logger.log('warn', `[主进程] 无法发送 exe-closed 事件: mainWindow=${mainWindow ? 'exists' : 'null'}, isDestroyed=${mainWindow?.isDestroyed()}`)
          // 尝试列出所有窗口用于调试
          const allWindows = BrowserWindow.getAllWindows()
          logger.log('info', `[主进程] 当前所有窗口数量: ${allWindows.length}`)
          allWindows.forEach((win, index) => {
            logger.log('info', `[主进程] 窗口[${index}]: id=${win.id}, isDestroyed=${win.isDestroyed()}, webContents.isDestroyed=${win.webContents.isDestroyed()}`)
          })
        }
        // 从运行进程列表中移除
        if (workingDir) {
          runningProcesses.delete(workingDir)
        }
        resolve(closeResult)
      })
    })
  }
}

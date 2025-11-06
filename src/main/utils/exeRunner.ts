import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { Logger } from '@/main/app/handlers/LogerManager'

// 仅允许同时运行一个外部程序（模块级状态）
let currentExeProcess: ReturnType<typeof execFile> | null = null

/**
 * 调用同级目录下的exe程序并返回启动状态
 * @param {string} exeName - 目标exe文件名（如 "myTool.exe"）
 * @param {string} workingDir - 可选的工作目录，如果提供则在该目录中执行
 * @returns {Promise<object>} 启动状态结果
 */
export async function runExe(exeName: string, workingDir?: string) {
  const logger: Logger = new Logger()

  // 获取主窗口实例用于发送IPC消息
  const mainWindow = BrowserWindow.getAllWindows()[0]
  // 如果是开发环境则找到项目根目录的testFile文件夹
  if (!app.isPackaged) {
    // 确定工作目录和exe路径
    let workingDirectory: string | undefined
    let exePath: string

    if (workingDir) {
      // 如果指定了工作目录，在工作目录中执行
      workingDirectory = workingDir
      exePath = path.join(workingDir, exeName)
      // 如果工作目录中没有exe，尝试从testFile目录查找
      if (!existsSync(exePath)) {
        const testFileDir = path.join(__dirname, '../../testFile')
        const testFileExePath = path.join(testFileDir, exeName)
        if (existsSync(testFileExePath)) {
          exePath = testFileExePath
        }
      }
    }
    else {
      const testFileDir = path.join(__dirname, '../../testFile')
      exePath = path.join(testFileDir, exeName)
    }

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

      currentExeProcess = child
      child.on('close', (code, signal) => {
        console.log(code, signal)

        // 开发环境：如果提供了工作目录，程序执行完成后，尝试将输出文件从 exe 所在目录（及其 out 子目录）复制到目标工作目录
        try {
          if (workingDirectory) {
            const exeDirectory = path.dirname(exePath)
            const exeOutDir = path.join(exeDirectory, 'out')

            const copiedFiles: string[] = []

            // 优先复制 out 子目录中的文件
            if (existsSync(exeOutDir)) {
              logger.log('info', `开发环境复制输出：检查目录 ${exeOutDir}`)
              const files = readdirSync(exeOutDir)
              for (const file of files) {
                const sourcePath = path.join(exeOutDir, file)
                const stats = statSync(sourcePath)
                if (stats.isFile()) {
                  const targetPath = path.join(workingDirectory, file)
                  copyFileSync(sourcePath, targetPath)
                  copiedFiles.push(file)
                  logger.log('info', `开发环境已复制：${file} -> ${targetPath}`)
                }
              }
            }

            // 如果 out 子目录不存在或未复制到任何文件，则尝试直接复制 exe 根目录中的常见输出文件
            if (copiedFiles.length === 0) {
              const commonOutputs = ['Sep_power.dat', 'sep_power.dat', 'trace.dat']
              for (const file of commonOutputs) {
                const sourcePath = path.join(exeDirectory, file)
                if (existsSync(sourcePath)) {
                  const targetPath = path.join(workingDirectory, file)
                  copyFileSync(sourcePath, targetPath)
                  copiedFiles.push(file)
                  logger.log('info', `开发环境已复制常见输出：${file} -> ${targetPath}`)
                }
              }
            }

            if (copiedFiles.length > 0) {
              logger.log('info', `开发环境成功复制 ${copiedFiles.length} 个输出文件到工作目录: ${workingDirectory}`)
            }
            else {
              logger.log('info', '开发环境未发现可复制的输出文件（既无 out 目录，也未找到常见输出文件）')
            }
          }
        }
        catch (copyErr) {
          logger.log('error', `开发环境复制输出文件时出错: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`)
        }

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
        }

        // 通知渲染进程exe已关闭
        if (mainWindow && !mainWindow.isDestroyed()) {
          logger.log('info', `程序 ${exePath} 已退出（PID: ${child.pid}）`)
          mainWindow.webContents.send('exe-closed', exeName, closeResult)
        }
        currentExeProcess = null
        resolve(closeResult)
      })
    })
  }
}

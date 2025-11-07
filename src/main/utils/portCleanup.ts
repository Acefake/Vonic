import type { Logger } from '@/main/app/handlers/LogerManager'
import { exec } from 'node:child_process'
import process from 'node:process'
import util from 'node:util'

const execAsync = util.promisify(exec)

/**
 * 查找并终止占用指定端口的进程
 * @param port 端口号
 * @param logger 日志记录器（可选）
 */
export async function killProcessOnPort(port: number, logger?: Logger): Promise<void> {
  if (process.platform !== 'win32') {
    await logger?.log('info', `跳过端口 ${port} 清理，当前系统不是 Windows`)
    return
  }

  let pids: string[] = []
  try {
    const command = `netstat -aon | findstr ":${port}" | findstr "LISTENING"`
    const { stdout } = await execAsync(command)
    const lines = stdout.trim().split('\n').filter(line => line.trim())
    const pidSet = new Set<string>()

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && pid !== '0' && !Number.isNaN(Number(pid))) {
        pidSet.add(pid)
      }
    }
    pids = [...pidSet]
  }
  catch (error) {
    // 如果没有找到占用端口的进程，这是正常的，不需要报错
    if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
      // netstat 没有找到结果时返回 code 1，这是正常的
      return
    }
    await logger?.log('warn', `查找占用端口 ${port} 的进程时出错: ${error}`)
    return
  }

  if (pids.length === 0) {
    return
  }

  await logger?.log('info', `找到 ${pids.length} 个占用端口 ${port} 的进程，正在终止...`)

  for (const pid of pids) {
    try {
      await logger?.log('info', `终止占用端口 ${port} 的进程，PID: ${pid}`)
      await execAsync(`taskkill /F /PID ${pid}`)
      await logger?.log('info', `进程 ${pid} 已成功终止`)
    }
    catch (killError) {
      // 进程可能已经不存在了，这是正常的
      await logger?.log('warn', `终止进程 ${pid} 时出错 (可能已终止): ${killError}`)
    }
  }
}

/**
 * 批量杀死多个端口上的进程
 * @param ports 端口号数组
 * @param logger 日志记录器（可选）
 */
export async function killProcessesOnPorts(ports: number[], logger?: Logger): Promise<void> {
  await logger?.log('info', `开始清理 ${ports.length} 个端口上的进程...`)

  const promises = ports.map(port => killProcessOnPort(port, logger))
  await Promise.allSettled(promises)
  await logger?.log('info', '端口清理完成')
}

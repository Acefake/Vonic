import { join } from 'node:path'
import { app } from 'electron'
import log from 'electron-log'

log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs/main.log')

export const logger = log

export function setupLogger(): void {
  log.errorHandler.startCatching()
  logger.info('Logger initialized')
}

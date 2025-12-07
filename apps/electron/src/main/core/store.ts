import { ipcMain } from 'electron'
import Store from 'electron-store'
import { logger } from './logger'

/**
 * Electron Store instance for persistent key-value storage
 */
const store = new Store()

export function setupStore(): void {
  ipcMain.handle('store:get', (_, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('store:set', (_, key: string, value: any) => {
    store.set(key, value)
  })

  ipcMain.handle('store:delete', (_, key: string) => {
    store.delete(key)
  })

  ipcMain.handle('store:clear', () => {
    store.clear()
  })

  logger.info('Store initialized')
}

export default store

/**
 * Vue SFC 运行时加载器
 */

import type { Options } from 'vue3-sfc-loader'
import * as AntDesignIcons from '@ant-design/icons-vue'
import * as AntDesignVue from 'ant-design-vue'
import * as Vue from 'vue'
import { loadModule } from 'vue3-sfc-loader'

const cache = new Map<string, any>()

export async function loadPluginComponent(pluginPath: string, componentFile: string): Promise<any> {
  const basePath = pluginPath.replace(/\\/g, '/')
  const cacheKey = `${basePath}/${componentFile}`

  if (cache.has(cacheKey))
    return cache.get(cacheKey)

  const options: Options = {
    moduleCache: {
      'vue': Vue,
      'ant-design-vue': AntDesignVue,
      '@ant-design/icons-vue': AntDesignIcons,
    },
    async getFile(url: string) {
      // npm 模块应该在 moduleCache 中，不从文件系统加载
      if (url.startsWith('@') || (url.startsWith('vue') && !url.endsWith('.vue'))) {
        throw new Error(`Module "${url}" should be in moduleCache`)
      }
      // 构建完整文件路径
      const filePath = url.includes(':') || url.startsWith('/') ? url : `${basePath}/${url}`
      return await window.electron.ipcRenderer.invoke('plugin:readFile', filePath)
    },
    addStyle(text: string) {
      const style = document.createElement('style')
      style.textContent = text
      document.head.appendChild(style)
    },
  }

  try {
    const component = await loadModule(componentFile, options)
    const wrapped = Vue.markRaw(component)
    cache.set(cacheKey, wrapped)
    return wrapped
  }
  catch (e) {
    console.error('[sfcLoader]', e)
    return null
  }
}

export function clearComponentCache(): void {
  cache.clear()
}

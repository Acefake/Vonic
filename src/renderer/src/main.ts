import { createPinia } from 'pinia'
import persistedstate from 'pinia-plugin-persistedstate'

import { createApp } from 'vue'
import { getProductConfig } from '../../config/product.config'
import app from './app'
import App from './App.vue'
import router from './router'
import { createSyncPlugin } from './store/syncPlugin'
import './assets/main.css'
import 'ant-design-vue/dist/reset.css'

const pinia = createPinia()
pinia.use(createSyncPlugin())
pinia.use(persistedstate)

const vueApp = createApp(App)

vueApp.config.globalProperties.$app = app
// 将 app 设置为全局变量，以便在 Vue 文件中直接使用
;(globalThis as any).app = app

const productConfig = getProductConfig()
app.http.setBaseURL(productConfig.api.baseUrl)

// DOE 服务验证 - 延迟执行并添加重试机制
const doePort = productConfig.doe?.port || 25504
async function validateDoeService(): Promise<void> {
  const maxRetries = 10
  const retryDelay = 3000 // 3秒

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await app.http.get(`http://localhost:${doePort}/api/v1/integ/doe/validate`)
      app.logger.info(`DOE 服务验证成功: ${JSON.stringify(res)}`)
      return
    }
    catch (error) {
      app.logger.warn(`DOE 服务验证失败 (第${i + 1}次尝试): ${error}`)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  app.logger.error('DOE 服务验证最终失败，请检查服务状态')
}

// 延迟5秒后开始验证，给后端服务足够的启动时间
setTimeout(() => {
  validateDoeService()
}, 5000)

interface MainProcessLog {
  level: string
  message: string
  timestamp: string
}

window.electron.ipcRenderer.on('main-process-log', (_event, logEntry: MainProcessLog) => {
  const prefix = '[主进程]'
  const msg = `${prefix} ${logEntry.message}`

  switch (logEntry.level) {
    case 'error':
      console.error(msg)
      break
    case 'warn':
      console.warn(msg)
      break
    case 'info':
      console.log(msg)
      break
    default:
      console.log(msg)
  }
})

vueApp.use(router)
vueApp.use(pinia)

vueApp.mount('#app')

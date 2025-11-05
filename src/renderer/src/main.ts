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
// 使用配置中的 DOE 端口构建验证 URL
const doePort = productConfig.doe?.port || 25504
app.http.get(`http://localhost:${doePort}/api/v1/integ/doe/validate`).then((res) => {
  app.logger.info(JSON.stringify(res))
})

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

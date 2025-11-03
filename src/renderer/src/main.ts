import { createPinia } from 'pinia'
import persistedstate from 'pinia-plugin-persistedstate'

import { createApp } from 'vue'
import { getProductConfig } from '../../config/product.config'
import appAPI from './app'
import App from './App.vue'
import router from './router'
import { createSyncPlugin } from './store/syncPlugin'
import './assets/main.css'
import 'ant-design-vue/dist/reset.css'

const pinia = createPinia()
pinia.use(createSyncPlugin())
pinia.use(persistedstate)

const vueApp = createApp(App)

vueApp.config.globalProperties.$app = appAPI

const productConfig = getProductConfig()
appAPI.http.setBaseURL(productConfig.api.baseUrl)

// 监听主进程日志，输出到 DevTools 控制台
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

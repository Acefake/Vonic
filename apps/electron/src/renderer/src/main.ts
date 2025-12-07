import { createApp } from 'vue'
import { getProductConfig } from '../../config/product.config'
import app from './app'
import App from './App.vue'
import router from './router'
import { getIPCRenderer, isElectron } from './app/platform'

// 样式导入
import 'virtual:uno.css'
import 'ant-design-vue/dist/reset.css'
import './theme/variables.css'
import './assets/main.css'

const vueApp = createApp(App)

vueApp.config.globalProperties.$app = app
// 将 app 设置为全局变量，以便在 Vue 文件中直接使用
;(globalThis as any).app = app

const productConfig = getProductConfig()
console.log(`当前产品: ${productConfig.name} (${productConfig.version})`)
console.log(`运行环境: ${isElectron ? 'Electron' : 'Web'}`)

interface MainProcessLog {
  level: string
  message: string
  timestamp: string
}

// 仅在 Electron 环境下监听主进程日志
if (isElectron) {
  getIPCRenderer().on('log', (_event: unknown, ...args: unknown[]) => {
    const logEntry = args[0] as MainProcessLog
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
}

vueApp.use(router)

vueApp.mount('#app')

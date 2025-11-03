import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'
import { productConfig } from '../../../config/product.config'

/**
 * 扩展路由元信息类型
 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    windowName?: string
    icon?: string // 菜单图标
    hidden?: boolean // 是否在菜单中隐藏
    order?: number // 菜单排序
    feature?: string // 功能标识，对应产品配置中的 features 键名
    loading?: boolean // 是否是加载窗口
  }
}

/**
 * 路由配置
 * 使用 Hash 模式，避免 Electron 中的路径问题
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/Demo',
    name: 'Demo',
    component: () => import('../views/demo/index.vue'),
    meta: {
      title: 'Demo',
      icon: 'CodeOutlined',
      order: 0,
    },
  },
  {
    path: '/',
    name: 'InitialDesign',
    component: () => import('../views/InitialDesign/index.vue'),
    meta: {
      title: '方案设计',
      icon: 'CompassOutlined',
      order: 1,
      feature: 'initialDesign', // 对应产品配置中的功能开关
    },
  },
  {
    path: '/scheme-optimization',
    name: 'SchemeOptimization',
    component: () => import('../views/SchemeOptimization/index.vue'),
    meta: {
      title: '方案优化',
      icon: 'ThunderboltOutlined',
      order: 2,
      feature: 'schemeOptimization',
    },
  },
  {
    path: '/multi-scheme',
    name: 'MultiScheme',
    component: () => import('../views/MultiScheme/index.vue'),
    meta: {
      title: '多方案设计',
      icon: 'AppstoreOutlined',
      order: 3,
      feature: 'multiScheme',
    },
  },
  {
    path: '/experimental-data',
    name: 'ExperimentalData',
    component: () => import('../views/ExperimentalData/index.vue'),
    meta: {
      title: '试验数据统计',
      icon: 'BarChartOutlined',
      order: 4,
      feature: 'experimentalData',
    },
  },
  {
    path: '/data-comparison',
    name: 'DataComparison',
    component: () => import('../views/DataComparison/index.vue'),
    meta: {
      title: '数据对比',
      icon: 'FundOutlined',
      order: 5,
      feature: 'dataComparison',
    },
  },
  {
    path: '/loading',
    name: 'Loading',
    component: () => import('../components/Loding/index.vue'),
    meta: {
      title: '加载中...',
      hidden: true,
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings/index.vue'),
    meta: {
      title: '设置',
      icon: 'SettingOutlined',
      order: 100,
      hidden: true,
    },
  },
  {
    path: '/embedded',
    name: 'Embedded',
    component: () => import('../views/Embedded/index.vue'),
    meta: {
      title: '嵌入窗口',
      hidden: true,
    },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局前置守卫
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  // 检查功能权限
  if (to.meta.feature) {
    const featureName = to.meta.feature as string
    const isFeatureEnabled = productConfig.features[featureName] === true

    if (!isFeatureEnabled) {
      console.warn(`功能 "${featureName}" 未启用，无法访问路由: ${to.path}`)

      // 查找第一个启用的路由
      const enabledRoute = routes.find((route) => {
        if (!route.meta?.feature)
          return true
        return productConfig.features[route.meta.feature] === true
      })

      if (enabledRoute) {
        // 重定向到第一个启用的路由
        next(enabledRoute.path)
      }
      else {
        // 如果没有启用的路由，显示错误提示
        console.error('当前产品没有启用任何功能')
        next(false)
      }
      return
    }
  }

  next()
})

// 全局后置钩子
router.afterEach((to) => {
  // 页面切换后的处理
  if (import.meta.env.DEV) {
    console.log('路由切换到:', to.path)
  }
})

export default router

import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'
import { setRouter } from '@/renderer/plugins/plugin-ui'

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
    noLayout?: boolean // 是否不使用主布局
  }
}

/**
 * 路由配置
 * 使用 Hash 模式，避免 Electron 中的路径问题
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('../views/welcome/index.vue'),
    meta: {
      title: '欢迎',
      hidden: true, // Hidden from sidebar menu
    },
  },
  {
    path: '/loading',
    name: 'Loading',
    component: () => import('../components/Loading/index.vue'),
    meta: {
      title: '加载中...',
      hidden: true,
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/dashboard/index.vue'),
    meta: {
      title: '仿真仪表盘',
      windowName: 'dashboard',
    },
  },
  {
    path: '/toolbar',
    name: 'Toolbar',
    component: () => import('../views/toolbar/index.vue'),
    meta: {
      title: '浮动工具栏',
      windowName: 'toolbar',
      hidden: true,
    },
  },
  // 插件通信演示
  {
    path: '/plugin-demo',
    name: 'PluginDemo',
    component: () => import('../views/plugin-demo/index.vue'),
    meta: {
      title: '插件演示',
      icon: 'experiment',
    },
  },
  // 扩展插件演示
  {
    path: '/expands',
    name: 'Expands',
    component: () => import('../views/expands/index.vue'),
    meta: {
      title: '扩展插件',
      icon: 'appstore',
    },
  },
  // 插件视图路由 - 支持插件注册的页面和子窗口
  {
    path: '/plugin-view/:id',
    name: 'PluginView',
    component: () => import('../components/PluginView/index.vue'),
    meta: {
      title: '插件视图',
      hidden: true,
      // noLayout: true, // 注释掉以保留主布局（左侧边栏）
    },
  },
  // 插件详情页
  {
    path: '/plugin-detail/:id',
    name: 'PluginDetail',
    component: () => import('../components/PluginView/plugin-detail/index.vue'),
    meta: {
      title: '插件详情',
      hidden: true,
    },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 设置路由实例供插件使用
setRouter(router)

// 全局前置守卫
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  next()
})

// 全局后置钩子
router.afterEach((_to) => {
  // 页面切换后的处理
})

export default router

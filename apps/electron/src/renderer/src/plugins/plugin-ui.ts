import type { Component } from 'vue'
import type { Router } from 'vue-router'
import { Input, message, Modal } from 'ant-design-vue'
import { h, ref, shallowRef } from 'vue'
import { getIPCRenderer, isElectron } from '../app/platform'

// 插件注册的菜单项
export interface PluginMenuItem {
  id: string
  label: string
  icon?: string
  command?: string
}

// 插件视图配置
export interface PluginViewConfig {
  id: string
  title: string
  icon?: string
  type: 'page' | 'modal' | 'window'
  pluginId: string
}

// 面板类型
export type PanelType = 'menu' | 'component' | 'builtin'

// 面板配置
export interface PanelConfig {
  id: string // 面板 ID（对应活动项 ID）
  type: PanelType // 面板类型
  title: string // 面板标题
  pluginId?: string // 插件 ID（内置面板无此项）
  // menu 类型
  menuItems?: PluginMenuItem[]
  // component 类型 - Vue SFC 路径
  componentPath?: string
  // builtin 类型 - 内置组件名
  builtinComponent?: string
  // 头部操作按钮
  headerActions?: {
    icon: string
    title: string
    command: string
  }[]
}

// 存储所有插件的菜单
export const pluginMenus = ref<Map<string, PluginMenuItem[]>>(new Map())

// 存储所有插件的视图
export const pluginViews = ref<Map<string, PluginViewConfig>>(new Map())

// 存储所有面板配置
export const panelConfigs = ref<Map<string, PanelConfig>>(new Map())

// 存储动态加载的面板组件
export const panelComponents = shallowRef<Map<string, Component>>(new Map())

// 路由实例引用
let routerInstance: Router | null = null

// 是否已初始化
let isInitialized = false

/** 设置路由实例 */
export function setRouter(router: Router): void {
  routerInstance = router
}

/**
 * 执行插件命令
 */
export async function executePluginCommand(commandId: string): Promise<unknown> {
  if (!isElectron) {
    console.warn(`[Web] Plugin command not available: ${commandId}`)
    return undefined
  }
  try {
    return await getIPCRenderer().invoke(`command:${commandId}`)
  }
  catch (error) {
    console.error(`Failed to execute command ${commandId}:`, error)
    message.error(`命令执行失败: ${commandId}`)
    return undefined
  }
}

/**
 * 初始化插件 UI 处理器
 * 监听主进程发送的 UI 消息并在渲染进程中显示
 */
export function initPluginUIHandler(): void {
  // 防止重复初始化
  if (isInitialized)
    return
  isInitialized = true

  // Web 环境下跳过 IPC 监听
  if (!isElectron) {
    return
  }

  const ipc = getIPCRenderer()

  // 消息通知
  ipc.on('plugin:ui:message', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { type: string, content: string }
    const msgFn = message[data.type as keyof typeof message]
    if (typeof msgFn === 'function') {
      (msgFn as (content: string) => void)(data.content)
    }
  })

  // 注册菜单
  ipc.on('plugin:menu:register', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { pluginId: string, items: PluginMenuItem[] }
    pluginMenus.value.set(data.pluginId, data.items)
  })

  // 注册视图
  ipc.on('plugin:view:register', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { pluginId: string, view: PluginViewConfig }
    pluginViews.value.set(data.view.id, { ...data.view, pluginId: data.pluginId })
  })

  // 注册面板
  ipc.on('plugin:panel:register', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { pluginId: string, panel: Omit<PanelConfig, 'pluginId'> }
    const config: PanelConfig = { ...data.panel, pluginId: data.pluginId }
    panelConfigs.value.set(data.panel.id, config)
  })

  // 导航到视图
  ipc.on('plugin:view:navigate', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { viewId: string, data?: unknown }
    if (routerInstance) {
      const query = data.data ? { data: encodeURIComponent(JSON.stringify(data.data)) } : {}
      routerInstance.push({ path: `/plugin-view/${data.viewId}`, query })
    }
  })

  // 打开模态框视图
  ipc.on('plugin:view:open-modal', async (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { viewId: string, data?: unknown }
    const view = pluginViews.value.get(data.viewId)
    if (!view)
      return

    try {
      const pluginId = data.viewId.split('.')[0]
      const renderData = await ipc.invoke(
        `plugin:${pluginId}:render`,
        data.viewId,
        data.data,
      ) as { html?: string } | null

      Modal.info({
        title: view.title,
        content: renderData?.html ? h('div', { innerHTML: renderData.html }) : '加载中...',
        width: 600,
        centered: true,
      })
    }
    catch {
      Modal.info({ title: view.title, content: '视图加载失败', centered: true })
    }
  })

  // 确认对话框
  ipc.on('plugin:ui:confirm', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { title: string, content: string, channel: string }
    Modal.confirm({
      title: data.title,
      content: data.content,
      centered: true,
      onOk: () => ipc.invoke(data.channel, true),
      onCancel: () => ipc.invoke(data.channel, false),
    })
  })

  // 插件停用时清理
  ipc.on('plugin:dispose', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { pluginId: string }
    pluginMenus.value.delete(data.pluginId)
    // 清理该插件的视图
    for (const [id, view] of pluginViews.value.entries()) {
      if (view.pluginId === data.pluginId) {
        pluginViews.value.delete(id)
      }
    }
    // 清理该插件的面板
    for (const [id, panel] of panelConfigs.value.entries()) {
      if (panel.pluginId === data.pluginId) {
        panelConfigs.value.delete(id)
        panelComponents.value.delete(id)
      }
    }
  })

  // 模态框
  ipc.on('plugin:ui:modal', (_: unknown, ...args: unknown[]) => {
    const options = args[0] as { title: string, content: string, width?: number }
    Modal.info({
      title: options.title,
      content: options.content,
      width: options.width || 400,
    })
  })

  // 输入框
  ipc.on('plugin:ui:input', (_: unknown, ...args: unknown[]) => {
    const data = args[0] as { title: string, placeholder?: string, channel: string }
    let inputValue = ''

    Modal.confirm({
      title: data.title,
      content: () => h(Input, {
        placeholder: data.placeholder,
        onChange: (e: Event) => { inputValue = (e.target as HTMLInputElement).value },
      }),
      onOk: () => {
        ipc.invoke(data.channel, inputValue)
      },
      onCancel: () => {
        ipc.invoke(data.channel, null)
      },
    })
  })

  // 启动时同步已激活插件的 UI 状态
  syncPluginUI()
}

/**
 * 同步插件 UI 状态
 * 在渲染进程启动时从主进程获取已激活插件的菜单和面板
 */
export async function syncPluginUI(): Promise<void> {
  if (!isElectron) {
    console.log('[PluginUI] Running in Web mode, skipping sync')
    return
  }
  try {
    const result = await getIPCRenderer().invoke('plugin:sync-ui') as {
      menus: { pluginId: string, items: any[] }[]
      panels: { pluginId: string, panel: any }[]
    }

    // 同步菜单
    for (const { pluginId, items } of result.menus) {
      pluginMenus.value.set(pluginId, items)
      console.log('[PluginUI] Synced menu:', pluginId, items.length, 'items')
    }

    // 同步面板
    for (const { pluginId, panel } of result.panels) {
      panelConfigs.value.set(panel.id, { ...panel, pluginId })
      console.log('[PluginUI] Synced panel:', panel.id)
    }

    console.log('[PluginUI] UI sync completed')
  }
  catch (error) {
    console.error('[PluginUI] Failed to sync UI:', error)
  }
}

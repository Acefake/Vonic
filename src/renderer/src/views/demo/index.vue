<script setup lang="ts">
import { CompassOutlined } from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import { useStore } from '../../store'
import { useLogStore } from '../../store/logStore'

const store = useStore()

const { count, message, doubleCount } = storeToRefs(store)
const { increment } = store
const logStore = useLogStore()
// 测试日志 API
function testLogger(): void {
  logStore.info('这是一条信息日志，这是一条信息日志这是一条信息日志这是一条信息日志这是一条信息日志这是一条信息日志这是一条信息日志这是一条信息日志')
}

// 测试对话框 API
async function testDialog(): Promise<void> {
  const confirmed = await app.dialog.confirm({
    title: '确认操作',
    content: '你确定要执行此操作吗？',
  })
  if (confirmed) {
    app.message.success('你点击了确定')
  }
  else {
    app.message.info('你点击了取消')
  }
}

// 测试通知 API
function testNotification(): void {
  app.notification.success({
    message: '操作成功',
    description: '这是一条成功通知消息',
  })
  setTimeout(() => {
    app.notification.info({
      message: '提示信息',
      description: '这是一条信息通知',
    })
  }, 1000)
}

// 测试剪贴板 API
async function testClipboard(): Promise<void> {
  await app.clipboard.copy('Hello from Tianjin App!', '已复制到剪贴板')
  const text = await app.clipboard.readText()
  app.logger.info('剪贴板内容:', text)
}

// 测试文件 API
async function testFileSelect(): Promise<void> {
  const files = await app.file.selectFile({
    title: '选择文件',
    multiple: true,
    filters: [
      { name: '文本文件', extensions: ['txt', 'md'] },
    ],
  })
  if (files) {
    app.message.success(`选择了 ${files.length} 个文件`)
    app.logger.info('选择的文件:', files)
  }
}

// 测试系统信息 API
async function testSystemInfo(): Promise<void> {
  const appInfo = await app.system.getAppInfo()
  const sysInfo = await app.system.getSystemInfo()

  app.dialog.info({
    title: '系统信息',
    content: `应用: ${appInfo.name} v${appInfo.version}
    平台: ${appInfo.platform} (${appInfo.arch})
    Electron: ${appInfo.electronVersion}
    CPU: ${sysInfo.cpuCount} 核
    内存: ${(sysInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
  })
}

// 测试事件总线 API
function testEventBus(): void {
  // 订阅事件
  const unsubscribe = app.eventBus.on<string>('test-event', (data) => {
    app.message.info(`收到事件: ${data}`)
  })

  // 发布事件
  app.eventBus.emit('test-event', 'Hello EventBus!')

  // 3 秒后取消订阅
  setTimeout(() => {
    unsubscribe()
    app.message.success('已取消事件订阅')
  }, 3000)
}

// 测试 HTTP API
async function testHttp(): Promise<void> {
  try {
    // 发送请求
    const response = await app.http.get<{ message: string }>('/hello')
    console.log(response, 'response')
    app.notification.success({
      message: 'HTTP 请求成功',
      description: `消息: ${response}`,
    })
    app.logger.info('HTTP 响应:', response)
  }
  catch (error) {
    app.message.error('HTTP 请求失败')
    app.logger.error('HTTP 请求失败:', error)
  }
}

// 测试性能监控
async function testPerformance(): Promise<void> {
  await app.logger.performance('测试操作', async () => {
    // 模拟耗时操作
    await new Promise(resolve => setTimeout(resolve, 1000))
  })
  app.message.success('性能测试完成，查看控制台')
}

// ===== Debug 调试功能 =====

// 打开开发者工具
function openDevTools(): void {
  app.debug.openDevTools({ mode: 'right' })
  app.message.success('开发者工具已打开')
}

// 显示性能信息
async function showPerformanceInfo(): Promise<void> {
  try {
    const perf = await app.debug.getPerformance()
    const memory = await app.debug.getMemoryUsage()

    app.dialog.info({
      title: '性能信息',
      content: `
FPS: ${perf.fps}
渲染时间: ${perf.renderTime.toFixed(2)} ms
脚本时间: ${perf.scriptTime.toFixed(2)} ms
布局时间: ${perf.layoutTime.toFixed(2)} ms

内存使用: ${(memory.used / 1024 / 1024).toFixed(2)} MB
JS 堆使用: ${(memory.jsHeapSize / 1024 / 1024).toFixed(2)} MB
JS 堆限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB
系统可用内存: ${(memory.availableMemory / 1024 / 1024).toFixed(2)} MB
      `.trim(),
    })
  }
  catch (error) {
    app.logger.error('获取性能信息失败', error)
    app.message.error('获取性能信息失败')
  }
}

// 导出日志
async function exportLogs(): Promise<void> {
  try {
    const path = await app.debug.exportLogs()
    if (path) {
      app.notification.success({
        message: '日志导出成功',
        description: `日志已导出到: ${path}`,
      })
    }
    else {
      app.message.info('已取消导出')
    }
  }
  catch (error) {
    app.logger.error('导出日志失败', error)
    app.message.error('导出日志失败')
  }
}

// 打开日志目录
async function openLogDirectory(): Promise<void> {
  try {
    await app.debug.openLogDirectory()
    app.message.success('已在文件管理器中打开日志目录')
  }
  catch (error) {
    app.logger.error('打开日志目录失败', error)
    app.message.error('打开日志目录失败')
  }
}

// 清除缓存
async function clearCache(): Promise<void> {
  const confirmed = await app.dialog.confirm({
    title: '确认清除缓存',
    content: '这将清除所有应用缓存和本地存储，是否继续？',
  })

  if (confirmed) {
    try {
      await app.debug.clearCache()
      await app.debug.clearStorage()
      app.notification.success({
        message: '缓存已清除',
        description: '建议重启应用以使更改生效',
      })
    }
    catch (error) {
      app.logger.error('清除缓存失败', error)
      app.message.error('清除缓存失败')
    }
  }
}

// 显示应用信息
async function showAppInfo(): Promise<void> {
  await app.debug.showAppInfo()
  app.message.success('应用信息已输出到控制台')
}

// 重新加载
function reloadApp(): void {
  app.debug.reload()
}

function openLoadingWindow(): void {
  app.window.loading.open({
    data: {
      title: '加载中...',
    },
  })
  setTimeout(() => {
    app.window.loading.close()
  }, 2000)
}

/**
 * 打开嵌入窗口 - 基础示例
 */
async function openEmbeddedWindow(): Promise<void> {
  try {
    // 使用 await 会自动等待窗口关闭并返回结果（底层已处理）
    const result = await app.window.embedded.open({
      data: {
        title: '测试数据',
        message: '这2222',
        timestamp: Date.now(),
      },
    })
    app.message.success(`嵌入窗口返回结果: ${JSON.stringify(result)}`)
    app.logger.info('嵌入窗口返回结果:', result)
  }
  catch (error) {
    app.message.error('嵌入窗口打开失败')
    app.logger.error('嵌入窗口打开失败:', error)
  }
}

/**
 * 打开嵌入窗口 - 完整传参示例
 * 演示如何传递复杂的数据结构和查询参数
 */
async function openEmbeddedWindowWithParams(): Promise<void> {
  try {
    // 定义要传递的数据
    const windowData = {
      userId: '22222222',
      userName: '张三',
      operation: 'edit',
      config: {
        theme: 'dark22222',
        language: 'zh-CN',
        autoSave: true,
      },
      items: [
        { id: 1, name: '项目A', status: 'active' },
        { id: 2, name: '项目B', status: 'pending' },
      ],
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        source: 'main-window',
      },
    }

    app.logger.info('打开嵌入窗口，传递参数:', { data: windowData })

    // 使用 await 会自动等待窗口关闭并返回结果（底层已处理）
    const result = await app.window.embedded.open({
      data: windowData,
    })

    // 处理返回结果
    if (result) {
      app.notification.success({
        message: '嵌入窗口操作完成',
        description: `返回结果: ${JSON.stringify(result)}`,
        duration: 5,
      })
      app.logger.info('嵌入窗口返回结果:', result)
    }
    else {
      app.message.info('嵌入窗口已关闭，未返回结果')
    }
  }
  catch (error) {
    app.message.error('嵌入窗口打开失败')
    app.logger.error('嵌入窗口打开失败:', error)
  }
}

/**
 * 打开设置窗口
 */
async function openSettingsWindow(): Promise<void> {
  // 设置窗口通常不需要等待结果
  await app.window.settings.open()
  app.message.success('已打开设置窗口')
}
</script>

<template>
  <div class="dev-container">
    <a-result status="info" title="方案设计">
      <template #icon>
        <CompassOutlined style="color: #1890ff" />
      </template>
      <template #subTitle>
        <a-space direction="vertical" :size="16">
          <a-typography-text type="secondary">
            该模块正在开发中，敬请期待... {{ count }} {{ message }} {{ doubleCount }}
          </a-typography-text>
          <a-tag color="processing" @click="increment">
            开发中
          </a-tag>
        </a-space>
      </template>

      <template #extra>
        <div class="api-test-section">
          <a-divider>App API 功能测试</a-divider>

          <a-space direction="vertical" :size="12" style="width: 100%">
            <a-space wrap :size="8">
              <a-button type="primary" @click="testLogger">
                测试日志
              </a-button>
              <a-button type="primary" @click="testDialog">
                测试对话框
              </a-button>
              <a-button type="primary" @click="testNotification">
                测试通知
              </a-button>
              <a-button type="primary" @click="testClipboard">
                测试剪贴板
              </a-button>
              <a-button type="primary" @click="openLoadingWindow">
                测试加载窗口
              </a-button>
              <a-button type="primary" @click="openEmbeddedWindow">
                打开嵌入窗口（基础）
              </a-button>
              <a-button type="primary" @click="openEmbeddedWindowWithParams">
                打开嵌入窗口（完整示例）
              </a-button>
              <a-button type="primary" @click="openSettingsWindow">
                打开设置窗口
              </a-button>
            </a-space>

            <a-space wrap :size="8">
              <a-button @click="testFileSelect">
                测试文件选择
              </a-button>
              <a-button @click="testSystemInfo">
                测试系统信息
              </a-button>
              <a-button @click="testEventBus">
                测试事件总线
              </a-button>
              <a-button @click="testHttp">
                测试 HTTP 请求
              </a-button>
            </a-space>

            <a-space wrap :size="8">
              <a-button @click="testPerformance">
                测试性能监控
              </a-button>
            </a-space>
          </a-space>

          <a-divider>Debug 调试工具</a-divider>

          <a-space direction="vertical" :size="12" style="width: 100%">
            <a-space wrap :size="8">
              <a-button type="dashed" @click="openDevTools">
                <template #icon>
                  🛠️
                </template>
                打开开发者工具
              </a-button>
              <a-button type="dashed" @click="showPerformanceInfo">
                <template #icon>
                  📊
                </template>
                性能信息
              </a-button>
              <a-button type="dashed" @click="showAppInfo">
                <template #icon>
                  ℹ️
                </template>
                应用信息
              </a-button>
            </a-space>

            <a-space wrap :size="8">
              <a-button type="dashed" @click="openLogDirectory">
                <template #icon>
                  📁
                </template>
                打开日志目录
              </a-button>
              <a-button type="dashed" @click="exportLogs">
                <template #icon>
                  📤
                </template>
                导出日志
              </a-button>
            </a-space>

            <a-space wrap :size="8">
              <a-button type="dashed" danger @click="clearCache">
                <template #icon>
                  🗑️
                </template>
                清除缓存
              </a-button>
              <a-button type="dashed" @click="reloadApp">
                <template #icon>
                  🔄
                </template>
                重新加载
              </a-button>
            </a-space>
          </a-space>
        </div>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.dev-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 100px);
  padding: 24px;
}

.api-test-section {
  width: 100%;
  max-width: 800px;
  margin: 24px auto;
}
</style>

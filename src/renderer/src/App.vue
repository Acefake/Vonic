<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from './components/Layout/index.vue'
import { initPluginUIHandler } from './plugins/pluginUI'
import { getAntdThemeConfig } from './theme'

// 使用 computed 让主题配置响应式更新
const themeConfig = computed(() => getAntdThemeConfig())
const router = useRouter()
const route = useRoute()

const windowConfig = ref<{ noLayout: boolean } | null>(null)
const isReady = ref(false)

onMounted(async () => {
  // 初始化插件 UI 处理器
  initPluginUIHandler()

  const [config] = await Promise.all([
    app.window.current.getConfig(),
    router.isReady(),
  ])
  windowConfig.value = config ? { noLayout: config.noLayout } : { noLayout: false }
  await nextTick()
  isReady.value = true
})

/**
 * 根据窗口配置或路由元信息判断是否需要显示布局组件
 */
const showLayout = computed(() => {
  // 路由元信息优先
  if (route.meta?.noLayout) {
    return false
  }
  if (!windowConfig.value) {
    return true
  }
  return !windowConfig.value.noLayout
})
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <a-app>
      <template v-if="isReady">
        <Layout v-if="showLayout">
          <router-view />
        </Layout>
        <router-view v-else />
      </template>
    </a-app>
  </a-config-provider>
</template>

<style>
#app {
  height: 100vh;
  overflow: hidden;
}
</style>

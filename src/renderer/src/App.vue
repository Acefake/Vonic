<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApp } from './app/useApp'
import Layout from './components/Layout/index.vue'
import { getThemeConfig } from './theme'

const themeConfig = getThemeConfig()
const router = useRouter()
const app = useApp()

const windowConfig = ref<{ noLayout: boolean } | null>(null)
const isReady = ref(false)

onMounted(async () => {
  const [config] = await Promise.all([
    app.window.current.getConfig(),
    router.isReady(),
  ])
  windowConfig.value = config ? { noLayout: config.noLayout } : { noLayout: false }
  await nextTick()
  isReady.value = true
})

/**
 * 根据窗口配置判断是否需要显示布局组件
 */
const showLayout = computed(() => {
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

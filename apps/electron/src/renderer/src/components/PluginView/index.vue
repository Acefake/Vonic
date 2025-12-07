<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { pluginViews } from '@/renderer/plugins/plugin-ui'
import { loadPluginComponent } from '@/renderer/plugins/sfc-loader'

const route = useRoute()
const viewId = computed(() => route.params.id as string || '')
const viewConfig = computed(() => pluginViews.value.get(viewId.value))

// 从 URL 解析传入数据
const routeData = computed(() => {
  const dataStr = route.query.data as string
  if (!dataStr)
    return null
  try {
    return JSON.parse(decodeURIComponent(dataStr))
  }
  catch {
    return null
  }
})

const renderData = ref<any>(null)
const loading = ref(false)
const dynamicComponent = shallowRef<any>(null)
const error = ref('')

async function loadViewData() {
  if (!viewId.value)
    return

  loading.value = true
  dynamicComponent.value = null
  error.value = ''

  try {
    const pluginId = viewId.value.split('.')[0]
    const pluginPath = await window.electron.ipcRenderer.invoke('plugin:getPath', pluginId)

    if (!pluginPath) {
      error.value = '插件未找到'
      return
    }

    // 获取渲染配置
    renderData.value = await window.electron.ipcRenderer.invoke(
      `plugin:${pluginId}:render`,
      viewId.value,
      routeData.value,
    )

    // 加载 Vue 组件
    if (renderData.value?.vue) {
      const component = await loadPluginComponent(pluginPath, renderData.value.vue)
      if (component)
        dynamicComponent.value = component
      else error.value = 'Vue 组件加载失败'
    }
  }
  catch (e: any) {
    error.value = e.message || '加载失败'
  }
  finally {
    loading.value = false
  }
}

onMounted(loadViewData)
watch(viewId, loadViewData)
</script>

<template>
  <div class="absolute inset-0 flex flex-col bg-gray-100 overflow-auto">
    <a-spin :spinning="loading" class="flex-1 flex flex-col">
      <!-- Vue 组件 -->
      <div v-if="dynamicComponent" class="flex-1 bg-white p-6 overflow-auto">
        <component :is="dynamicComponent" v-bind="renderData?.props || {}" />
      </div>

      <!-- HTML 内容 -->
      <div v-else-if="renderData?.html" class="flex-1 bg-white p-6 overflow-auto" v-html="renderData.html" />

      <!-- 错误或空状态 -->
      <div v-else class="flex-1 flex flex-col items-center justify-center bg-white">
        <h2 class="text-gray-800 mb-2">
          {{ viewConfig?.title || '插件视图' }}
        </h2>
        <p class="text-blue-500 font-mono">
          {{ viewId }}
        </p>
        <p v-if="error" class="text-red-500 mt-3">
          {{ error }}
        </p>
        <p v-else class="text-gray-400 mt-3">
          等待插件提供内容...
        </p>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
:deep(.ant-spin-nested-loading),
:deep(.ant-spin-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>

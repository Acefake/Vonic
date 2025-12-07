<script setup lang="ts">
import { marked } from 'marked'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePluginManager } from '@/renderer/hooks/use-plugin-manager'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const route = useRoute()
const { plugins, getPluginReadme } = usePluginManager()

const pluginId = computed(() => route.params.id as string)
const plugin = computed(() => plugins.value.find(p => p.id === pluginId.value))
const readmeContent = ref<string>('')
const readmeHtml = computed(() => {
  if (!readmeContent.value) return ''
  return marked(readmeContent.value) as string
})
const loading = ref(false)

async function loadReadme(): Promise<void> {
  if (!pluginId.value) return
  loading.value = true
  try {
    const content = await getPluginReadme(pluginId.value)
    readmeContent.value = content || ''
  }
  finally {
    loading.value = false
  }
}

watch(pluginId, () => {
  loadReadme()
}, { immediate: true })
</script>

<template>
  <div class="plugin-detail-page">
    <template v-if="plugin">
      <div class="detail-header">
        <h1 class="text-24px font-600 text-text-1 m-0">{{ plugin.name }}</h1>
        <div class="flex items-center gap-3 mt-2">
          <span class="text-14px text-text-3">v{{ plugin.version }}</span>
          <a-tag v-if="plugin.isDev" color="orange">开发模式</a-tag>
          <a-tag v-else-if="plugin.isExternal" color="blue">外部插件</a-tag>
          <a-tag v-if="plugin.enabled" color="green">已启用</a-tag>
          <a-tag v-else color="default">已禁用</a-tag>
        </div>
        <p v-if="plugin.description" class="text-14px text-text-2 mt-3 mb-0">
          {{ plugin.description }}
        </p>
        <p v-if="plugin.author" class="text-13px text-text-3 mt-2 mb-0">
          作者: {{ plugin.author }}
        </p>
      </div>
      <a-divider />
      <div class="detail-content">
        <h2 class="text-18px font-500 text-text-1 mb-4">README</h2>
        <a-spin v-if="loading" />
        <template v-else-if="readmeHtml">
          <div class="readme-content" v-html="readmeHtml" />
        </template>
        <a-empty v-else description="该插件暂无 README 文档" />
      </div>
    </template>
    <div v-else class="flex items-center justify-center h-full">
      <a-empty description="插件不存在" />
    </div>
  </div>
</template>

<style scoped>
.plugin-detail-page {
  padding: 24px 32px;
  max-width: 900px;
}
.detail-header {
  margin-bottom: 16px;
}
.detail-content {
  padding-bottom: 32px;
}
.readme-content {
  padding: 16px 20px;
  background: var(--bg-container);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
}
.readme-content :deep(h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-1);
}
.readme-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 24px 0 12px;
  color: var(--text-1);
}
.readme-content :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 8px;
  color: var(--text-1);
}
.readme-content :deep(p) {
  margin: 12px 0;
}
.readme-content :deep(ul),
.readme-content :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}
.readme-content :deep(li) {
  margin: 6px 0;
}
.readme-content :deep(code) {
  background: var(--hover-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}
.readme-content :deep(pre) {
  background: var(--hover-bg);
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 12px 0;
}
.readme-content :deep(pre code) {
  background: none;
  padding: 0;
}
.readme-content :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 4px solid var(--primary-color);
  background: var(--hover-bg);
  color: var(--text-3);
}
.readme-content :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
}
.readme-content :deep(a:hover) {
  text-decoration: underline;
}
.readme-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}
.readme-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}
.readme-content :deep(th),
.readme-content :deep(td) {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
}
.readme-content :deep(th) {
  background: var(--hover-bg);
  font-weight: 600;
}
</style>

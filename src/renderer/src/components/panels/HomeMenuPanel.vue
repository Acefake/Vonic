<script setup lang="ts">
import type { Component } from 'vue'
import * as Icons from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

interface MenuItem {
  key: string
  title: string
  icon?: string
  path: string
}

const menuItems = computed<MenuItem[]>(() => {
  return router.getRoutes()
    .filter(r => !r.meta.hidden)
    .sort((a, b) => (a.meta.order as number || 999) - (b.meta.order as number || 999))
    .map(r => ({
      key: r.path,
      title: (r.meta.title || r.name) as string,
      icon: r.meta.icon as string,
      path: r.path,
    }))
})

const selectedKeys = computed(() => [route.path])

function getIconComponent(iconName?: string): Component | undefined {
  if (!iconName)
    return undefined
  return (Icons as any)[iconName]
}

function handleMenuClick({ key }: { key: string | number }) {
  router.push(String(key))
}
</script>

<template>
  <a-menu
    v-model:selected-keys="selectedKeys"
    mode="inline"
    class="panel-menu"
    @click="handleMenuClick"
  >
    <a-menu-item v-for="item in menuItems" :key="item.key">
      <template #icon>
        <component :is="getIconComponent(item.icon)" v-if="item.icon" />
      </template>
      <span>{{ item.title }}</span>
    </a-menu-item>
  </a-menu>
</template>

<style scoped>
.panel-menu {
  flex: 1;
  overflow-y: auto;
  border-right: none !important;
  background: transparent !important;
}
.panel-menu :deep(.ant-menu-item) {
  color: var(--sidebar-fg);
  margin: 2px 8px;
  padding-left: 12px !important;
  border-radius: 4px;
  height: 28px;
  line-height: 28px;
}
.panel-menu :deep(.ant-menu-item:hover) { background: var(--hover-bg) !important; }
.panel-menu :deep(.ant-menu-item-selected) { background: var(--selected-bg) !important; color: var(--text-primary) !important; }
.panel-menu :deep(.ant-menu-item-selected::after) { display: none; }
</style>

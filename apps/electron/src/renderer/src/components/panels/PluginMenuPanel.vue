<script setup lang="ts">
import { AppstoreOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import { executePluginCommand, pluginMenus } from '@/renderer/plugins/plugin-ui'

const props = defineProps<{
  pluginId: string
}>()

const menuItems = computed(() => {
  return pluginMenus.value.get(props.pluginId) || []
})

function handleMenuClick({ key }: { key: string | number }) {
  const menuKey = String(key)
  if (menuKey.startsWith('cmd:')) {
    const commandId = menuKey.substring(4)
    executePluginCommand(commandId)
  }
}
</script>

<template>
  <div class="panel">
    <a-menu v-if="menuItems.length > 0" mode="inline" class="panel-menu" @click="handleMenuClick">
      <a-menu-item v-for="item in menuItems" :key="`cmd:${pluginId}.${item.command || item.id}`">
        <template #icon>
          <AppstoreOutlined />
        </template>
        <span>{{ item.icon || '' }} {{ item.label }}</span>
      </a-menu-item>
    </a-menu>
    <a-empty v-else description="该插件暂无菜单项" class="flex-1 flex-center text-text-3" />
  </div>
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

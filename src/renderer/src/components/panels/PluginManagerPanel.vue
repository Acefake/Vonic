<script setup lang="ts">
import {
  AppstoreOutlined,
  CodeOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { usePluginManager } from '@/renderer/hooks/usePluginManager'

const {
  plugins,
  togglePlugin,
  installPlugin,
  uninstallPlugin,
  openPluginsDir,
  loadDevPlugin,
  reloadDevPlugin,
  unloadDevPlugin,
} = usePluginManager()

const pluginList = computed(() => plugins.value)
</script>

<template>
  <div class="panel">
    <div class="flex-1 overflow-y-auto p-2">
      <div
        v-for="plugin in pluginList"
        :key="plugin.id"
        class="plugin-item"
      >
        <div class="flex items-center gap-2.5">
          <AppstoreOutlined class="text-5 text-primary" />
          <div class="flex flex-col">
            <span class="text-13px font-500 text-text-1">{{ plugin.name }}</span>
            <span class="text-11px text-text-3">v{{ plugin.version }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <a-switch
            :checked="plugin.enabled"
            size="small"
            @change="togglePlugin(plugin.id, plugin.name, !plugin.enabled)"
          />

          <a-tag v-if="plugin.isDev" color="orange" size="small">
            开发
          </a-tag>
          <a-tag v-else-if="plugin.isExternal" color="blue" size="small">
            外部
          </a-tag>

          <!-- 开发插件操作按钮 -->
          <template v-if="plugin.isDev">
            <a-button
              type="text"
              size="small"
              title="重新加载"
              @click="reloadDevPlugin(plugin.id, plugin.name)"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
            </a-button>
            <a-button
              type="text"
              danger
              size="small"
              title="卸载"
              @click="unloadDevPlugin(plugin.id, plugin.name)"
            >
              <template #icon>
                <DeleteOutlined />
              </template>
            </a-button>
          </template>

          <!-- 外部插件卸载按钮 -->
          <a-button
            v-else-if="plugin.isExternal"
            type="text"
            danger
            size="small"
            title="卸载"
            @click="uninstallPlugin(plugin.id, plugin.name)"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </div>
      </div>

      <a-empty v-if="pluginList.length === 0" description="暂无插件" />
    </div>

    <!-- 底部操作栏 -->
    <div class="p-2 flex gap-1 flex-wrap border-t border-border">
      <a-button type="primary" size="small" class="flex-1 min-w-70px" @click="installPlugin">
        <template #icon>
          <UploadOutlined />
        </template>
        安装插件
      </a-button>
      <a-button size="small" class="flex-1 min-w-70px" @click="loadDevPlugin">
        <template #icon>
          <CodeOutlined />
        </template>
        开发插件
      </a-button>
      <a-button size="small" class="flex-1 min-w-70px" @click="openPluginsDir">
        <template #icon>
          <FolderOpenOutlined />
        </template>
        打开目录
      </a-button>
    </div>
  </div>
</template>

<style scoped>
/* 只保留需要主题变量和交互状态的样式 */
.plugin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 4px;
  background: var(--bg-container);
  border-radius: 4px;
  transition: background var(--transition-fast);
}

.plugin-item:hover {
  background: var(--hover-bg);
}
</style>

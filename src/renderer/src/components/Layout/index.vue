<script lang="ts" setup>
import type { Component } from 'vue'

import * as Icons from '@ant-design/icons-vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { productConfig } from '../../../../config/product.config'
import { useMPhysSimDesignStore } from '../../store/mPhysSimDesignStore'
import { usePowerAnalysisDesignStore } from '../../store/powerAnalysisDesignStore'
import CustomHeader from './CustomHeader.vue'
import LogLayout from './LogLayout.vue'

const route = useRoute()
const router = useRouter()

// 根据产品配置选择对应的 store
const designStore = productConfig.id === 'powerAnalysis'
  ? usePowerAnalysisDesignStore()
  : useMPhysSimDesignStore()

const { isMultiScheme } = storeToRefs(designStore)

/**
 * 根据产品配置和设计方案状态过滤菜单项
 * 只显示产品配置中启用的功能对应的菜单
 * 当 isMultiScheme 为 false 时，隐藏"方案优化"和"数据对比"菜单
 */
const menuItems = computed(() => {
  return router.getRoutes()
    .filter((r) => {
      // 过滤隐藏的路由
      if (r.meta.hidden)
        return false

      // 如果不是多方案模式，隐藏"方案优化"和"数据对比"菜单
      if (!isMultiScheme.value) {
        if (r.name === 'SchemeOptimization' || r.name === 'MultiScheme')
          return false
      }

      // 如果路由配置了 feature，则检查产品配置中是否启用该功能
      if (r.meta.feature) {
        const featureName = r.meta.feature as string
        return productConfig.features[featureName] === true
      }

      return true
    })
    .sort((a, b) => (a.meta.order as number || 999) - (b.meta.order as number || 999))
    .map(r => ({
      key: r.path,
      title: r.meta.title || r.name,
      icon: r.meta.icon,
      path: r.path,
    }))
})

const selectedKeys = computed(() => [route.path])

function handleMenuClick({ key }: { key: string | number }) {
  router.push(String(key))
}

function getIconComponent(iconName?: string): Component | undefined {
  if (!iconName)
    return undefined
  return (Icons as any)[iconName]
}
</script>

<template>
  <a-layout class="app-layout">
    <CustomHeader />
    <a-layout class="main-layout">
      <!-- 侧边栏 -->
      <a-layout-sider
        :trigger="null"
        theme="light"
        :width="220"
        class="sider-layout"
      >
        <!-- 动态菜单 -->
        <a-menu
          v-model:selected-keys="selectedKeys"
          mode="inline"
          theme="light"
          @click="handleMenuClick"
        >
          <a-menu-item v-for="item in menuItems" :key="item.key">
            <template #icon>
              <component :is="getIconComponent(item.icon)" v-if="item.icon" />
            </template>
            <span>{{ item.title }}</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <!-- 内容区域 -->
      <a-layout-content class="content-area">
        <slot />
      </a-layout-content>
      <LogLayout />
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.sider-layout {
  border-right: 1px solid #e8e8e8;
}
.main-layout {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: row;
}

.content-area {
  flex: 1;
  overflow: auto;
}
</style>

<script lang="ts" setup>
import ActivityBar from './ActivityBar.vue'
import CustomHeader from './CustomHeader.vue'
</script>

<template>
  <a-layout class="h-100vh flex-col">
    <CustomHeader />
    <a-layout class="flex-1 overflow-hidden flex-row">
      <ActivityBar />
      <a-layout-content class="flex-1 overflow-auto bg-base">
        <slot />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

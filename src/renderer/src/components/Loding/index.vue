<script setup lang="ts">
import { LoadingOutlined } from '@ant-design/icons-vue'
</script>

<template>
  <a-result status="info" title="加载中...">
    <template #icon>
      <LoadingOutlined />
    </template>
  </a-result>
</template>

<style scoped>

</style>

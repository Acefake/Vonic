<script setup lang="ts">
import { FundOutlined } from '@ant-design/icons-vue'
</script>

<template>
  <div class="dev-container">
    <a-result status="info" title="数据对比">
      <template #icon>
        <FundOutlined style="color: #13c2c2" />
      </template>
      <template #subTitle>
        <a-space direction="vertical" :size="16">
          <a-typography-text type="secondary">
            该模块正在开发中，敬请期待...
          </a-typography-text>
          <a-tag color="processing">
            开发中
          </a-tag>
        </a-space>
      </template>
      <template #extra>
        <a-descriptions bordered :column="1" style="max-width: 500px; margin: 0 auto">
          <a-descriptions-item label="功能说明">
            多组数据对比分析和可视化
          </a-descriptions-item>
          <a-descriptions-item label="预计完成时间">
            待定
          </a-descriptions-item>
          <a-descriptions-item label="开发状态">
            <a-badge status="processing" text="开发中" />
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.dev-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 100px);
  padding: 24px;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'

const activeKey = ref('1')
</script>

<template>
  <div class="settings-container">
    <a-tabs v-model:active-key="activeKey">
      <a-tab-pane key="1" tab="通用设置">
        <a-form layout="vertical">
          <a-form-item label="语言">
            <a-select value="zh-CN">
              <a-select-option value="zh-CN">
                简体中文
              </a-select-option>
              <a-select-option value="en-US">
                English
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="主题">
            <a-select value="light">
              <a-select-option value="light">
                亮色
              </a-select-option>
              <a-select-option value="dark">
                暗色
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </a-tab-pane>
      <a-tab-pane key="2" tab="高级设置">
        <p>高级设置内容...</p>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.settings-container {
  padding: 20px;
}
</style>

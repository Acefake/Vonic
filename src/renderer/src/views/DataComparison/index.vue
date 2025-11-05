<script setup lang="ts">
import type { TableColumn, TableDataRow } from '../ExperimentalData/types'

import { message } from 'ant-design-vue'
import { ref } from 'vue'

import { parseExcelFile } from '../ExperimentalData/utils'

// =====================
// 组件状态
// =====================
const tableColumns = ref<TableColumn[]>([])
const tableData = ref<TableDataRow[]>([])

// =====================
// 事件处理函数
// =====================
async function handleBeforeUpload(file: File): Promise<boolean> {
  try {
    // 读取文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 使用 utils.ts 中的完善解析函数
    const { columns, data } = await parseExcelFile(arrayBuffer)

    if (!columns.length) {
      message.warning('Excel 文件为空或内容不合法')
      return false
    }

    tableColumns.value = columns
    tableData.value = data

    message.success(`成功导入 ${data.length} 条记录`)
  }
  catch (err) {
    console.error('Excel 解析错误:', err)
    message.error('解析 Excel 失败，请检查文件格式')
  }

  return false // 阻止自动上传
}
</script>

<template>
  <div class="data-comparison-container">
    <a-upload
      :before-upload="handleBeforeUpload"
      accept=".xlsx,.xls"
      :show-upload-list="false"
    >
      <a-button type="primary">
        📂 选择 Excel 文件
      </a-button>
    </a-upload>

    <div v-if="tableColumns.length" class="table-wrapper">
      <a-table
        :columns="tableColumns"
        :data-source="tableData"
        :scroll="{ x: 'max-content' }"
        bordered
        row-key="key"
      />
    </div>
  </div>
</template>

<style scoped>
.data-comparison-container {
  padding: 24px;
}

.table-wrapper {
  margin-top: 24px;
}
</style>

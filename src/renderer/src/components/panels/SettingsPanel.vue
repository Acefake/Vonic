<script setup lang="ts">
import { BgColorsOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { useTheme } from '@/renderer/theme'

const { currentThemeId, getAvailableThemes, setCustomColor, resetCustomColors, colors } = useTheme()

const themes = getAvailableThemes()
</script>

<template>
  <div class="h-full overflow-y-auto p-3">
    <!-- 外观设置 -->
    <div class="mb-6">
      <div class="flex items-center gap-2 text-11px font-600 uppercase text-text-2 mb-3 px-1">
        <BgColorsOutlined />
        <span>外观</span>
      </div>

      <div class="mb-4">
        <div class="text-13px text-text-1 mb-2 px-1">
          主题
        </div>
        <div class="flex gap-3">
          <div
            v-for="theme in themes"
            :key="theme.id"
            class="theme-option"
            :class="{ active: currentThemeId === theme.id }"
            @click="currentThemeId = theme.id"
          >
            <div class="theme-preview" :class="theme.mode">
              <div class="preview-titlebar" />
              <div class="preview-content">
                <div class="preview-sidebar" />
                <div class="preview-editor" />
              </div>
            </div>
            <div class="theme-name">
              {{ theme.name }}
              <CheckOutlined v-if="currentThemeId === theme.id" class="check-icon" />
            </div>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <div class="text-13px text-text-1 mb-2 px-1">
          主题色
        </div>
        <div class="flex items-center gap-2 px-1">
          <div
            v-for="color in ['#0078d4', '#107c10', '#5c2d91', '#d83b01', '#e81123']"
            :key="color"
            class="color-option"
            :class="{ active: colors.primary === color }"
            :style="{ background: color }"
            @click="setCustomColor('primary', color)"
          />
          <a-button size="small" @click="resetCustomColors">
            重置
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 主题选项卡片 */
.theme-option {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 4px;
  transition: all var(--transition-fast);
}
.theme-option:hover { border-color: var(--border); }
.theme-option.active { border-color: var(--primary); }

/* 主题预览 */
.theme-preview {
  width: 80px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.theme-preview.dark { background: #1e1e1e; }
.theme-preview.dark .preview-titlebar { background: #323233; }
.theme-preview.dark .preview-sidebar { background: #252526; }
.theme-preview.dark .preview-editor { background: #1e1e1e; }
.theme-preview.light { background: #fff; }
.theme-preview.light .preview-titlebar { background: #ddd; }
.theme-preview.light .preview-sidebar { background: #f3f3f3; }
.theme-preview.light .preview-editor { background: #fff; }

.preview-titlebar { height: 8px; }
.preview-content { flex: 1; display: flex; }
.preview-sidebar { width: 20px; }
.preview-editor { flex: 1; }

.theme-name {
  font-size: 12px;
  color: var(--text-primary);
  text-align: center;
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.check-icon { color: var(--primary); font-size: 10px; }

/* 颜色选项 */
.color-option {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--transition-fast);
}
.color-option:hover { transform: scale(1.1); }
.color-option.active { border-color: var(--text-primary); }
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { EchartsUI, useEcharts } from '@vonic/plugins/echarts'
import { Motion, MotionPresets } from '@vonic/plugins/motion'

// 柱状图
const barChartRef = ref<InstanceType<typeof EchartsUI>>()
const { renderEcharts: renderBarChart } = useEcharts(barChartRef, { autoTheme: false })

// 折线图
const lineChartRef = ref<InstanceType<typeof EchartsUI>>()
const { renderEcharts: renderLineChart } = useEcharts(lineChartRef, { autoTheme: false })

// 饼图
const pieChartRef = ref<InstanceType<typeof EchartsUI>>()
const { renderEcharts: renderPieChart } = useEcharts(pieChartRef, { autoTheme: false })

// 雷达图
const radarChartRef = ref<InstanceType<typeof EchartsUI>>()
const { renderEcharts: renderRadarChart } = useEcharts(radarChartRef, { autoTheme: false })

// Motion Demo
const currentPreset = ref<string>('fade')
const motionKey = ref(0)

function changePreset(preset: string): void {
  currentPreset.value = preset
  motionKey.value++
}

onMounted(() => {
  // 柱状图
  renderBarChart({
    title: { text: '柱状图', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: [120, 200, 150, 80, 70, 110, 130],
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' },
          ],
        },
      },
    }],
  })

  // 折线图
  renderLineChart({
    title: { text: '折线图', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['销量', '访问量'], top: 30 },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '销量',
        type: 'line',
        data: [150, 230, 224, 218, 135, 147],
        smooth: true,
        itemStyle: { color: '#5470c6' },
        areaStyle: { color: 'rgba(84, 112, 198, 0.2)' },
      },
      {
        name: '访问量',
        type: 'line',
        data: [320, 332, 301, 334, 390, 330],
        smooth: true,
        itemStyle: { color: '#91cc75' },
        areaStyle: { color: 'rgba(145, 204, 117, 0.2)' },
      },
    ],
  })

  // 饼图
  renderPieChart({
    title: { text: '饼图', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'middle' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: {
        label: { show: true, fontSize: 20, fontWeight: 'bold' },
      },
      labelLine: { show: false },
      data: [
        { value: 1048, name: '搜索引擎', itemStyle: { color: '#5470c6' } },
        { value: 735, name: '直接访问', itemStyle: { color: '#91cc75' } },
        { value: 580, name: '邮件营销', itemStyle: { color: '#fac858' } },
        { value: 484, name: '联盟广告', itemStyle: { color: '#ee6666' } },
        { value: 300, name: '视频广告', itemStyle: { color: '#73c0de' } },
      ],
    }],
  })

  // 雷达图
  renderRadarChart({
    title: { text: '雷达图', left: 'center' },
    tooltip: {},
    legend: { data: ['预算分配', '实际开销'], top: 30 },
    radar: {
      indicator: [
        { name: '销售', max: 6500 },
        { name: '管理', max: 16000 },
        { name: '信息技术', max: 30000 },
        { name: '客服', max: 38000 },
        { name: '研发', max: 52000 },
        { name: '市场', max: 25000 },
      ],
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: [4200, 3000, 20000, 35000, 50000, 18000],
          name: '预算分配',
          areaStyle: { color: 'rgba(84, 112, 198, 0.3)' },
          lineStyle: { color: '#5470c6' },
          itemStyle: { color: '#5470c6' },
        },
        {
          value: [5000, 14000, 28000, 26000, 42000, 21000],
          name: '实际开销',
          areaStyle: { color: 'rgba(145, 204, 117, 0.3)' },
          lineStyle: { color: '#91cc75' },
          itemStyle: { color: '#91cc75' },
        },
      ],
    }],
  })
})
</script>

<template>
  <div class="expands-demo">
    <h1 class="page-title">扩展插件演示</h1>

    <!-- ECharts Demo -->
    <section class="demo-section">
      <h2 class="section-title">ECharts 图表</h2>
      <div class="charts-grid">
        <div class="chart-item">
          <EchartsUI ref="barChartRef" height="300px" width="100%" />
        </div>
        <div class="chart-item">
          <EchartsUI ref="lineChartRef" height="300px" width="100%" />
        </div>
        <div class="chart-item">
          <EchartsUI ref="pieChartRef" height="300px" width="100%" />
        </div>
        <div class="chart-item">
          <EchartsUI ref="radarChartRef" height="300px" width="100%" />
        </div>
      </div>
    </section>

    <!-- Motion Demo -->
    <section class="demo-section">
      <h2 class="section-title">Motion 动画</h2>
      <div class="motion-controls">
        <span class="label">选择动画效果：</span>
        <select v-model="currentPreset" class="preset-select" @change="motionKey++">
          <option v-for="preset in MotionPresets" :key="preset" :value="preset">
            {{ preset }}
          </option>
        </select>
      </div>
      <div class="motion-demo-area">
        <Motion :key="motionKey" :preset="currentPreset as any">
          <div class="motion-box">
            <span>{{ currentPreset }}</span>
          </div>
        </Motion>
      </div>
      <div class="preset-buttons">
        <button
          v-for="preset in ['fade', 'slideLeft', 'slideRight', 'slideTop', 'slideBottom', 'pop']"
          :key="preset"
          class="preset-btn"
          :class="{ active: currentPreset === preset }"
          @click="changePreset(preset)"
        >
          {{ preset }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.expands-demo {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-color, #333);
}

.demo-section {
  background: var(--bg-color, #fff);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #eee);
  color: var(--text-color, #333);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-item {
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 8px;
  padding: 12px;
}

.motion-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.label {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.preset-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-color, #fff);
  color: var(--text-color, #333);
  cursor: pointer;
  min-width: 150px;
}

.motion-demo-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  margin-bottom: 16px;
}

.motion-box {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-color, #fff);
  color: var(--text-color, #333);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.preset-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}
</style>

import type { EChartsOption } from 'echarts';

import type { Ref } from 'vue';

import type EchartsUI from './echarts-ui.vue';

import { computed, nextTick, ref, watch } from 'vue';

import {
  tryOnUnmounted,
  useDebounceFn,
  useDark,
  useResizeObserver,
  useTimeoutFn,
  useWindowSize,
} from '@vueuse/core';

import echarts from './echarts';

type EchartsUIType = InstanceType<typeof EchartsUI> | undefined;
type EchartsThemeType = 'dark' | 'light' | null;
type Nullable<T> = T | null;

interface UseEchartsOptions {
  /** 是否启用暗色主题自动切换 */
  autoTheme?: boolean;
  /** 初始主题 */
  theme?: EchartsThemeType;
}

function useEcharts(
  chartRef: Ref<EchartsUIType>,
  options: UseEchartsOptions = {},
): {
  renderEcharts: (options: EChartsOption, clear?: boolean) => Promise<Nullable<echarts.ECharts>>;
  resize: () => void;
  dispose: () => void;
  getChartInstance: () => echarts.ECharts | null;
} {
  const { autoTheme = true, theme: initialTheme } = options;

  let chartInstance: echarts.ECharts | null = null;
  let cacheOptions: EChartsOption = {};

  const isDark = autoTheme ? useDark() : ref(initialTheme === 'dark');
  const { height, width } = useWindowSize();
  const resizeHandler: () => void = useDebounceFn(resize, 200);

  const getChartEl = (): HTMLElement | null => {
    const refValue = chartRef?.value as unknown;
    if (!refValue) return null;
    if (refValue instanceof HTMLElement) {
      return refValue;
    }
    const maybeComponent = refValue as { $el?: HTMLElement };
    return maybeComponent.$el ?? null;
  };

  const isElHidden = (el: HTMLElement | null): boolean => {
    if (!el) return true;
    return el.offsetHeight === 0 || el.offsetWidth === 0;
  };

  const getOptions = computed((): EChartsOption => {
    if (!isDark.value) {
      return {};
    }
    return {
      backgroundColor: 'transparent',
    };
  });

  const initCharts = (t?: EchartsThemeType): echarts.ECharts | undefined => {
    const el = getChartEl();
    if (!el) {
      return;
    }
    chartInstance = echarts.init(el, t ?? (isDark.value ? 'dark' : null));
    return chartInstance;
  };

  const renderEcharts = (
    options: EChartsOption,
    clear = true,
  ): Promise<Nullable<echarts.ECharts>> => {
    cacheOptions = options;
    const currentOptions = {
      ...options,
      ...getOptions.value,
    };
    return new Promise((resolve) => {
      const el = getChartEl();
      if (!el || el.offsetHeight === 0) {
        useTimeoutFn(async () => {
          resolve(await renderEcharts(currentOptions));
        }, 30);
        return;
      }
      nextTick(() => {
        if (isElHidden(el)) {
          useTimeoutFn(async () => {
            resolve(await renderEcharts(currentOptions));
          }, 30);
          return;
        }
        useTimeoutFn(() => {
          if (!chartInstance) {
            const instance = initCharts();
            if (!instance) return;
          }
          clear && chartInstance?.clear();
          chartInstance?.setOption(currentOptions);
          resolve(chartInstance);
        }, 30);
      });
    });
  };

  function resize(): void {
    const el = getChartEl();
    if (isElHidden(el)) {
      return;
    }
    chartInstance?.resize({
      animation: {
        duration: 300,
        easing: 'quadraticIn',
      },
    });
  }

  function dispose(): void {
    chartInstance?.dispose();
    chartInstance = null;
  }

  watch([width, height], () => {
    resizeHandler?.();
  });

  useResizeObserver(chartRef as never, resizeHandler);

  if (autoTheme) {
    watch(isDark, () => {
      if (chartInstance) {
        chartInstance.dispose();
        initCharts();
        renderEcharts(cacheOptions);
        resize();
      }
    });
  }

  tryOnUnmounted(() => {
    dispose();
  });

  return {
    renderEcharts,
    resize,
    dispose,
    getChartInstance: () => chartInstance,
  };
}

export { useEcharts };

export type { EchartsUIType, UseEchartsOptions };

import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { bytecodePlugin, defineConfig, externalizeDepsPlugin } from 'electron-vite'
import UnoCSS from 'unocss/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// 公共路径别名配置
const alias = {
  '@/shared': resolve('src/shared'),
  '@/main': resolve('src/main'),
  '@/renderer': resolve('src/renderer/src'),
  '@/config': resolve('src/config'),
}

export default defineConfig(({ command, mode }) => {
  const isProduction = command === 'build'
  // 是否启用构建分析
  const isAnalyze = mode === 'analyze'

  return {
    main: {
      plugins: [
        externalizeDepsPlugin(),
        // 生产环境启用字节码保护
        ...(isProduction ? [bytecodePlugin({ transformArrowFunctions: true })] : []),
      ],
      resolve: {
        alias,
      },
      build: {
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
        target: 'node18',
        rollupOptions: {
          // 优化 treeshaking
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
          },
          output: {
            manualChunks: undefined,
          },
        },
      },
    },
    preload: {
      plugins: [
        externalizeDepsPlugin({
          exclude: ['@electron-toolkit/preload'],
        }),
        ...(isProduction ? [bytecodePlugin({ transformArrowFunctions: true })] : []),
      ],
      resolve: {
        alias,
      },
      build: {
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
        target: 'node18',
        rollupOptions: {
          treeshake: {
            moduleSideEffects: false,
          },
        },
      },
    },
    renderer: {
      resolve: {
        alias,
      },
      plugins: [
        vue({
          script: {
            defineModel: true,
          },
        }),
        UnoCSS() as any,
        Components({
          resolvers: [
            AntDesignVueResolver({
              importStyle: false,
            }),
          ],
          dts: 'src/components.d.ts',
        }),
        ...(isAnalyze
          ? [
              visualizer({
                filename: 'stats.html',
                open: true,
                gzipSize: true,
                brotliSize: true,
              }),
            ]
          : []),
      ],
      build: {
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
        rollupOptions: {
          treeshake: {
            moduleSideEffects: 'no-external',
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false,
          },
          output: {
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                // ECharts 单独分块（最大）
                if (id.includes('echarts') || id.includes('zrender')) {
                  return 'echarts'
                }
                // vue-echarts 单独
                if (id.includes('vue-echarts')) {
                  return 'vue-echarts'
                }
                // Ant Design Vue 单独分块
                if (id.includes('ant-design-vue')) {
                  return 'antd'
                }
                // Ant Design Icons 单独
                if (id.includes('@ant-design/icons')) {
                  return 'antd-icons'
                }
                // Vue 核心（只包含 vue 本身）
                if (id.includes('/vue/') || id.includes('/vue@')) {
                  return 'vue'
                }
                // Vue 编译器
                if (id.includes('@vue/compiler') || id.includes('@vue/reactivity') || id.includes('@vue/runtime')) {
                  return 'vue-runtime'
                }
                // Vue Router + Pinia
                if (id.includes('vue-router') || id.includes('pinia')) {
                  return 'vue-ecosystem'
                }
                // 工具库
                if (id.includes('axios') || id.includes('lodash') || id.includes('dayjs')) {
                  return 'utils'
                }
                return 'vendor'
              }
              return undefined
            },
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          },
        },
        chunkSizeWarningLimit: 2000,
        cssCodeSplit: true,
        assetsInlineLimit: 4096,
      },
      optimizeDeps: {
        include: [
          'vue',
          'vue-router',
          'pinia',
          'ant-design-vue',
          'axios',
          'echarts',
          'vue-echarts',
          '@ant-design/icons-vue',
        ],
        exclude: ['electron'],
        force: false,
      },
      server: {
        hmr: true,
      },
      esbuild: {
        drop: isProduction ? ['console', 'debugger'] : [],
        legalComments: 'none',
      },
    },
  }
})

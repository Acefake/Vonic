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
        // 构建分析插件
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
        // 优化构建输出
        rollupOptions: {
          treeshake: {
            moduleSideEffects: 'no-external',
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false,
          },
          output: {
            // 手动代码分割策略
            manualChunks: (id) => {
              if (id.includes('node_modules')) {
                // Vue 核心
                if (id.includes('vue') || id.includes('@vue')) {
                  return 'vue-core'
                }
                // Vue 生态
                if (id.includes('vue-router') || id.includes('pinia')) {
                  return 'vue-ecosystem'
                }
                // Ant Design Vue
                if (id.includes('ant-design-vue') || id.includes('@ant-design')) {
                  return 'antd'
                }
                // ECharts
                if (id.includes('echarts') || id.includes('zrender')) {
                  return 'echarts'
                }
                // 工具库
                if (id.includes('axios') || id.includes('lodash')) {
                  return 'utils'
                }
                // 其他依赖
                return 'vendor'
              }
              return undefined
            },
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          },
        },
        // 优化构建性能
        chunkSizeWarningLimit: 1000,
        // 启用 CSS 代码分割
        cssCodeSplit: true,
        // 优化资源内联阈值（小于 4kb 的资源内联为 base64）
        assetsInlineLimit: 4096,
      },
      // 依赖预构建优化
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
        // 强制预构建，避免首次加载慢
        force: false,
      },
      // 开发服务器
      server: {
        hmr: true,
        warmup: {
          clientFiles: [
            './src/renderer/src/main.ts',
            './src/renderer/src/App.vue',
            './src/renderer/src/router/index.ts',
          ],
        },
      },
      // esbuild 优化
      esbuild: {
        // 生产环境移除 console 和 debugger
        drop: isProduction ? ['console', 'debugger'] : [],
        // 优化压缩
        legalComments: 'none',
      },
    },
  }
})

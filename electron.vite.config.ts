import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

// 公共路径别名配置
const alias = {
  '@/shared': resolve('src/shared'),
  '@/main': resolve('src/main'),
  '@/renderer': resolve('src/renderer/src'),
  '@/config': resolve('src/config'),
}

export default defineConfig(({ command }) => {
  // 判断是否为生产构建（electron-vite 的 command 参数：'build' 为生产，'serve' 为开发）
  const isProduction = command === 'build'

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias,
      },
      build: {
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
        // 优化构建输出
        rollupOptions: {
          output: {
            // 手动代码分割，优化主进程代码
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
      ],
      resolve: {
        alias,
      },
      build: {
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
      },
    },
    renderer: {
      resolve: {
        alias,
      },
      plugins: [
        vue(),
        Components({
          resolvers: [
            AntDesignVueResolver({
              importStyle: false,
            }),
          ],
          // 自动导入组件目录
          dirs: ['src/renderer/src/components'],
          // 类型声明文件路径
          dts: 'src/renderer/components.d.ts',
        }),
        // visualizer 只在生产构建时启用，且不自动打开
        ...(isProduction
          ? [
              visualizer({
                open: false,
                gzipSize: true,
                brotliSize: true,
                filename: 'dist/stats.html',
                template: 'treemap', // 使用树状图模板，更清晰
              }),
            ]
          : []),
      ],
      // 开发服务器配置
      server: {
        port: 5173,
        strictPort: false,
        // 启用 HMR
        hmr: {
          overlay: true,
        },
      },
      build: {
        minify: isProduction ? 'esbuild' : false,
        sourcemap: !isProduction,
        // 优化构建输出
        rollupOptions: {
          output: {
            // 手动代码分割策略
            manualChunks: (id) => {
              // 将 node_modules 中的大型库单独打包
              if (id.includes('node_modules')) {
                // Vue 相关
                if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
                  return 'vue-vendor'
                }
                // Ant Design Vue
                if (id.includes('ant-design-vue')) {
                  return 'antd-vendor'
                }
                // ECharts
                if (id.includes('echarts')) {
                  return 'echarts-vendor'
                }
                // 其他工具库
                if (
                  id.includes('axios')
                  || id.includes('lodash')
                  || id.includes('xlsx')
                  || id.includes('iconv-lite')
                ) {
                  return 'utils-vendor'
                }
                // 其他 node_modules
                return 'vendor'
              }
              // 非 node_modules 的代码不进行分割
              return undefined
            },
            // 优化 chunk 文件命名
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
        // 优化构建性能
        chunkSizeWarningLimit: 1000,
        // 启用 CSS 代码分割
        cssCodeSplit: true,
        // 优化资源内联阈值（小于 4kb 的资源内联为 base64）
        assetsInlineLimit: 4096,
      },
      // 优化依赖预构建
      optimizeDeps: {
        include: ['vue', 'vue-router', 'pinia', 'ant-design-vue'],
        exclude: ['electron'],
      },
    },
  }
})

/**
 * 纯 Web 构建配置
 * 用于将渲染进程打包为独立的 Web 应用
 */
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

export default defineConfig(({ command }) => {
  const isProduction = command === 'build'

  return {
    root: resolve(__dirname, 'src/renderer'),
    base: './',
    define: {
      'import.meta.env.VITE_PLATFORM': JSON.stringify('web'),
    },
    resolve: {
      alias: {
        '@/shared': resolve(__dirname, 'src/shared'),
        '@/renderer': resolve(__dirname, 'src/renderer/src'),
        '@/config': resolve(__dirname, 'src/config'),
      },
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
    ],
    build: {
      outDir: resolve(__dirname, 'dist-web'),
      emptyOutDir: true,
      minify: isProduction ? 'esbuild' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('@vue')) return 'vue-core'
              if (id.includes('vue-router') || id.includes('pinia')) return 'vue-ecosystem'
              if (id.includes('ant-design-vue') || id.includes('@ant-design')) return 'antd'
              if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
              if (id.includes('axios') || id.includes('lodash')) return 'utils'
              return 'vendor'
            }
            return undefined
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
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
    },
    server: {
      port: 5174,
      hmr: true,
    },
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
  }
})

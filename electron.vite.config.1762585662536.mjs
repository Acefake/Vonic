// electron.vite.config.ts
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

const electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@/shared': resolve('src/shared'),
        '@/main': resolve('src/main'),
        '@/renderer': resolve('src/renderer/src'),
        '@/config': resolve('src/config'),
      },
    },
    build: {
      minify: 'esbuild',
      sourcemap: false,
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({
      exclude: ['@electron-toolkit/preload'],
    })],
    resolve: {
      alias: {
        '@/shared': resolve('src/shared'),
        '@/main': resolve('src/main'),
        '@/renderer': resolve('src/renderer/src'),
        '@/config': resolve('src/config'),
      },
    },
    build: {
      minify: 'esbuild',
      sourcemap: false,
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@/renderer': resolve('src/renderer/src'),
        '@/shared': resolve('src/shared'),
        '@/main': resolve('src/main'),
        '@/config': resolve('src/config'),
      },
    },
    plugins: [
      vue(),
      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: false,
          }),
        ],
      }),
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'stats.html',
      }),
    ],
    build: {
      minify: 'esbuild',
      sourcemap: false,
    },
  },
})
export {
  electron_vite_config_default as default,
}

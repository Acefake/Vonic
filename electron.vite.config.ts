import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
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
    ],
  },
})

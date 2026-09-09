import { fileURLToPath, URL } from 'node:url'

import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080'

  return {
    plugins: [
      vue(),
      // Element Plus 按需引入：模板组件自动按需注册，ElMessage 等 API 自动导入样式。
      // 入口不再全量 app.use(ElementPlus)（22 号诊断 P2 体积项）。
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: false,
        },
      },
    },
    build: {
      // 入口 chunk 现为 778 kB（main.ts 全量注册 Element Plus）；预算 800 kB，
      // 真正的修复是改为按需引入，届时把预算压回 500 以下。
      chunkSizeWarningLimit: 800,
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 美文π 纯前端项目，无需后端。
// 热榜数据来自 uapis.cn，但该接口未开启 CORS，浏览器不能直接跨域请求。
// 因此通过 dev / preview 代理，把同源的 /api/hotboard 转发到真实接口，
// 由 Vite 服务端发起请求，彻底绕开浏览器跨域限制。
// 注意：必须经由 npm run dev 或 npm run preview 启动才会带代理；
// 直接打开 build 出来的静态文件（无代理）将无法正常获取热榜。
const HOT_PROXY_TARGET = 'https://uapis.cn'

const hotProxy = {
  target: HOT_PROXY_TARGET,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/hotboard/, '/api/v1/misc/hotboard'),
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/hotboard': hotProxy,
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api/hotboard': hotProxy,
    },
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = process.env.API_BACKEND_URL ?? 'http://127.0.0.1:8000'
const notifications = process.env.NOTIFICATION_SERVICE_URL ?? 'http://127.0.0.1:8001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/health': { target: backend, changeOrigin: true },
      '/patients': { target: backend, changeOrigin: true },
      '/doctors': { target: backend, changeOrigin: true },
      '/appointments': { target: backend, changeOrigin: true },
      '/docs': { target: backend, changeOrigin: true },
      '/openapi.json': { target: backend, changeOrigin: true },
      '/notify': { target: notifications, changeOrigin: true },
    },
  },
})

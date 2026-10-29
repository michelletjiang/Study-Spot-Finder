import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 127.0.0.1, not localhost: Node may resolve localhost to IPv6 (::1) while Express listens on IPv4
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } }
})


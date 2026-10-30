// ACTIVE: build and dev-server settings for the Vue client (the demo uses a task-private copy of this setup). Not application code.
// The Vue plugin lets Vite read .vue files.
import vue from '@vitejs/plugin-vue'
// defineConfig gives editor help for the options.
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Existing note: use 127.0.0.1 so IPv4 and IPv6 do not mismatch.
  // 127.0.0.1, not localhost: Node may resolve localhost to IPv6 (::1) while Express listens on IPv4
  // In dev, requests to /api are forwarded to Express on port 8000. Nothing else is proxied, so the legacy EJS pages are not reachable through Vite.
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } }
})


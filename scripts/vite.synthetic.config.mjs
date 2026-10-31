import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../client')

export default defineConfig({
  root,
  plugins: [vue()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:8011' },
    headers: { 'Content-Security-Policy': "img-src 'self' data: blob:" },
  },
})

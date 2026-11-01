import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../client')
// Resolve Vite packages from client/package.json so a clean clone uses client dependencies.
const require = createRequire(resolve(root, 'package.json'))
const vue = require('@vitejs/plugin-vue')
const { defineConfig } = require('vite')

export default defineConfig({
  root,
  plugins: [vue()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:8011' },
    headers: { 'Content-Security-Policy': "img-src 'self' data: blob:" },
  },
})

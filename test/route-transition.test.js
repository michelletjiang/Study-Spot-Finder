// Node's built-in runner keeps these focused source-contract checks dependency-free.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

// Read the two files that define route animation behavior.
const app = fs.readFileSync('client/src/App.vue', 'utf8')
const styles = fs.readFileSync('client/src/style.css', 'utf8')

test('route transitions animate a stable wrapper around every view', () => {
  assert.match(app, /<Transition name="page" mode="out-in">/)
  assert.match(app, /<div class="page-transition-page" :key="route\.matched\[route\.matched\.length - 1\]\?\.path">\s*<component :is="Component"/)
})

test('route transitions disable motion for reduced-motion users', () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /\.page-enter-active,[\s\S]*?transition: none;/)
})

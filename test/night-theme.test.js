// TEST: the night theme (after 7pm in Singapore, or picked with the navbar's theme button) stays readable,
// and it's switched by the app (data-theme), never by the computer's own dark mode setting.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const css = fs.readFileSync('client/src/style.css', 'utf8')

const variables = block => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(m => [m[1], m[2]]))
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

test('night text meets WCAG AA on the night paper, sheets and inputs', () => {
  const block = css.match(/:root\[data-theme='night'\]\s*{([\s\S]*?)\n}/)
  assert.ok(block, 'the night theme block must exist')
  assert.match(block[1], /color-scheme:\s*dark;/)
  const night = variables(block[1])
  for (const [text, background] of [['ink', 'paper'], ['text-h', 'paper'], ['nb-ink', 'nb-sheet'], ['nb-ink', 'nb-input'], ['nb-muted', 'nb-sheet'], ['nb-error', 'nb-sheet']]) {
    assert.ok(contrast(night[text], night[background]) >= 4.5, `${text} on ${background} must meet WCAG AA`)
  }
})

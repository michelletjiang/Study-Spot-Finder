// TEST: the app keeps a readable light theme even when the OS prefers dark.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const css = fs.readFileSync('client/src/style.css', 'utf8')

function variables(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s*;/gi)].map(match => [match[1], match[2]]))
}

function rgb(hex) {
  if (hex.length === 4) hex = `#${hex.slice(1).split('').map(value => value + value).join('')}`
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16))
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

test('native controls and text stay light and readable under dark OS preference', () => {
  const lightMatch = css.match(/^:root\s*{([\s\S]*?)\n}/m)
  assert.ok(lightMatch, 'light theme variables must exist')
  assert.match(lightMatch[1], /color-scheme:\s*light;/)
  assert.doesNotMatch(css, /@media\s*\(prefers-color-scheme:\s*dark\)/)

  const light = variables(lightMatch[1])
  assert.ok(contrast(light.ink, light.paper) >= 4.5, 'light body ink must meet WCAG AA')
  assert.ok(contrast(light['text-h'], light.paper) >= 4.5, 'light heading must meet WCAG AA')
  assert.ok(contrast(light.ink, light.bg) >= 4.5, 'light card copy must meet WCAG AA')
})

test('comparison keeps the original dark-ink treatment on light surfaces', () => {
  const compare = fs.readFileSync('client/src/views/CompareView.vue', 'utf8')
  const tray = fs.readFileSync('client/src/components/CompareTray.vue', 'utf8')
  assert.match(compare, /winner-summary[^\n]*color: #28263f/)
  assert.match(compare, /spot-head h2 \{ color: #28263f/)
  assert.match(compare, /comparison-row:not\(.is-live\) \{ background: rgba\(40, 38, 63, 0\.025\)/)
  assert.match(tray, /\.compare-tray \{[\s\S]*?color: #28263f;/)
  assert.ok(contrast('#28263f', '#dcc58f') >= 4.5, 'comparison header ink must meet WCAG AA in both themes')
  assert.ok(contrast('#28263f', '#c5d3e4') >= 4.5, 'winner strip ink must meet WCAG AA in both themes')
  assert.ok(contrast('#28263f', '#ecd27e') >= 4.5, 'best badge ink must meet WCAG AA in both themes')
})

test('night comparison edges and header copy stay readable on dark paper', () => {
  const nightMatch = css.match(/:root\[data-theme='night'\]\s*\{([\s\S]*?)\n}/)
  assert.ok(nightMatch, 'night theme variables must exist')
  const night = variables(nightMatch[1])
  assert.ok(contrast(night['nb-night-header-ink'], night['nb-night-header']) >= 4.5, 'night header copy must meet WCAG AA')
  assert.ok(contrast(night['nb-night-outline'], night.paper) >= 3, 'night comparison outline must meet UI contrast')
})

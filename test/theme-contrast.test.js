const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('client/src/style.css', 'utf8');

function variables(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s*;/gi)].map(match => [match[1], match[2]]));
}

function rgb(hex) {
  if (hex.length === 4) hex = `#${hex.slice(1).split('').map(value => value + value).join('')}`;
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function assertReadable(label, foreground, background) {
  assert.ok(contrast(foreground, background) >= 4.5, `${label} must meet WCAG AA contrast`);
}

test('native light and dark theme tokens keep text readable on owning surfaces', () => {
  const lightMatch = css.match(/^:root\s*{([\s\S]*?)\n}/m);
  const darkMatch = css.match(/@media \(prefers-color-scheme: dark\)\s*{\s*:root\s*{([\s\S]*?)\n  }/m);
  assert.ok(lightMatch, 'light theme variables must exist');
  assert.ok(darkMatch, 'dark theme variables must exist');

  const light = variables(lightMatch[1]);
  const dark = { ...light, ...variables(darkMatch[1]) };

  assertReadable('light body ink', light.ink, light.paper);
  assertReadable('light heading', light['text-h'], light.paper);
  assertReadable('light card copy', light.ink, light.bg);
  assertReadable('dark body ink', dark.ink, dark.paper);
  assertReadable('dark heading', dark['text-h'], dark.paper);
  assertReadable('dark card copy', dark.ink, dark.bg);
  assertReadable('dark secondary text', dark.text, dark.bg);
});

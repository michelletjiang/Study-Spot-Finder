// TEST (native dark-mode regression): checks that the light and dark colour tokens in client/src/style.css keep text readable, without relying on a browser extension.
// node:test is Node's built-in test runner.
const test = require('node:test');
// assert/strict compares values exactly.
const assert = require('node:assert/strict');
// fs reads the stylesheet.
const fs = require('node:fs');

// The stylesheet is read as text and its colour tokens are picked out with patterns.
const css = fs.readFileSync('client/src/style.css', 'utf8');

// Collect every name and hex colour pair in a block of CSS into an object.
function variables(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s*;/gi)].map(match => [match[1], match[2]]));
}

// Convert a hex colour to red, green and blue numbers.
function rgb(hex) {
  if (hex.length === 4) hex = `#${hex.slice(1).split('').map(value => value + value).join('')}`;
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

// Work out how bright a colour is, using the WCAG formula.
function luminance(hex) {
  const [r, g, b] = rgb(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  // WCAG contrast ratio of two colours: lighter plus 0.05 divided by darker plus 0.05.
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function assertReadable(label, foreground, background) {
  // Fail the test when the ratio is below 4.5, the AA level for normal text.
  assert.ok(contrast(foreground, background) >= 4.5, `${label} must meet WCAG AA contrast`);
}

test('native light and dark theme tokens keep text readable on owning surfaces', () => {
  // Proves the light and dark themes each keep text readable on the surface that owns it.
  // Find the light block (the first root rule) and the dark block (the root rule inside the dark media query). The patterns allow only whitespace between the media line and the root rule, so comments in style.css are kept above the media line.
  const lightMatch = css.match(/^:root\s*{([\s\S]*?)\n}/m);
  const darkMatch = css.match(/@media \(prefers-color-scheme: dark\)\s*{\s*:root\s*{([\s\S]*?)\n  }/m);
  // Both blocks must exist.
  assert.ok(lightMatch, 'light theme variables must exist');
  assert.ok(darkMatch, 'dark theme variables must exist');

  const light = variables(lightMatch[1]);
  // The dark theme starts from the light tokens and overrides the ones it defines.
  const dark = { ...light, ...variables(darkMatch[1]) };

  // Light page: ink on paper, heading on paper, and ink on the card background.
  assertReadable('light body ink', light.ink, light.paper);
  assertReadable('light heading', light['text-h'], light.paper);
  assertReadable('light card copy', light.ink, light.bg);
  // Dark page: the same three checks.
  assertReadable('dark body ink', dark.ink, dark.paper);
  assertReadable('dark heading', dark['text-h'], dark.paper);
  assertReadable('dark card copy', dark.ink, dark.bg);
  // Secondary text on the dark card background.
  assertReadable('dark secondary text', dark.text, dark.bg);
});

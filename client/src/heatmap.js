// The noise heatmap on the floorplans: which floors have it, its colours and the labels on its rooms.

import { findFloorplan } from './floorplans'

// Buildings with the heatmap, on every floor that has a floor plan. To roll it out further, add them here.
const HEATMAP_BUILDINGS = [
  'CONNEX',
  'School of Computing and Information Systems 1',
  'SCIS 2 / SOE',
  'Li Ka Shing Library',
  'Lee Kong Chian School of Business',
  'School of Accountancy',
  'Yong Pung How School of Law',
  'School of Social Sciences / College of Integrative Studies',
]
// sectionKey: a library inside the building with its own plans (floorplans.js), e.g. 'kgc'
export const heatEnabled = (buildingName, floor, sectionKey = null) =>
  HEATMAP_BUILDINGS.includes(buildingName) && !!findFloorplan(buildingName, floor, sectionKey)

// the noise levels, in score order (see services/noise-service.js). key is what's stored, label what students see.
export const NOISE_LEVELS = [
  { key: 'Quiet', label: 'Quiet' },
  { key: 'Moderate', label: 'Some chatter' },
  { key: 'Loud', label: 'Loud' },
]

export const noiseLabel = key => NOISE_LEVELS.find(level => level.key === key)?.label ?? key

// score (0 Quiet to 2 Loud, see services/noise-service.js) -> colour, pale blue through highlighter yellow to deep red.
// Rooms with no reports are striped rather than a colour, so nothing on this scale can be mistaken for them.
const STOPS = [
  { score: 0, rgb: [214, 228, 245] },
  { score: 1, rgb: [245, 197, 99] },
  { score: 1.5, rgb: [222, 137, 82] },
  { score: 2, rgb: [179, 38, 62] },
]

function heatRgb(score) {
  const s = Math.min(Math.max(score, 0), 2)
  const upper = STOPS.findIndex(stop => s <= stop.score)
  if (upper === 0) return STOPS[0].rgb
  const from = STOPS[upper - 1]
  const to = STOPS[upper]
  const t = (s - from.score) / (to.score - from.score)
  return from.rgb.map((value, i) => Math.round(value + (to.rgb[i] - value) * t))
}

export const heatColour = score => `rgb(${heatRgb(score).join(', ')})`

// the notebook ink or white, whichever reads better on that score's colour (the WCAG contrast formula)
export function heatTextColour(score) {
  const [r, g, b] = heatRgb(score).map(value => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const INK_LUMINANCE = 0.022
  return (luminance + 0.05) / (INK_LUMINANCE + 0.05) >= 1.05 / (luminance + 0.05) ? '#28263f' : '#fff'
}

// a pill or button coloured like a room at that level
export function noiseStyle(key) {
  const score = NOISE_LEVELS.findIndex(level => level.key === key)
  return { background: heatColour(score), color: heatTextColour(score) }
}

// for the legend's bar
export const HEAT_GRADIENT = `linear-gradient(to right, ${STOPS.map(stop => `rgb(${stop.rgb.join(', ')}) ${(stop.score / 2) * 100}%`).join(', ')})`

export const reportCount = count => (count ? `${count} report${count === 1 ? '' : 's'}` : 'no reports')

// wraps words into lines of up to maxChars (a longer word gets its own line)
function wrapWords(words, maxChars) {
  const lines = []
  for (const word of words) {
    const last = lines[lines.length - 1]
    if (last && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}

export const parsePoints = points => points.trim().split(/\s+/).map(point => point.split(',').map(Number))

export function polygonArea(pts) {
  let area = 0
  pts.forEach(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += x1 * y2 - x2 * y1
  })
  return Math.abs(area) / 2
}

export function boundingBox(pts) {
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

// the middle of a polygon, weighted by area, so an odd shape's label stays over the bulk of the room
function centroid(pts) {
  let area = 0
  let x = 0
  let y = 0
  pts.forEach(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    const cross = x1 * y2 - x2 * y1
    area += cross
    x += (x1 + x2) * cross
    y += (y1 + y2) * cross
  })
  return { x: x / (3 * area), y: y / (3 * area) }
}

// is the point inside the polygon? (ray casting)
function inside([px, py], pts) {
  let result = false
  pts.forEach(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    if (y1 > py !== y2 > py && px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1) result = !result
  })
  return result
}

// width of a line of bold text, in font sizes: capitals and digits are wider than lower case
const textWidth = text => [...text].reduce((sum, c) => sum + (/[A-Z0-9]/.test(c) ? 0.68 : /[a-z]/.test(c) ? 0.56 : c === ' ' ? 0.3 : 0.4), 0)

// What to write on a room and where, in the plan's own units: the biggest text that fits inside the room's shape
// and clear of the smaller rooms drawn over it (obstacles: their bounding boxes).
// Roomy rooms get their name and report count, then only the name, then "Pod 4-1", and the tiniest just "4-1".
// Returns [{ text, y, size, note }] plus x, one row per line.
export function heatLabel(points, name, count, planWidth, obstacles = []) {
  const pts = parsePoints(points)
  const box = boundingBox(pts)
  const width = box.x1 - box.x0
  const height = box.y1 - box.y0

  const LINE = 1.15        // line height, in font sizes
  const NOTE_SCALE = 0.82  // the report count is a little smaller than the name
  const maxSize = planWidth / 60
  const minSize = maxSize * 0.6

  // the label's width and height at a font size
  const measure = ({ lines, note }, size) => ({
    w: size * Math.max(...lines.map(textWidth), note ? textWidth(note) * NOTE_SCALE : 0),
    h: size * LINE * (lines.length + (note ? NOTE_SCALE : 0)),
  })
  // the biggest size that fits the room's bounding box (with a margin)
  const fitSize = option => {
    const { w, h } = measure(option, 1)
    return Math.min(maxSize, (0.9 * width) / w, (0.9 * height) / h)
  }

  // Places to try, nearest the room's middle first: the centroid, then a grid over the room.
  const middle = centroid(pts)
  const spots = [middle]
  const STEPS = 14
  for (let i = 1; i < STEPS; i++) for (let j = 1; j < STEPS; j++) {
    spots.push({ x: box.x0 + (width * i) / STEPS, y: box.y0 + (height * j) / STEPS })
  }
  spots.sort((a, b) => Math.hypot(a.x - middle.x, a.y - middle.y) - Math.hypot(b.x - middle.x, b.y - middle.y))

  // the whole label inside the room (a 5 x 5 grid of points over it, so a small hole such as a lift isn't missed)
  // and not over a smaller room
  const fits = (x, y, w, h) => {
    const [l, r, t, b] = [x - w / 2, x + w / 2, y - h / 2, y + h / 2]
    const checks = []
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) checks.push([l + (w * i) / 4, t + (h * j) / 4])
    if (!checks.every(p => inside(p, pts))) return false
    return obstacles.every(o => r <= o.x0 || l >= o.x1 || b <= o.y0 || t >= o.y1)
  }
  const place = (option, size) => {
    const { w, h } = measure(option, size)
    return spots.find(s => fits(s.x, s.y, w, h))
  }

  const words = name.split(' ')
  const wrapped = [16, 10, 7].map(maxChars => wrapWords(words, maxChars))
  const note = reportCount(count)
  const bySize = options => options.map(o => ({ ...o, size: fitSize(o) })).sort((a, b) => b.size - a.size)
  const tiers = [
    bySize(wrapped.map(lines => ({ lines, note }))),
    bySize(wrapped.map(lines => ({ lines }))),
    bySize([{ lines: [words.slice(-2).join(' ')] }]),
    bySize([{ lines: [words[words.length - 1]] }]),
  ]

  // the biggest text that has a place; a smaller size can fit where a bigger one couldn't
  let chosen = null
  for (const [t, tier] of tiers.entries()) {
    const smallest = t === tiers.length - 1 ? minSize * 0.6 : minSize
    for (const option of tier) for (const scale of [1, 0.85, 0.72]) {
      const size = option.size * scale
      if (chosen || size < smallest) continue
      const at = place(option, size)
      if (at) chosen = { ...option, size, ...at }
    }
    if (chosen) break
  }
  // nowhere fits (a sliver of a room): its number in the middle, as small as it goes
  if (!chosen) chosen = { lines: [words[words.length - 1]], size: tiers[3][0].size, ...middle }

  const { lines, note: shownNote, size, x, y } = chosen
  const noteSize = size * NOTE_SCALE
  const total = (lines.length * size + (shownNote ? noteSize : 0)) * LINE
  let top = y - total / 2
  const rows = lines.map(text => {
    const row = { text, size, y: top + (size * LINE) / 2, note: false }
    top += size * LINE
    return row
  })
  if (shownNote) rows.push({ text: shownNote, size: noteSize, y: top + (noteSize * LINE) / 2, note: true })
  return { x, rows }
}

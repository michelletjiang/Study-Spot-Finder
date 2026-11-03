// The noise heatmap on the floorplans: which floors have it, its colours and the labels on its rooms.

// building name -> floors. To roll it out further, add them here.
const HEATMAP_FLOORS = { CONNEX: ['4'] }

export const heatEnabled = (buildingName, floor) => !!HEATMAP_FLOORS[buildingName]?.includes(floor)

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

// What to write on a room and where, in the plan's own units: the biggest text that fits.
// Roomy rooms get their name and report count, then only the name, then "Pod 4-1", and the tiniest just "4-1".
// Returns [{ text, y, size, note }] plus x, one row per line.
export function heatLabel(points, name, count, planWidth) {
  const pts = points.trim().split(/\s+/).map(point => point.split(',').map(Number))
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)

  const LINE = 1.15        // line height, in font sizes
  const CHAR = 0.58        // average width of a bold character, in font sizes
  const NOTE_SCALE = 0.82  // the report count is a little smaller than the name
  const maxSize = planWidth / 60
  const minSize = maxSize * 0.6

  const fit = (lines, note) => {
    const longest = Math.max(...lines.map(l => l.length), note ? note.length * NOTE_SCALE : 0)
    const rows = lines.length + (note ? NOTE_SCALE : 0)
    const size = Math.min(maxSize, (0.9 * width) / (longest * CHAR), (0.9 * height) / (rows * LINE))
    return { lines, note, size }
  }
  const biggest = options => options.reduce((best, option) => (option.size > best.size ? option : best))

  const words = name.split(' ')
  const wrapped = [16, 10, 7].map(maxChars => wrapWords(words, maxChars))
  const note = reportCount(count)
  const tiers = [
    biggest(wrapped.map(lines => fit(lines, note))),
    biggest(wrapped.map(lines => fit(lines))),
    fit([words.slice(-2).join(' ')]),
  ]
  const { lines, note: shownNote, size } = tiers.find(tier => tier.size >= minSize) || fit([words[words.length - 1]])

  const { x, y } = centroid(pts)
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

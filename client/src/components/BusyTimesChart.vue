<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '../api'
import { DAY_NAMES, hourLabel, percent, sgNow, busiestHour, busiestSummary } from '../seats'

// "Busiest times": how full a room usually is through the day, from the last 8 weeks of check-ins.
// One column per hour (7 am to 11 pm), height = the share of seats usually taken. Pick a weekday above it.
// Hover or tab to a column for the details; "Show as a table" gives the same numbers without the chart.
const props = defineProps({ spotId: { type: String, required: true } })

const pattern = ref(null)
const error = ref('')
const now = sgNow()
const day = ref(now.day)
const hovered = ref(null) // hour under the mouse / keyboard focus

watch(() => props.spotId, id => {
  pattern.value = null
  error.value = ''
  api(`/api/checkins/${id}/pattern`)
    .then(data => { if (props.spotId === id) pattern.value = data })
    .catch(e => { if (props.spotId === id) error.value = e.message })
}, { immediate: true })

const WEEK = [1, 2, 3, 4, 5, 6, 0] // Monday first
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 7 am .. 11 pm

// ---------- geometry (SVG units = screen pixels) ----------
// W follows the chart's real width so the labels stay 12px on a phone instead of shrinking with the drawing.
const chartEl = ref(null)
const W = ref(560)
let resizeObserver
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => { W.value = Math.max(300, Math.round(entry.contentRect.width)) })
  if (chartEl.value) resizeObserver.observe(chartEl.value)
})
onUnmounted(() => resizeObserver?.disconnect())
// the chart only appears once the data has loaded, so start watching it then
watch(chartEl, el => { if (el) resizeObserver?.observe(el) })

const H = 210
const M = { top: 22, right: 6, bottom: 28, left: 44 } // left fits "100%"
const plotH = H - M.top - M.bottom
const band = computed(() => (W.value - M.left - M.right) / HOURS.length)
const barW = computed(() => Math.min(22, band.value * 0.62)) // thin columns; the rest of the band is air
const baseY = M.top + plotH
const y = share => baseY - share * plotH // 0 .. 1 (every seat taken) -> baseline .. top
const GRID = [0.25, 0.5, 0.75, 1]
const bandX = i => M.left + i * band.value

// a column with a 4px rounded top and a square foot on the baseline
function barPath(i, share) {
  const w = barW.value
  const x = bandX(i) + (band.value - w) / 2
  const top = y(share)
  const r = Math.min(4, baseY - top)
  return `M${x},${baseY} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${baseY} Z`
}

const cells = computed(() => HOURS.map((hour, i) => ({ hour, i, cell: pattern.value?.days[day.value][hour] || null })))
const dayHasData = computed(() => cells.value.some(c => c.cell))
const peak = computed(() => busiestHour(pattern.value, day.value))
const summary = computed(() => busiestSummary(pattern.value, day.value))
const isToday = computed(() => day.value === now.day)

function describe({ hour, cell }) {
  if (!cell) return `${hourLabel(hour)}: nobody checked in yet`
  const people = Math.round(cell.people * 10) / 10
  return `${hourLabel(hour)}: ~${percent(cell.taken)} of seats taken (${people} ${people === 1 ? 'person' : 'people'} on average)`
}

const tip = computed(() => {
  const c = cells.value.find(c => c.hour === hovered.value)
  if (!c) return null
  // as a % of the chart width so it follows the SVG as it scales; kept away from the edges
  const centre = ((bandX(c.i) + band.value / 2) / W.value) * 100
  return { text: describe(c), left: Math.min(84, Math.max(16, centre)) }
})
</script>

<template>
  <section class="busy" aria-labelledby="busy-title">
    <div class="busy-head">
      <div>
        <h2 id="busy-title">Busiest times</h2>
        <p class="lede">How full this room usually gets, hour by hour</p>
      </div>
      <div class="days" role="group" aria-label="Day of the week">
        <button
          v-for="d in WEEK" :key="d" type="button" class="day" :class="{ today: d === now.day }"
          :aria-pressed="day === d" :aria-label="`${DAY_NAMES[d]}${d === now.day ? ' (today)' : ''}`" @click="day = d"
        >{{ DAY_NAMES[d].slice(0, 3) }}</button>
      </div>
    </div>

    <p v-if="error" class="muted">Couldn't load busiest times.</p>
    <p v-else-if="!pattern" class="muted">Loading busiest times…</p>
    <p v-else-if="!pattern.total" class="empty">
      Nobody has checked in here in the last 8 weeks, so we can't tell when it's busy yet.
      Tapping "Check in here" on the floor plan builds this chart up.
    </p>

    <template v-else>
      <p v-if="dayHasData" class="summary">
        <span class="summary-icon" aria-hidden="true">{{ summary ? '⏰' : '✎' }}</span>
        {{ summary || 'Only a few check-ins so far, so this is a rough guide.' }}
      </p>

      <div ref="chartEl" class="chart" :class="{ blank: !dayHasData }" @mouseleave="hovered = null">
        <!-- a day with no check-ins: a note over the empty chart instead of a bare grid -->
        <p v-if="!dayHasData" class="blank-note">
          <strong>No check-ins on {{ DAY_NAMES[day] }}s yet</strong>
          <span>Check in when you study here and this fills up.</span>
        </p>
        <svg :viewBox="`0 0 ${W} ${H}`" role="group" :aria-label="`Share of seats usually taken by hour on ${DAY_NAMES[day]}s`">
          <!-- recessive grid: one hairline per quarter of the seats -->
          <g class="grid">
            <template v-for="share in GRID" :key="share">
              <line :x1="M.left" :x2="W - M.right" :y1="y(share)" :y2="y(share)" />
              <text :x="M.left - 8" :y="y(share)" text-anchor="end" dominant-baseline="middle">{{ percent(share) }}</text>
            </template>
            <line class="axis" :x1="M.left" :x2="W - M.right" :y1="baseY" :y2="baseY" />
          </g>

          <!-- this hour, when looking at today -->
          <g v-if="isToday && now.hour >= HOURS[0] && now.hour <= HOURS[HOURS.length - 1]" class="now">
            <rect :x="bandX(now.hour - HOURS[0])" :y="M.top" :width="band" :height="plotH" />
            <text :x="bandX(now.hour - HOURS[0]) + band / 2" :y="M.top - 8" text-anchor="middle">now</text>
          </g>

          <g v-for="c in cells" :key="c.hour">
            <path v-if="c.cell" class="bar" :class="{ hovered: hovered === c.hour, 'peak-bar': peak?.hour === c.hour }" :d="barPath(c.i, c.cell.taken)" />
            <!-- the hit target is the whole band, not just the column -->
            <rect
              class="hit" :x="bandX(c.i)" :y="M.top" :width="band" :height="plotH"
              tabindex="0" role="img" :aria-label="describe(c)"
              @mouseenter="hovered = c.hour" @focus="hovered = c.hour" @blur="hovered = null"
            />
            <text v-if="c.hour % 3 === 1" class="x" :x="bandX(c.i) + band / 2" :y="H - 8" text-anchor="middle">{{ hourLabel(c.hour) }}</text>
          </g>

          <!-- one direct label: the busiest hour -->
          <text
            v-if="peak && !(isToday && peak.hour === now.hour)" class="peak"
            :x="bandX(peak.hour - HOURS[0]) + band / 2" :y="y(peak.taken) - 6" text-anchor="middle"
          >busiest</text>
        </svg>
        <div v-if="tip" class="tip" :style="{ left: `${tip.left}%` }" aria-hidden="true">{{ tip.text }}</div>
      </div>

      <details v-if="dayHasData" class="table-view">
        <summary>Show as a table</summary>
        <table>
          <thead><tr><th scope="col">Hour</th><th scope="col">Seats taken</th><th scope="col">People (average)</th></tr></thead>
          <tbody>
            <tr v-for="c in cells.filter(c => c.cell)" :key="c.hour">
              <th scope="row">{{ hourLabel(c.hour) }}</th><td>~{{ percent(c.cell.taken) }}</td><td>{{ Math.round(c.cell.people * 10) / 10 }}</td>
            </tr>
          </tbody>
        </table>
      </details>

      <p class="foot">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 7.2v4M8 4.6v.2" /></svg>
        Based on {{ pattern.total }} check-in{{ pattern.total === 1 ? '' : 's' }} from the last 8 weeks, Singapore time.
        Only counts people who checked in through the app.
      </p>
    </template>
  </section>
</template>

<style scoped>
/* minmax(0, 1fr) lets the column shrink on a phone instead of being held open by the chart; the app centres text by default */
.busy { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; text-align: left; font-family: 'Patrick Hand', system-ui, sans-serif; font-size: 1.05rem; }
.busy-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px 16px; }
h2 { margin: 0; font: 700 2.4rem/1.1 var(--nb-heading); color: var(--nb-ink); }
.busy p { margin: 0; }
.lede { color: var(--nb-muted); font-size: 0.95rem; }

.days { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.day {
  position: relative;
  padding: 2px 12px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.day:hover { border-style: dashed; }
.day[aria-pressed='true'] { background: var(--nb-highlight); color: #28263f; font-weight: 700; box-shadow: 2px 2px 0 var(--nb-shadow); }
.day[aria-pressed='true']:hover { border-style: solid; }
/* a pink dot under today's day */
.day.today::after { content: ''; position: absolute; left: 50%; bottom: -8px; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: var(--nb-pink); }

/* the busiest hour, written on a strip of highlighter */
.summary {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  padding: 6px 14px;
  border: 2px solid #28263f;
  border-radius: 8px;
  background: var(--nb-note);
  color: #28263f;
  font-size: 1.1rem;
  transform: rotate(-0.4deg);
}
.summary-icon { flex: none; font-size: 1.1rem; }
.muted, .foot { color: var(--nb-muted); }
.foot { display: flex; align-items: center; gap: 6px; padding-top: 10px; border-top: 1.5px dashed var(--nb-rule-light); font-size: 0.9rem; }
.foot svg { flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.empty { padding: 12px; border: 1.5px dashed var(--nb-rule); border-radius: 6px; color: var(--nb-muted); }

.chart { position: relative; margin-top: 4px; }
.chart > svg { display: block; width: 100%; height: auto; overflow: visible; font-family: 'Patrick Hand', system-ui, sans-serif; }
/* an empty day: the grid fades back behind a note */
.chart.blank > svg { opacity: 0.45; }
.blank-note {
  position: absolute;
  top: 42%;
  left: 50%;
  z-index: 1;
  display: grid;
  gap: 2px;
  padding: 12px 20px;
  border: 2px dashed var(--nb-ink);
  border-radius: 10px;
  background: var(--nb-sheet);
  text-align: center;
  transform: translate(-50%, -50%) rotate(-1deg);
}
.blank-note span { color: var(--nb-muted); font-size: 0.95rem; }

/* pencil-like dashed grid and a solid ink baseline */
.grid line { stroke: var(--nb-rule-light); stroke-width: 1; stroke-dasharray: 4 5; }
.grid .axis { stroke: var(--nb-ink); stroke-width: 2; stroke-dasharray: none; stroke-linecap: round; }
.grid text, .x { fill: var(--nb-muted); font-size: 14px; }

/* this hour: a yellow highlighter stripe with a dashed edge */
.now rect { fill: var(--nb-highlight); fill-opacity: 0.4; stroke: var(--nb-highlight); stroke-width: 2; stroke-dasharray: 6 4; rx: 6; }
.now text, .peak { fill: var(--nb-ink); font-size: 15px; font-weight: 700; }

/* the columns: blue sticky-note strips in ink, the busiest one pink, the hovered one yellow */
.bar { fill: var(--nb-note-blue); stroke: #28263f; stroke-width: 1.5; stroke-linejoin: round; transition: fill 0.1s; }
.bar.peak-bar { fill: var(--nb-note-pink); }
.bar.hovered { fill: var(--nb-highlight); }
.hit { fill: transparent; cursor: default; outline: none; }
.hit:focus-visible { stroke: var(--nb-focus); stroke-width: 2; }

.tip {
  position: absolute;
  top: -6px;
  transform: translate(-50%, -100%);
  padding: 4px 10px;
  border: 2px solid var(--nb-ink);
  border-radius: 8px;
  background: var(--nb-card);
  box-shadow: 3px 3px 0 var(--nb-shadow);
  color: var(--nb-ink);
  font-size: 0.85rem;
  white-space: nowrap;
  pointer-events: none;
}

.table-view summary { width: fit-content; cursor: pointer; color: var(--nb-ink); font-size: 0.95rem; text-decoration: underline dashed var(--nb-rule); text-underline-offset: 4px; }
.table-view summary:hover { text-decoration-style: solid; }
.table-view table { margin-top: 10px; border-collapse: collapse; font-size: 0.95rem; }
.table-view th, .table-view td { padding: 4px 18px 4px 0; text-align: left; border-bottom: 1px dashed var(--nb-rule-light); }
.table-view thead th { border-bottom: 2px solid var(--nb-ink); }

.day:focus-visible, summary:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

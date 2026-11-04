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
      <h2 id="busy-title">Busiest times</h2>
      <div class="days" role="group" aria-label="Day of the week">
        <button
          v-for="d in WEEK" :key="d" type="button" class="day"
          :aria-pressed="day === d" :aria-label="DAY_NAMES[d]" @click="day = d"
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
      <p class="summary">
        {{ summary || (dayHasData ? `Only a few check-ins so far, so this is a rough guide.` : `Nobody has checked in on ${DAY_NAMES[day]}s yet.`) }}
      </p>

      <div ref="chartEl" class="chart" @mouseleave="hovered = null">
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
            <path v-if="c.cell" class="bar" :class="{ hovered: hovered === c.hour }" :d="barPath(c.i, c.cell.taken)" />
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

      <details class="table-view">
        <summary>Show as a table</summary>
        <table>
          <thead><tr><th scope="col">Hour</th><th scope="col">Seats taken</th><th scope="col">People (average)</th></tr></thead>
          <tbody>
            <tr v-for="c in cells.filter(c => c.cell)" :key="c.hour">
              <th scope="row">{{ hourLabel(c.hour) }}</th><td>~{{ percent(c.cell.taken) }}</td><td>{{ Math.round(c.cell.people * 10) / 10 }}</td>
            </tr>
            <tr v-if="!dayHasData"><td colspan="3">Nobody has checked in on {{ DAY_NAMES[day] }}s yet.</td></tr>
          </tbody>
        </table>
      </details>

      <p class="foot">
        Based on {{ pattern.total }} check-in{{ pattern.total === 1 ? '' : 's' }} from the last 8 weeks, Singapore time.
        Only counts people who checked in through the app.
      </p>
    </template>
  </section>
</template>

<style scoped>
/* minmax(0, 1fr) lets the column shrink on a phone instead of being held open by the chart; the app centres text by default */
.busy { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; text-align: left; }
.busy-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
h2 { margin: 0; font: 700 2.4rem/1.1 var(--nb-heading); color: var(--nb-ink); }
.busy p { margin: 0; }

.days { display: flex; flex-wrap: wrap; gap: 5px; }
.day {
  padding: 1px 11px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
.day[aria-pressed='true'] { background: var(--nb-highlight); color: #28263f; font-weight: 700; }

.summary { font-weight: 700; }
.muted, .foot { color: var(--nb-muted); }
.foot { font-size: 0.85rem; }
.empty { padding: 12px; border: 1.5px dashed var(--nb-rule); border-radius: 6px; color: var(--nb-muted); }

.chart { position: relative; }
svg { display: block; width: 100%; height: auto; overflow: visible; font-family: system-ui, sans-serif; }

.grid line { stroke: #e6e2ee; stroke-width: 1; }
.grid .axis { stroke: var(--nb-rule); }
.grid text, .x { fill: var(--nb-muted); font-size: 12px; }

.now rect { fill: var(--nb-highlight); opacity: 0.45; }
.now text, .peak { fill: var(--nb-ink); font-size: 12px; font-weight: 700; }

.bar { fill: #4b3fb5; transition: opacity 0.1s; }
.bar.hovered { opacity: 0.75; }
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

.table-view summary { cursor: pointer; color: var(--nb-ink); font-weight: 700; font-size: 0.92rem; }
.table-view table { margin-top: 8px; border-collapse: collapse; font-size: 0.9rem; }
.table-view th, .table-view td { padding: 3px 14px 3px 0; text-align: left; border-bottom: 1px solid var(--nb-rule-light); }

.day:focus-visible, summary:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { alertLabel, alertIcon } from '../alerts'
import { timeAgo } from '../reviews'
import { seatsFreeText } from '../seats'
import { heatColour, heatTextColour, heatLabel, reportCount, noiseLabel, parsePoints, polygonArea, boundingBox } from '../heatmap'

// Clickable floorplan: clicking a room emits 'select' with its study spot, and selectedId highlights one room.
// Hovering (or tabbing to) a room shows a popup with its seats free, power sockets and any reported issues.
// plan comes from floorplans.js, spots are the building's study spots on this floor.
const props = defineProps({
  plan: { type: Object, required: true },
  spots: { type: Array, required: true },
  selectedId: { type: String, default: null },
  // optional (building page): spot _id -> 'top' | 'mid' | 'low' | 'none' colours each room by its rating
  tones: { type: Object, default: null },
  // optional: spot _ids to fade out, e.g. rooms that don't match the chosen filters
  dimmedIds: { type: Array, default: () => [] },
  // optional: spot _id -> active alerts (GET /api/alerts?spots=); rooms with alerts get a red outline
  alerts: { type: Object, default: null },
  // optional: spot _id -> people checked in right now (GET /api/checkins?spots=); the popup shows seats free
  checkedIn: { type: Object, default: null },
  // optional (noise heatmap): spot _id -> { score, current, count }, and rooms not in it have no reports. Overrides tones.
  heat: { type: Object, default: null },
})
const emit = defineEmits(['select'])

// only draw rooms that have a matching study spot in the database
const rooms = computed(() => {
  const byName = new Map(props.spots.map(s => [s.name, s]))
  return props.plan.rooms.filter(r => byName.has(r.spotName)).map(r => ({ ...r, spot: byName.get(r.spotName) }))
})

function toneClass(room) {
  if (props.heat) return 'tone-heat'
  return props.tones ? `tone-${props.tones[room.spot._id] || 'none'}` : ''
}

function roomClass(room) {
  return [
    toneClass(room),
    {
      selected: props.selectedId === room.spot._id,
      dimmed: props.dimmedIds.includes(room.spot._id),
      alerted: alertsFor(room).length > 0,
    },
  ]
}

const alertsFor = room => props.alerts?.[room.spot._id] || []
const checkedInFor = room => props.checkedIn?.[room.spot._id] || 0

// a room's colour, or the stripes when it has no reports
function roomStyle(room) {
  if (!props.heat) return null
  const report = props.heat[room.spot._id]
  return { '--heat': report ? heatColour(report.score) : 'url(#heat-stripes)' }
}

function noiseText(room) {
  const report = props.heat[room.spot._id]
  if (!report) return 'No recent noise reports'
  return `Noise: ${noiseLabel(report.current)} (${reportCount(report.count)})`
}

function roomLabel(room) {
  const n = alertsFor(room).length
  const noise = props.heat ? `${noiseText(room)}, ` : ''
  return `${room.spotName}, ${noise}${room.spot.seatCount} seats${n ? `, ${n} issue${n === 1 ? '' : 's'} reported` : ''} - show details`
}

// the text written on each room. Drawn after all the rooms, so a pod's label is never covered by a neighbour.
// A room's label keeps clear of the smaller rooms that overlap it (booths and pods drawn over a big zone).
const labels = computed(() => {
  if (!props.heat) return []
  const shapes = rooms.value.map(room => {
    const pts = parsePoints(room.points)
    return { area: polygonArea(pts), box: boundingBox(pts) }
  })
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
  return rooms.value.map((room, i) => {
    const report = props.heat[room.spot._id]
    const obstacles = shapes.filter((s, j) => j !== i && s.area < shapes[i].area && overlaps(s.box, shapes[i].box)).map(s => s.box)
    return {
      key: room.spotName,
      ...heatLabel(room.points, room.spotName, report?.count ?? 0, props.plan.width, obstacles),
      colour: report ? heatTextColour(report.score) : '#28263f',
      striped: !report,
      dimmed: props.dimmedIds.includes(room.spot._id),
    }
  })
})

// long descriptions are cut short in the popup; the room panel shows them in full
const shorten = text => (text.length > 70 ? `${text.slice(0, 67)}…` : text)

// the room under the mouse (or keyboard focus), and where its popup goes.
// The popup is fixed to the screen rather than the plan, so a scrolling/zoomed plan can't cut it off:
// it goes above the room (below if there's no room above) and is pushed back inside the window.
const hovered = ref(null)
const popup = ref(null)
const popupPos = ref({ left: 0, top: 0, visible: false })
const GAP = 8

async function showPopup(room, event) {
  hovered.value = room
  const rect = event.target.getBoundingClientRect()
  popupPos.value = { left: 0, top: 0, visible: false } // measure it first, then place it
  await nextTick()
  if (hovered.value?.spotName !== room.spotName || !popup.value) return // the mouse has moved on
  const { width, height } = popup.value.getBoundingClientRect()
  let top = rect.top - height - GAP
  if (top < GAP) top = rect.bottom + GAP
  top = Math.min(top, window.innerHeight - height - GAP)
  const centre = rect.left + rect.width / 2
  const left = Math.max(GAP, Math.min(centre - width / 2, window.innerWidth - width - GAP))
  popupPos.value = { left, top, visible: true }
}

function hidePopup() {
  hovered.value = null
}

// the popup would stay put while the page or plan scrolls underneath it, so hide it instead
onMounted(() => window.addEventListener('scroll', hidePopup, true))
onUnmounted(() => window.removeEventListener('scroll', hidePopup, true))

const popupStyle = computed(() => ({
  left: `${popupPos.value.left}px`,
  top: `${popupPos.value.top}px`,
  visibility: popupPos.value.visible ? 'visible' : 'hidden',
}))
</script>

<template>
  <div class="floorplan-wrap" @mouseleave="hidePopup">
    <svg class="floorplan" :viewBox="`0 0 ${plan.width} ${plan.height}`" role="group" aria-label="Floorplan">
      <defs v-if="heat">
        <pattern id="heat-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#fffef9" />
          <rect width="5" height="12" fill="#d9d5e2" />
        </pattern>
      </defs>
      <!-- heatmap: the plan fades back, so the rooms with reports stand out from the stairs and toilets -->
      <image :class="{ 'plan-faded': heat }" :href="plan.image" :width="plan.width" :height="plan.height" />
      <polygon
        v-for="room in rooms"
        :key="room.spotName"
        :points="room.points"
        :class="roomClass(room)"
        :style="roomStyle(room)"
        tabindex="0"
        role="button"
        :aria-label="roomLabel(room)"
        @click="emit('select', room.spot)"
        @keydown.enter.prevent="emit('select', room.spot)"
        @keydown.space.prevent="emit('select', room.spot)"
        @mouseenter="showPopup(room, $event)"
        @focus="showPopup(room, $event)"
        @blur="hidePopup"
      />
      <g
        v-for="label in labels" :key="label.key" class="heat-label"
        :class="{ striped: label.striped, dimmed: label.dimmed }" :fill="label.colour" aria-hidden="true"
      >
        <text
          v-for="row in label.rows" :key="row.text" :x="label.x" :y="row.y" :font-size="row.size"
          :class="{ note: row.note }" text-anchor="middle" dominant-baseline="central"
        >{{ row.text }}</text>
      </g>
    </svg>

    <div v-if="hovered" ref="popup" class="popup" :style="popupStyle" aria-hidden="true">
      <strong>{{ hovered.spotName }}</strong>
      <span v-if="checkedInFor(hovered)">{{ seatsFreeText(checkedInFor(hovered), hovered.spot.seatCount) }}</span>
      <span v-else>{{ hovered.spot.seatCount }} seats</span>
      <span>Power sockets: {{ hovered.spot.hasPowerSocket ? 'Yes' : 'No' }}</span>
      <span v-if="heat">{{ noiseText(hovered) }}</span>
      <ul v-if="alertsFor(hovered).length" class="popup-alerts">
        <li v-for="alert in alertsFor(hovered).slice(0, 3)" :key="alert._id">
          <span>{{ alertIcon(alert.type) }} <strong>{{ alertLabel(alert.type) }}</strong> · {{ timeAgo(alert.createdAt) }}</span>
          <em v-if="alert.description">"{{ shorten(alert.description) }}"</em>
        </li>
        <li v-if="alertsFor(hovered).length > 3" class="more">+{{ alertsFor(hovered).length - 3 }} more</li>
      </ul>
      <small>Click for details</small>
    </div>
  </div>
</template>

<style scoped>
.floorplan-wrap {
  position: relative; /* the popup is placed over the plan */
}

.floorplan {
  display: block;
  width: 100%;
  height: auto;
  background: #fff; /* the plan image is drawn on white */
  border: 1px solid var(--border);
  border-radius: 8px;
}

polygon {
  fill: var(--accent-bg);
  stroke: var(--accent-border);
  stroke-width: 3;
  cursor: pointer;
  transition: fill 0.15s;
}

polygon:hover,
polygon:focus-visible {
  fill: var(--accent-border);
  outline: none;
}

/* building page: rooms coloured by rating (the plan image's labels show through) */
/* no data (no reviews, or nobody checked in): plain paper with a dashed outline, like the legend's swatch */
polygon.tone-none { fill: rgba(255, 254, 249, 0.6); stroke: #28263f; stroke-width: 2; stroke-dasharray: 6 4; }
polygon.tone-low { fill: rgba(222, 243, 214, 0.85); stroke: #28263f; stroke-width: 2; }
polygon.tone-mid { fill: rgba(164, 217, 156, 0.85); stroke: #28263f; stroke-width: 2; }
polygon.tone-top { fill: rgba(92, 176, 104, 0.85); stroke: #28263f; stroke-width: 2; }
/* or by seats free right now (the --nb-seats-* colours in style.css, shared with the seat dots) */
polygon.tone-plenty { fill: var(--nb-seats-plenty); }
polygon.tone-some { fill: var(--nb-seats-some); }
polygon.tone-few { fill: var(--nb-seats-few); }
polygon.tone-full { fill: var(--nb-seats-full); }
polygon.tone-plenty,
polygon.tone-some,
polygon.tone-few,
polygon.tone-full { fill-opacity: 0.85; stroke: #28263f; stroke-width: 2; }
/* hover and selection are purple (the app's accent), so they can't be mistaken for a rating or seats colour.
   Hover is the lighter wash and keeps the room's outline, so a reported issue's red dashes stay visible. */
polygon[class*='tone-']:hover,
polygon[class*='tone-']:focus-visible { fill: rgba(225, 221, 248, 0.9); stroke-width: 3; }
polygon[class*='tone-'].selected { fill: rgba(201, 195, 240, 0.95); stroke: #4b3fb5; stroke-width: 5; }
/* multiply lets the room labels drawn in the plan image show through the colour */
polygon[class*='tone-'] { mix-blend-mode: multiply; }
polygon.dimmed { opacity: 0.25; }
/* a reported issue: dashed red outline (after the tone rules so it wins over their stroke colour) */
polygon.alerted { stroke: var(--nb-error); stroke-width: 4; stroke-dasharray: 12 6; }

polygon.selected {
  fill: var(--accent-border);
  stroke: var(--accent);
  stroke-width: 5;
}

/* noise heatmap: the room's colour from heatmap.js or the stripes. Hover and selection only change the outline, so the colour always means the noise */
polygon.tone-heat,
polygon.tone-heat:hover,
polygon.tone-heat:focus-visible,
polygon.tone-heat.selected { fill: var(--heat); stroke: #28263f; mix-blend-mode: normal; }
polygon.tone-heat { stroke-width: 2; outline: none; }
polygon.tone-heat:hover,
polygon.tone-heat:focus-visible { stroke-width: 4; }
polygon.tone-heat.selected { stroke-width: 5; filter: drop-shadow(5px 5px 0 #28263f); }
/* a reported issue keeps its dashed red outline on the heatmap too */
polygon.tone-heat.alerted { stroke: var(--nb-error); stroke-width: 4; stroke-dasharray: 12 6; }
.plan-faded { opacity: 0.35; }
.heat-label { font-family: system-ui, sans-serif; font-weight: 700; pointer-events: none; }
.heat-label .note { font-weight: 500; }
/* a paper outline keeps the text readable across the stripes */
.heat-label.striped text { paint-order: stroke; stroke: #fffef9; stroke-width: 3px; }
.heat-label.dimmed { opacity: 0.25; }

.popup {
  position: fixed;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 150px;
  padding: 8px 12px;
  /* the shared notebook palette (style.css) */
  border: 2px solid var(--nb-ink);
  border-radius: 8px;
  background: var(--nb-card);
  color: var(--nb-ink);
  box-shadow: 4px 4px 0 var(--nb-shadow);
  font-size: 0.9em;
  white-space: nowrap;
  pointer-events: none; /* so it never blocks the room underneath */
}

.popup strong {
  color: var(--nb-ink);
}

.popup-alerts {
  display: grid;
  gap: 4px;
  max-width: 240px;
  margin: 4px 0 2px;
  padding: 6px 8px;
  border: 1.5px solid var(--nb-error);
  border-radius: 6px;
  background: var(--nb-note-pink);
  color: #28263f;
  list-style: none;
  white-space: normal; /* descriptions wrap, unlike the rest of the popup */
}
.popup-alerts li { display: grid; }
.popup-alerts strong { color: #28263f; }
.popup-alerts em { overflow-wrap: anywhere; }
.popup-alerts .more { font-style: italic; }

.popup small {
  font-style: italic;
  color: var(--nb-muted);
}
</style>

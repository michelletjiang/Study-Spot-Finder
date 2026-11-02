<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

// Clickable floorplan: clicking a room emits 'select' with its study spot, and selectedId highlights one room.
// Hovering (or tabbing to) a room shows a popup with its seats and power sockets.
// plan comes from floorplans.js, spots are the building's study spots on this floor.
const props = defineProps({
  plan: { type: Object, required: true },
  spots: { type: Array, required: true },
  selectedId: { type: String, default: null },
  // optional (building page): spot _id -> 'top' | 'mid' | 'low' | 'none' colours each room by its rating
  tones: { type: Object, default: null },
  // optional: spot _ids to fade out, e.g. rooms that don't match the chosen filters
  dimmedIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])

// only draw rooms that have a matching study spot in the database
const rooms = computed(() => {
  const byName = new Map(props.spots.map(s => [s.name, s]))
  return props.plan.rooms.filter(r => byName.has(r.spotName)).map(r => ({ ...r, spot: byName.get(r.spotName) }))
})

function roomClass(room) {
  return [
    props.tones ? `tone-${props.tones[room.spot._id] || 'none'}` : '',
    { selected: props.selectedId === room.spot._id, dimmed: props.dimmedIds.includes(room.spot._id) },
  ]
}

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
      <image :href="plan.image" :width="plan.width" :height="plan.height" />
      <polygon
        v-for="room in rooms"
        :key="room.spotName"
        :points="room.points"
        :class="roomClass(room)"
        tabindex="0"
        role="button"
        :aria-label="`${room.spotName}, ${room.spot.seatCount} seats - show details`"
        @click="emit('select', room.spot)"
        @keydown.enter.prevent="emit('select', room.spot)"
        @keydown.space.prevent="emit('select', room.spot)"
        @mouseenter="showPopup(room, $event)"
        @focus="showPopup(room, $event)"
        @blur="hidePopup"
      />
    </svg>

    <div v-if="hovered" ref="popup" class="popup" :style="popupStyle" aria-hidden="true">
      <strong>{{ hovered.spotName }}</strong>
      <span>{{ hovered.spot.seatCount }} seats</span>
      <span>Power sockets: {{ hovered.spot.hasPowerSocket ? 'Yes' : 'No' }}</span>
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
polygon.tone-none { fill: rgba(214, 240, 208, 0.35); stroke: #28263f; stroke-width: 2; }
polygon.tone-low { fill: rgba(222, 243, 214, 0.85); stroke: #28263f; stroke-width: 2; }
polygon.tone-mid { fill: rgba(164, 217, 156, 0.85); stroke: #28263f; stroke-width: 2; }
polygon.tone-top { fill: rgba(92, 176, 104, 0.85); stroke: #28263f; stroke-width: 2; }
/* hover and selection use the page's yellow highlighter, so green always means a rating */
polygon[class*='tone-']:hover,
polygon[class*='tone-']:focus-visible { fill: rgba(255, 229, 138, 0.9); stroke-width: 3; }
polygon[class*='tone-'].selected { fill: rgba(255, 210, 70, 0.95); stroke: #28263f; stroke-width: 5; }
/* multiply lets the room labels drawn in the plan image show through the colour */
polygon[class*='tone-'] { mix-blend-mode: multiply; }
polygon.dimmed { opacity: 0.25; }

polygon.selected {
  fill: var(--accent-border);
  stroke: var(--accent);
  stroke-width: 5;
}

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
  box-shadow: 4px 4px 0 var(--nb-ink);
  font-size: 0.9em;
  white-space: nowrap;
  pointer-events: none; /* so it never blocks the room underneath */
}

.popup strong {
  color: var(--nb-ink);
}

.popup small {
  font-style: italic;
  color: var(--nb-muted);
}
</style>

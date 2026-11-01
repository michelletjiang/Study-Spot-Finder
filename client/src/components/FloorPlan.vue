<script setup>
import { ref, computed } from 'vue'

// Clickable floorplan: clicking a room emits 'select' with its study spot, and selectedId highlights one room.
// Hovering (or tabbing to) a room shows a popup with its seats and power sockets.
// plan comes from floorplans.js, spots are the building's study spots on this floor.
const props = defineProps({
  plan: { type: Object, required: true },
  spots: { type: Array, required: true },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(['select'])

// only draw rooms that have a matching study spot in the database
const rooms = computed(() => {
  const byName = new Map(props.spots.map(s => [s.name, s]))
  return props.plan.rooms.filter(r => byName.has(r.spotName)).map(r => ({ ...r, spot: byName.get(r.spotName) }))
})

// the room under the mouse (or keyboard focus), and where its popup goes
const hovered = ref(null)
const popupStyle = computed(() => {
  if (!hovered.value) return {}
  const pts = hovered.value.points.split(' ').map(p => p.split(',').map(Number))
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2
  const top = Math.min(...ys)
  // percentages, so the popup stays on the room however wide the plan is drawn
  const left = `${(centreX / props.plan.width) * 100}%`
  // rooms near the top of the plan get their popup underneath instead, so it isn't cut off
  if (top / props.plan.height < 0.25) {
    return { left, top: `${(Math.max(...ys) / props.plan.height) * 100}%`, transform: 'translate(-50%, 8px)' }
  }
  return { left, top: `${(top / props.plan.height) * 100}%`, transform: 'translate(-50%, calc(-100% - 8px))' }
})
</script>

<template>
  <div class="floorplan-wrap" @mouseleave="hovered = null">
    <svg class="floorplan" :viewBox="`0 0 ${plan.width} ${plan.height}`" role="group" aria-label="Floorplan">
      <image :href="plan.image" :width="plan.width" :height="plan.height" />
      <polygon
        v-for="room in rooms"
        :key="room.spotName"
        :points="room.points"
        :class="{ selected: selectedId === room.spot._id }"
        tabindex="0"
        role="button"
        :aria-label="`${room.spotName}, ${room.spot.seatCount} seats - show details`"
        @click="emit('select', room.spot)"
        @keydown.enter.prevent="emit('select', room.spot)"
        @keydown.space.prevent="emit('select', room.spot)"
        @mouseenter="hovered = room"
        @focus="hovered = room"
        @blur="hovered = null"
      />
    </svg>

    <div v-if="hovered" class="popup" :style="popupStyle" aria-hidden="true">
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

polygon.selected {
  fill: var(--accent-border);
  stroke: var(--accent);
  stroke-width: 5;
}

.popup {
  position: absolute;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 150px;
  padding: 8px 12px;
  border: 2px solid var(--accent);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.9em;
  white-space: nowrap;
  pointer-events: none; /* so it never blocks the room underneath */
}

.popup strong {
  color: var(--text-h);
}

.popup small {
  font-style: italic;
}
</style>

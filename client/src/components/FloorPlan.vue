<script setup>
import { computed } from 'vue'

// Clickable floorplan: clicking a room emits 'select' with its study spot, and selectedId highlights one room.
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
</script>

<template>
  <svg class="floorplan" :viewBox="`0 0 ${plan.width} ${plan.height}`" role="group" aria-label="Floorplan">
    <image :href="plan.image" :width="plan.width" :height="plan.height" />
    <polygon
      v-for="room in rooms"
      :key="room.spotName"
      :points="room.points"
      :class="{ selected: selectedId === room.spot._id }"
      tabindex="0"
      role="button"
      :aria-label="`${room.spotName} - show details`"
      @click="emit('select', room.spot)"
      @keydown.enter.prevent="emit('select', room.spot)"
      @keydown.space.prevent="emit('select', room.spot)"
    >
      <title>{{ room.spotName }}</title>
    </polygon>
  </svg>
</template>

<style scoped>
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
</style>

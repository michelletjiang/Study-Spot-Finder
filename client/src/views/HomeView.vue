<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, markRaw } from 'vue'
import { api } from '../api'
import { mapStore } from '../stores/map'

// Building cards on the left, the OneMap map on the right (the minimap moves into mapBox on this page).
// Clicking a card draws the route to that building; its button opens the building.
const buildings = ref([])
const error = ref('')
const search = ref('')
const cardEls = {} // postal -> card element, for scrolling
const mapBox = ref(null)

// filters as you type, by building name or postal code (case-insensitive)
const filteredBuildings = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return buildings.value
  return buildings.value.filter(b =>
    b.buildingname.toLowerCase().includes(q) || String(b.postal).includes(q))
})

const isSelected = b => mapStore.destination?.postal === b.postal

// a building picked on the map (or a card) scrolls its card into view
watch(() => mapStore.destination, async dest => {
  if (!dest) return
  await nextTick()
  cardEls[dest.postal]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})

// before this page's DOM goes, so the map is moved back out of it first
onBeforeUnmount(() => { mapStore.dockEl = null })

onMounted(async () => {
  mapStore.dockEl = markRaw(mapBox.value) // the minimap moves in here (see MiniMap.vue)
  mapStore.clearDestination() // the map starts with just the user's location

  try {
    buildings.value = await api('/api/buildings')
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <section class="find">
    <div>
      <h2>Find a Study Spot</h2>
      <p>Tell us what you need and we'll rank the study spots near you.</p>
    </div>
    <RouterLink to="/find" class="btn btn-warning">Find the right study spot &rarr;</RouterLink>
  </section>

  <div class="split">
    <section class="buildings">
      <h2>Browse by Building</h2>
      <input v-model="search" type="search" class="form-control" placeholder="Search buildings by name or postal code">

      <div class="card-list">
        <p v-if="error">Could not load buildings: {{ error }}</p>
        <p v-else-if="buildings.length === 0">No buildings available.</p>
        <p v-else-if="filteredBuildings.length === 0">No buildings match "{{ search }}".</p>
        <!-- clicking anywhere on the card shows the route; the name is the keyboard-friendly button for it -->
        <article
          v-for="building in filteredBuildings"
          :key="building._id"
          :ref="el => { if (el) cardEls[building.postal] = el }"
          :class="['building-card', { selected: isSelected(building) }]"
          @click="mapStore.showBuilding(building)"
        >
          <button type="button" class="building-name" :aria-pressed="isSelected(building)">
            {{ building.buildingname }}
          </button>
          <p class="building-meta">{{ building.floors }} floors · Singapore {{ building.postal }}</p>
          <p v-if="isSelected(building)" class="route-hint">Route shown on the map &rarr;</p>
          <RouterLink :to="'/building/' + building.buildingname" class="btn btn-sm btn-primary" @click.stop>
            View study spots &rarr;
          </RouterLink>
        </article>
      </div>
    </section>

    <!-- the map (components/MiniMap.vue) moves in here -->
    <section ref="mapBox" class="map-box" aria-label="Map"></section>
  </div>
</template>

<style scoped>
.find {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin: 8px 16px 20px;
  padding: 14px 20px;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  text-align: left;
}

.find h2 {
  margin: 0;
}

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 0 16px 16px;
  text-align: left;
}

.buildings {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.buildings h2 {
  margin: 0;
}

/* the list scrolls beside the map instead of making the page long */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(75vh - 80px);
  overflow-y: auto;
  padding: 2px 4px 2px 2px;
}

.building-card {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.55); /* translucent like the floor cards */
  cursor: pointer;
  transition: border-color 0.15s;
}

.building-card:hover {
  border-color: var(--accent-border);
}

.building-card.selected {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.building-name {
  padding: 0;
  border: none;
  background: none;
  color: #000;
  font: inherit;
  font-size: 1.15em;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.building-meta {
  margin: 2px 0 10px;
  color: var(--text);
}

.route-hint {
  margin: -4px 0 10px;
  color: var(--accent);
  font-weight: 600;
}

.map-box {
  position: sticky;
  top: 16px;
  height: 75vh;
  min-height: 360px;
  border-radius: 14px;
}

/* phones: map on top, cards below */
@media (max-width: 760px) {
  .split {
    grid-template-columns: 1fr;
  }

  .map-box {
    order: -1;
    position: static;
    height: 50vh;
    min-height: 280px;
  }

  .card-list {
    max-height: none;
    overflow: visible;
  }
}
</style>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { favourites } from '../stores/favourites'
import { mapStore } from '../stores/map'
import FavouriteButton from '../components/FavouriteButton.vue'
import FloorPlan from '../components/FloorPlan.vue'
import SpotReviewSummary from '../components/SpotReviewSummary.vue'
import { floorplans, findFloorplan } from '../floorplans'

const route = useRoute()
const buildingName = computed(() => route.params.name)
const spots = ref([])
const error = ref('')
const loading = ref(true)
const floorFilter = ref('') // '' = all floors

// old EJS pages saved floors as typed, so treat "b1", " 3" and "Level 3" the same as "B1" and "3"
function normalizeFloor(floor) {
  return String(floor).trim().toUpperCase().replace(/^(LEVEL|LVL|L)\s*(?=\d)/, '')
}

// basements first (B2, B1), then 1, 2, 3...
function floorOrder(floor) {
  return floor.startsWith('B') ? -Number(floor.slice(1)) : Number(floor)
}

const floors = computed(() =>
  [...new Set(spots.value.map(s => normalizeFloor(s.floor)))].sort((a, b) => floorOrder(a) - floorOrder(b)))

const floorplan = computed(() => findFloorplan(buildingName.value, floorFilter.value))
const floorsWithPlans = computed(() => floors.value.filter(f => floorplans[buildingName.value]?.[f]))

function floorLabel(floor) {
  return floor.startsWith('B') ? floor : `Level ${floor}`
}

const filteredSpots = computed(() =>
  floorFilter.value ? spots.value.filter(s => normalizeFloor(s.floor) === floorFilter.value) : spots.value)

// floorplan mode: the selected spot is highlighted on the plan and its card shows rating + latest reviews
const selectedId = ref(null)
const listEl = ref(null)
const cardEls = {} // spot _id -> card element, for scrolling
watch(floorFilter, () => { selectedId.value = null })

// clicking a room on the plan: select it and scroll the list to its card
async function selectFromPlan(spot) {
  selectedId.value = spot._id
  await nextTick()
  const list = listEl.value
  const card = cardEls[spot._id]
  if (!list || !card) return
  if (list.scrollHeight > list.clientHeight) {
    list.scrollTo({ top: card.offsetTop, behavior: 'smooth' }) // side-by-side: only the list scrolls
  } else {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' }) // stacked on a phone: scroll the page
  }
}

// re-runs when the name changes too: clicking another building on the minimap reuses this page
watch(buildingName, async name => {
  if (!name) return // leaving this page
  loading.value = true
  error.value = ''
  floorFilter.value = '' // a different building has different floors
  try {
    const data = await api(`/api/buildings/${encodeURIComponent(name)}/spots`)
    spots.value = data.studySpots
    mapStore.showBuilding(data.building) // minimap zooms here and finds the fastest route
    await favourites.load()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <h2>Study Spots in {{ buildingName }}</h2>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">{{ error }}</p>
  <p v-else-if="spots.length === 0">No study spots found in this building.</p>
  <template v-else>
    <label>Floor
      <select v-model="floorFilter">
        <option value="">All floors</option>
        <option v-for="floor in floors" :key="floor" :value="floor">{{ floorLabel(floor) }}{{ floorsWithPlans.includes(floor) ? ' (floorplan)' : '' }}</option>
      </select>
    </label>
    <p v-if="!floorFilter && floorsWithPlans.length">
      Pick {{ floorsWithPlans.map(floorLabel).join(' or ') }} to see its floorplan.
    </p>
    <hr>
    <div :class="{ split: floorplan }">
      <div ref="listEl" class="spot-list">
        <div
          v-for="spot in filteredSpots"
          :key="spot._id"
          :ref="el => { if (el) cardEls[spot._id] = el }"
          :class="['spot-card', { selected: floorplan && selectedId === spot._id }]"
          @click="floorplan && (selectedId = spot._id)"
        >
          <p><strong>{{ spot.name }}</strong></p>
          Floor: {{ spot.floor }}<br>
          Seats: {{ spot.seatCount }}<br>
          Power Socket: {{ spot.hasPowerSocket ? 'Yes' : 'No' }}<br>
          <SpotReviewSummary v-if="floorplan && selectedId === spot._id" :spot="spot" />
          <RouterLink :to="`/spots/${spot._id}`">View Details &amp; Reviews</RouterLink> |
          <RouterLink :to="`/spots/${spot._id}/reviews/new`">Add a Review</RouterLink><br>
          <FavouriteButton :spot="spot" />
          <hr>
        </div>
      </div>
      <div v-if="floorplan" class="plan">
        <FloorPlan :plan="floorplan" :spots="filteredSpots" :selected-id="selectedId" @select="selectFromPlan" />
        <p class="hint">Click a room to jump to it in the list.</p>
      </div>
    </div>
  </template>
</template>

<style scoped>
.split {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 2fr;
  gap: 20px;
  align-items: start;
}

.split .spot-list {
  position: relative; /* so card.offsetTop is measured from the top of the list */
  max-height: 80vh;
  overflow-y: auto;
  padding-right: 8px;
}

.split .spot-card {
  padding: 4px 12px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.split .spot-card.selected {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.split .spot-card p {
  margin-top: 8px;
}

.plan {
  position: sticky;
  top: 16px;
}

.hint {
  font-style: italic;
  font-size: 0.9em;
}

/* phones: floorplan on top, list below, and the page scrolls instead of the list */
@media (max-width: 760px) {
  .split {
    grid-template-columns: 1fr;
  }

  .plan {
    order: -1;
    position: static;
  }

  .split .spot-list {
    max-height: none;
    overflow: visible;
  }
}
</style>

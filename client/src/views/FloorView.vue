<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useBuildingSpots } from '../buildingSpots'
import { normalizeFloor, floorLabel } from '../floors'
import { findFloorplan, sectionOf } from '../floorplans'
import FavouriteButton from '../components/FavouriteButton.vue'
import FloorPlan from '../components/FloorPlan.vue'
import SpotReviewSummary from '../components/SpotReviewSummary.vue'

// One floor of a building: the spot list, and its floorplan beside it when there is one.
// /building/:name/floor/:floor?spot=<id> opens with that spot selected (used by the building page's floorplan preview)
const route = useRoute()
const buildingName = computed(() => route.params.name)
const floor = computed(() => normalizeFloor(route.params.floor || ''))
const { spots, loading, error } = useBuildingSpots(buildingName)

// the building's own floor only: a library inside it (KGC) has its own tab on the building page
const floorSpots = computed(() => spots.value.filter(s => normalizeFloor(s.floor) === floor.value && !sectionOf(buildingName.value, s.name)))
const floorplan = computed(() => findFloorplan(buildingName.value, floor.value))

// floorplan mode: the selected spot is highlighted on the plan and its card shows rating + latest reviews
const selectedId = ref(null)
const listEl = ref(null)
const cardEls = {} // spot _id -> card element, for scrolling

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

// a new floor (or building) starts with nothing selected, unless ?spot= picks one once the spots have loaded
watch([floorSpots, loading, () => route.query.spot], () => {
  if (loading.value) return // the cards aren't on the page yet
  const spot = floorSpots.value.find(s => s._id === route.query.spot)
  if (spot) selectFromPlan(spot)
  else selectedId.value = null
}, { immediate: true })
</script>

<template>
  <RouterLink :to="{ path: `/building/${buildingName}`, query: { floor } }">&larr; All floors of {{ buildingName }}</RouterLink>
  <h2>{{ buildingName }} &middot; {{ floorLabel(floor) }}</h2>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">{{ error }}</p>
  <p v-else-if="floorSpots.length === 0">No study spots on this floor yet.</p>
  <div v-else :class="{ split: floorplan }">
    <div ref="listEl" class="spot-list">
      <div
        v-for="spot in floorSpots"
        :key="spot._id"
        :ref="el => { if (el) cardEls[spot._id] = el }"
        :class="['spot-card', { selected: floorplan && selectedId === spot._id }]"
        @click="floorplan && (selectedId = spot._id)"
      >
        <p><strong>{{ spot.name }}</strong></p>
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
      <FloorPlan :plan="floorplan" :spots="floorSpots" :selected-id="selectedId" @select="selectFromPlan" />
      <p class="hint">Click a room to jump to it in the list.</p>
    </div>
  </div>
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

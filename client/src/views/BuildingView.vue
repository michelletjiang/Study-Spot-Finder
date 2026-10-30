<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBuildingSpots } from '../buildingSpots'
import { normalizeFloor, floorOrder, floorLabel } from '../floors'
import { floorplans, findFloorplan } from '../floorplans'
import FloorPlan from '../components/FloorPlan.vue'

// A building's floors on the left and the chosen floor's floorplan on the right.
// The chosen floor is kept in ?floor= so the floor page's "All floors" link comes back to it.
const route = useRoute()
const router = useRouter()
const buildingName = computed(() => route.params.name)
const { spots, loading, error } = useBuildingSpots(buildingName)

// only floors with something to show: a study spot or a floorplan (so e.g. LKS level 1 isn't listed)
const floors = computed(() => {
  const all = new Set(Object.keys(floorplans[buildingName.value] || {}))
  for (const s of spots.value) all.add(normalizeFloor(s.floor))
  return [...all].sort((a, b) => floorOrder(a) - floorOrder(b))
})

const spotsOn = floor => spots.value.filter(s => normalizeFloor(s.floor) === floor)
const hasPlan = floor => !!findFloorplan(buildingName.value, floor)

// ?floor= if it's valid, otherwise the first floor with a floorplan, otherwise the first floor
const selectedFloor = computed(() =>
  floors.value.includes(route.query.floor) ? route.query.floor : floors.value.find(hasPlan) || floors.value[0])
const selectedPlan = computed(() => findFloorplan(buildingName.value, selectedFloor.value))
const selectedSpots = computed(() => spotsOn(selectedFloor.value))

function chooseFloor(floor) {
  router.replace({ query: { floor } })
}

function floorPath(floor) {
  return `/building/${buildingName.value}/floor/${floor}`
}

// clicking a room in the preview opens that floor with the room already selected
function openSpot(spot) {
  router.push({ path: floorPath(selectedFloor.value), query: { spot: spot._id } })
}
</script>

<template>
  <h2>{{ buildingName }}</h2>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">{{ error }}</p>
  <p v-else-if="floors.length === 0">No study spots in this building yet.</p>
  <div v-else class="split">
    <nav class="floor-list" aria-label="Floors">
      <!-- a div, not a button, because a button can't contain the arrow link -->
      <div v-for="floor in floors" :key="floor" :class="['floor-card', { selected: floor === selectedFloor }]">
        <button class="floor-select" :aria-pressed="floor === selectedFloor" @click="chooseFloor(floor)">
          <strong>{{ floorLabel(floor) }}</strong>
          <small>
            {{ spotsOn(floor).length }} study spot{{ spotsOn(floor).length === 1 ? '' : 's' }}{{ hasPlan(floor) ? ' · floorplan' : '' }}
          </small>
        </button>
        <RouterLink
          v-if="spotsOn(floor).length"
          :to="floorPath(floor)"
          class="floor-open"
          :aria-label="`View the study spots on ${floorLabel(floor)}`"
          :title="`View the study spots on ${floorLabel(floor)}`"
        >&rarr;</RouterLink>
      </div>
    </nav>

    <section v-if="selectedFloor" class="plan">
      <h3>{{ floorLabel(selectedFloor) }}</h3>
      <p v-if="!selectedSpots.length">No study spots on this floor yet.</p>
      <template v-if="selectedPlan">
        <FloorPlan :plan="selectedPlan" :spots="selectedSpots" @select="openSpot" />
        <p class="hint">Click a room to open it.</p>
      </template>
      <p v-else class="no-plan">No floorplan for this floor yet.</p>
    </section>
  </div>
</template>

<style scoped>
.split {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 3fr;
  gap: 20px;
  align-items: start;
}

.floor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.floor-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.55); /* translucent so the notebook-paper lines show through */
}

.floor-card:hover {
  border-color: var(--accent-border);
}

.floor-card.selected {
  border-color: var(--accent);
  background: var(--accent-bg);
}

/* fills the card, so clicking anywhere but the arrow previews the floor */
.floor-select {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 14px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.floor-open {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 1.3em;
  text-decoration: none;
  transition: transform 0.15s;
}

.floor-open:hover,
.floor-open:focus-visible {
  transform: translateX(3px);
}

.plan h3 {
  margin-top: 0;
}

.hint {
  font-style: italic;
  font-size: 0.9em;
}

.no-plan {
  padding: 40px 16px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  text-align: center;
}

/* phones: floors become a wrapping row of cards above the plan */
@media (max-width: 760px) {
  .split {
    grid-template-columns: 1fr;
  }

  .floor-list {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>

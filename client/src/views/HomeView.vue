<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, onUnmounted, markRaw } from 'vue'
import { api } from '../api'
// The shared minimap state.
import { mapStore } from '../stores/map'
import BuildingFolder from '../components/BuildingFolder.vue'

// Building folders on the left, the OneMap map on the right (the minimap moves into mapBox on this page).
// Clicking a folder draws the route to that building; its link opens the building.

// The buildings from the server.
const buildings = ref([])
const spotCounts = ref(null) // { buildingName: count }, null until loaded (or if loading failed)
const loading = ref(true)
const error = ref('')
const search = ref('')
const mapBox = ref(null)
const folderEls = {} // postal -> folder wrapper, for scrolling it into view

// the open/closed badges use this; refreshed every minute so "Closes in 25 min" counts down
const now = ref(new Date())
let timer

// filters as you type, by building name or postal code (case-insensitive)
const filteredBuildings = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return buildings.value
  return buildings.value.filter(b =>
    b.buildingname.toLowerCase().includes(q) || String(b.postal).includes(q))
})

const isSelected = b => mapStore.destination?.postal === b.postal

// a building picked on the map (or a folder) scrolls its folder into view
watch(() => mapStore.destination, async dest => {
  if (!dest) return
  await nextTick()
  folderEls[dest.postal]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})

async function loadBuildings() {
  loading.value = true
  error.value = ''
  try {
    // GET /api/buildings.
    buildings.value = await api('/api/buildings')
  } catch (e) {
    // Show the error text.
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// spot counts are a nice extra: if they fail, the cards just leave them out
async function loadSpotCounts() {
  try {
    const counts = {}
    for (const spot of await api('/api/spots')) counts[spot.buildingName] = (counts[spot.buildingName] || 0) + 1
    spotCounts.value = counts
  } catch (e) {
    console.error('Could not load spot counts:', e.message)
  }
}

onMounted(() => {
  mapStore.dockEl = markRaw(mapBox.value) // the minimap moves in here (see MiniMap.vue)
  mapStore.clearDestination() // the map starts with just the user's location
  loadBuildings()
  loadSpotCounts()
  timer = setInterval(() => (now.value = new Date()), 60_000)
})

// before this page's DOM goes, so the map is moved back out of it first
onBeforeUnmount(() => { mapStore.dockEl = null })

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="home">
    <header class="top">
      <div>
        <h1>Find a study spot</h1>
        <p class="intro">Pick a building to see the way there and its study spots.</p>
      </div>
      <RouterLink to="/find" class="find-link">Rank spots by what I need &rarr;</RouterLink>
    </header>

    <div class="split">
      <section class="buildings" aria-label="Buildings">
        <input v-model="search" class="search" type="search" placeholder="Search buildings by name or postal code"
               aria-label="Search buildings by name or postal code">

        <p v-if="loading" class="state">Loading buildings…</p>
        <div v-else-if="error" class="state error">
          Could not load buildings: {{ error }}
          <button type="button" @click="loadBuildings">Try again</button>
        </div>
        <p v-else-if="buildings.length === 0" class="state">No buildings available yet.</p>
        <p v-else-if="filteredBuildings.length === 0" class="state">No buildings match "{{ search }}".</p>
        <div v-else class="folders">
          <div v-for="building in filteredBuildings" :key="building._id"
               :ref="el => { if (el) folderEls[building.postal] = el }">
            <BuildingFolder
              :building="building"
              :spot-count="spotCounts ? spotCounts[building.buildingname] || 0 : null"
              :now="now"
              :selected="isSelected(building)"
              @select="mapStore.showBuilding(building)"
            />
          </div>
        </div>
      </section>

      <!-- the map (components/MiniMap.vue) moves in here -->
      <section ref="mapBox" class="map-box" aria-label="Map"></section>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 8px 24px 40px 48px; /* left padding clears the notebook's pink margin line */
  text-align: left;
  color: #28263f;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
  margin-bottom: 18px;
}

h1 {
  margin: 28px 0 6px;
  font: 700 clamp(2.4rem, 5vw, 3.6rem)/1.1 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.5px;
  color: #28263f;
}

.intro {
  color: #6b6880;
}

/* drawn like the folders: ink outline, hard shadow, highlighter yellow */
.find-link {
  padding: 10px 18px;
  font: 700 1rem Arial, sans-serif;
  color: #28263f;
  text-decoration: none;
  background: #ffe58a;
  border: 2px solid #28263f;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #28263f;
  transition: transform 0.1s, box-shadow 0.1s;
}
.find-link:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #28263f;
}
.find-link:focus-visible {
  outline: 3px solid #4b3fb5;
  outline-offset: 2px;
}

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  align-items: start;
}

.buildings {
  min-width: 0;
}

.search {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 30px;
  padding: 10px 14px;
  font: 1rem Arial, sans-serif;
  color: #28263f;
  background: #fffdf7;
  border: 2px solid #28263f;
  border-radius: 10px;
}
.search:focus-visible {
  outline: 3px solid #4b3fb5;
  outline-offset: 2px;
}

.folders {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 30px 26px;
}

/* the map stays in view while the folders scroll past */
.map-box {
  position: sticky;
  top: 16px;
  height: calc(100vh - 240px); /* short enough that its route panel is on screen without scrolling */
  min-height: 420px;
  max-height: 720px;
  border: 2px solid #28263f;
  border-radius: 14px;
  box-shadow: 6px 6px 0 #28263f;
  overflow: hidden;
}

.state {
  padding: 14px 18px;
  border: 2px dashed #28263f;
  border-radius: 10px;
  background: #fffdf7;
}
.state.error {
  border-style: solid;
  border-color: #c2414b;
  background: #ffe1e3;
  color: #7d1f27;
}
.state button {
  margin-left: 10px;
  padding: 4px 12px;
  font: 700 0.9rem Arial, sans-serif;
  border: 2px solid currentColor;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  cursor: pointer;
}

/* phones: map on top, folders below */
@media (max-width: 760px) {
  .home { padding-left: 16px; padding-right: 16px; }

  .split {
    grid-template-columns: 1fr;
  }

  .map-box {
    order: -1;
    position: static;
    height: 50vh;
    min-height: 280px;
  }
}
</style>

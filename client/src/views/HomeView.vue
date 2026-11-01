<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api'
import { mapStore } from '../stores/map'
import BuildingFolder from '../components/BuildingFolder.vue'

const buildings = ref([])
const spotCounts = ref(null) // { buildingName: count }, null until loaded (or if loading failed)
const loading = ref(true)
const error = ref('')
const search = ref('')

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

async function loadBuildings() {
  loading.value = true
  error.value = ''
  try {
    buildings.value = await api('/api/buildings')
  } catch (e) {
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
  mapStore.clearDestination() // minimap goes back to just the user's location
  loadBuildings()
  loadSpotCounts()
  timer = setInterval(() => (now.value = new Date()), 60_000)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="home">
    <h1>Find a study spot</h1>
    <p class="intro">Pick a building to see its floors and study spots.</p>

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
      <BuildingFolder
        v-for="building in filteredBuildings"
        :key="building._id"
        :building="building"
        :spot-count="spotCounts ? spotCounts[building.buildingname] || 0 : null"
        :now="now"
      />
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 8px 24px 140px 48px; /* left padding clears the notebook's pink margin line; bottom clears the minimap */
  text-align: left;
  color: #28263f;
}

h1 {
  margin: 28px 0 6px;
  font: 700 clamp(2.4rem, 5vw, 3.6rem)/1.1 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.5px;
  color: #28263f;
}

.intro {
  margin-bottom: 18px;
  color: #6b6880;
}

.search {
  width: min(520px, 100%);
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
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 30px 26px;
}

.state {
  padding: 14px 18px;
  border: 2px dashed #28263f;
  border-radius: 10px;
  background: #fffdf7;
  max-width: 520px;
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

@media (max-width: 600px) {
  .home { padding-left: 16px; padding-right: 16px; }
}
</style>

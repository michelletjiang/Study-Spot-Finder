<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { mapStore } from '../stores/map'

const buildings = ref([])
const error = ref('')
const search = ref('')

// filters as you type, by building name or postal code (case-insensitive)
const filteredBuildings = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return buildings.value
  return buildings.value.filter(b =>
    b.buildingname.toLowerCase().includes(q) || String(b.postal).includes(q))
})

onMounted(async () => {
  mapStore.clearDestination() // minimap goes back to just the user's location

  try {
    buildings.value = await api('/api/buildings')
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <h2>Find a Study Spot</h2>
  <p>Select a building to see available study spots.</p>

  <input v-model="search" type="search" placeholder="Search buildings by name or postal code">

  <p v-if="error">Could not load buildings: {{ error }}</p>
  <p v-else-if="buildings.length === 0">No buildings available.</p>
  <p v-else-if="filteredBuildings.length === 0">No buildings match "{{ search }}".</p>
  <div v-else v-for="building in filteredBuildings" :key="building._id">
    <p><strong>Building: {{ building.buildingname }}</strong></p>
    Floors: {{ building.floors }}<br>
    Postal Code: {{ building.postal }}<br>
    <RouterLink :to="'/building/' + building.buildingname">View Study Spots</RouterLink>
    <hr>
  </div>
</template>
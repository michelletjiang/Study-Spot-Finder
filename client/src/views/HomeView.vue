<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { mapStore } from '../stores/map'

const buildings = ref([])
const error = ref('')

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

  <p v-if="error">Could not load buildings: {{ error }}</p>
  <p v-else-if="buildings.length === 0">No buildings available.</p>
  <div v-else v-for="building in buildings" :key="building._id">
    <p><strong>Building: {{ building.buildingname }}</strong></p>
    Floors: {{ building.floors }}<br>
    Postal Code: {{ building.postal }}<br>
    <RouterLink :to="'/building/' + building.buildingname">View Study Spots</RouterLink>
    <hr>
  </div>
</template>
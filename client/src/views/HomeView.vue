<script setup>
// ACTIVE: the home page, a list of buildings.
// onMounted runs code once when the page appears.
import { ref, onMounted } from 'vue'
// The shared JSON helper.
import { api } from '../api'
// The shared minimap state.
import { mapStore } from '../stores/map'

// The buildings from the server.
const buildings = ref([])
// A message to show on failure.
const error = ref('')

// Run once when the page appears.
onMounted(async () => {
  // Existing note: the map forgets any building.
  mapStore.clearDestination() // minimap goes back to just the user's location

  try {
    // GET /api/buildings.
    buildings.value = await api('/api/buildings')
  } catch (e) {
    // Show the error text.
    error.value = e.message
  }
})
</script>

<template>
  <!-- Heading and short help text. -->
  <h2>Find a Study Spot</h2>
  <p>Select a building to see available study spots.</p>

  <!-- Error message. -->
  <p v-if="error">Could not load buildings: {{ error }}</p>
  <!-- No buildings. -->
  <p v-else-if="buildings.length === 0">No buildings available.</p>
  <!-- One block per building. -->
  <div v-else v-for="building in buildings" :key="building._id">
    <p><strong>Building: {{ building.buildingname }}</strong></p>
    Floors: {{ building.floors }}<br>
    Postal Code: {{ building.postal }}<br>
    <!-- A link to the building's spots page (BuildingSpotsView.vue). -->
    <RouterLink :to="'/building/' + building.buildingname">View Study Spots</RouterLink>
    <hr>
  </div>
</template>
<script setup>
// ACTIVE (admin only): list of all study spots with View, Edit and Delete.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// The shared JSON helper.
import { api } from '../api'

// The spots from the server.
const spots = ref([])
// A message to show on failure.
const error = ref('')

// Run once when the page appears.
onMounted(async () => {
  try {
    // GET /api/spots.
    spots.value = await api('/api/spots')
  } catch (e) {
    // Show the error text.
    error.value = e.message
  }
})

// Delete one spot.
async function remove(spot) {
  // Existing TODO: a nicer confirmation box later.
  // TODO: swap for a ConfirmModal component later
  // Ask for confirmation with the browser's own dialog.
  if (!confirm(`Delete ${spot.buildingName}, ${spot.name}?`)) return
  try {
    // DELETE /api/spots/:id (admin only on the server).
    await api(`/api/spots/${spot._id}`, { method: 'DELETE' })
    // Existing note: remove it from the page without reloading.
    spots.value = spots.value.filter(s => s._id !== spot._id) // remove without refetching
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Page title and add link. -->
  <h2>Study Spots</h2>
  <RouterLink to="/admin/spots/new">+ Add Study Spot</RouterLink>
  <p v-if="error">{{ error }}</p>
  <p v-if="spots.length === 0">No study spots found.</p>
  <!-- One block per spot. -->
  <div v-for="spot in spots" :key="spot._id">
    <p><strong>{{ spot.buildingName }}, {{ spot.name }}</strong></p>
    Floor: {{ spot.floor }} · Seats: {{ spot.seatCount }} ·
    Power: {{ spot.hasPowerSocket ? 'Yes' : 'No' }} · Noise: {{ spot.noiseLevel }}<br>
    <!-- Opens the public detail page, which also has the Compare button. -->
    <RouterLink :to="`/spots/${spot._id}`">View</RouterLink> |
    <!-- Opens SpotFormView.vue. -->
    <RouterLink :to="`/admin/spots/${spot._id}/edit`">Edit</RouterLink> |
    <button @click="remove(spot)">Delete</button>
    <hr>
  </div>
</template>

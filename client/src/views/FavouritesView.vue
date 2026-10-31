<script setup>
// ACTIVE: the student's favourite spots.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// The shared JSON helper.
import { api } from '../api'
// The shared favourites list.
import { favourites } from '../stores/favourites'

// Existing note: replaces the old EJS page.
// Replaces favourites.ejs
// A message to show on failure.
const error = ref('')
// True while loading.
const loading = ref(true)

// Run once when the page appears.
onMounted(async () => {
  try {
    // GET /api/favourites, filled into the shared list.
    await favourites.load()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Remove one favourite.
async function remove(fav) {
  try {
    // DELETE /api/favourites/:id (only your own).
    await api(`/api/favourites/${fav._id}`, { method: 'DELETE' })
    // Drop it from the shared list.
    favourites.list = favourites.list.filter(f => f._id !== fav._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Page heading. -->
  <h1>My Favourite Study Spots</h1>
  <!-- Error message. -->
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="loading">Loading...</p>
  <p v-else-if="favourites.list.length === 0">No favourites added yet.</p>
  <!-- One block per favourite. These are copies of the spot's details taken when it was saved. -->
  <div v-for="fav in favourites.list" :key="fav._id">
    <p><strong>Name: {{ fav.spotName }}</strong></p>
    Building: {{ fav.buildingName }}<br>
    Floor: {{ fav.floor }}<br>
    Seats: {{ fav.seatCount }}<br>
    Power Socket: {{ fav.hasPowerSocket ? 'Yes' : 'No' }}<br>
    Noise Level: {{ fav.noiseLevel }}<br>
    <!-- Link to the building's page. -->
    <RouterLink :to="`/building/${fav.buildingName}`">View building</RouterLink> |
    <button @click="remove(fav)">Remove from Favourites</button>
    <hr>
  </div>
  <RouterLink to="/">Back to all buildings</RouterLink>
</template>

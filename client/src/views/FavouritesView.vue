<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { favourites } from '../stores/favourites'

// Replaces favourites.ejs
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    await favourites.load()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function remove(fav) {
  try {
    await api(`/api/favourites/${fav._id}`, { method: 'DELETE' })
    favourites.list = favourites.list.filter(f => f._id !== fav._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <h1>My Favourite Study Spots</h1>
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="loading">Loading...</p>
  <p v-else-if="favourites.list.length === 0">No favourites added yet.</p>
  <div v-for="fav in favourites.list" :key="fav._id">
    <p><strong>Name: {{ fav.spotName }}</strong></p>
    Building: {{ fav.buildingName }}<br>
    Floor: {{ fav.floor }}<br>
    Seats: {{ fav.seatCount }}<br>
    Power Socket: {{ fav.hasPowerSocket ? 'Yes' : 'No' }}<br>
    Noise Level: {{ fav.noiseLevel }}<br>
    <RouterLink :to="`/building/${fav.buildingName}`">View building</RouterLink> |
    <button @click="remove(fav)">Remove from Favourites</button>
    <hr>
  </div>
  <RouterLink to="/">Back to all buildings</RouterLink>
</template>

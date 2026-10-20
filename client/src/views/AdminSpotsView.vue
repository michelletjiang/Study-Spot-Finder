<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'

const spots = ref([])
const error = ref('')

onMounted(async () => {
  try {
    spots.value = await api('/api/spots')
  } catch (e) {
    error.value = e.message
  }
})

async function remove(spot) {
  // TODO: swap for a ConfirmModal component later
  if (!confirm(`Delete ${spot.buildingName}, ${spot.name}?`)) return
  try {
    await api(`/api/spots/${spot._id}`, { method: 'DELETE' })
    spots.value = spots.value.filter(s => s._id !== spot._id) // remove without refetching
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <h2>Study Spots</h2>
  <RouterLink to="/admin/spots/new">+ Add Study Spot</RouterLink>
  <p v-if="error">{{ error }}</p>
  <p v-if="spots.length === 0">No study spots found.</p>
  <div v-for="spot in spots" :key="spot._id">
    <p><strong>{{ spot.buildingName }}, {{ spot.name }}</strong></p>
    Floor: {{ spot.floor }} · Seats: {{ spot.seatCount }} ·
    Power: {{ spot.hasPowerSocket ? 'Yes' : 'No' }} · Noise: {{ spot.noiseLevel }}<br>
    <RouterLink :to="`/spots/${spot._id}`">View</RouterLink> |
    <RouterLink :to="`/admin/spots/${spot._id}/edit`">Edit</RouterLink> |
    <button @click="remove(spot)">Delete</button>
    <hr>
  </div>
</template>

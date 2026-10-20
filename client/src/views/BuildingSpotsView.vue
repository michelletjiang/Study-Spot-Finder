<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { favourites } from '../stores/favourites'
import FavouriteButton from '../components/FavouriteButton.vue'

const route = useRoute()
const buildingName = route.params.name
const spots = ref([])
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await api(`/api/buildings/${encodeURIComponent(buildingName)}/spots`)
    spots.value = data.studySpots
    await favourites.load()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <h2>Study Spots in {{ buildingName }}</h2>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">{{ error }}</p>
  <p v-else-if="spots.length === 0">No study spots found in this building.</p>
  <div v-else v-for="spot in spots" :key="spot._id">
    <p><strong>{{ spot.name }}</strong></p>
    Floor: {{ spot.floor }}<br>
    Seats: {{ spot.seatCount }}<br>
    Power Socket: {{ spot.hasPowerSocket ? 'Yes' : 'No' }}<br>
    Noise Level: {{ spot.noiseLevel }}<br>
    <RouterLink :to="`/spots/${spot._id}`">View Details &amp; Reviews</RouterLink> |
    <RouterLink :to="`/spots/${spot._id}/reviews/new`">Add a Review</RouterLink><br>
    <FavouriteButton :spot="spot" />
    <hr>
  </div>
</template>

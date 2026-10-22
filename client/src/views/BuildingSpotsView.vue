<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { favourites } from '../stores/favourites'
import { mapStore } from '../stores/map'
import FavouriteButton from '../components/FavouriteButton.vue'

const route = useRoute()
const buildingName = computed(() => route.params.name)
const spots = ref([])
const error = ref('')
const loading = ref(true)

// re-runs when the name changes too: clicking another building on the minimap reuses this page
watch(buildingName, async name => {
  if (!name) return // leaving this page
  loading.value = true
  error.value = ''
  try {
    const data = await api(`/api/buildings/${encodeURIComponent(name)}/spots`)
    spots.value = data.studySpots
    mapStore.showBuilding(data.building) // minimap zooms here and finds the fastest route
    await favourites.load()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}, { immediate: true })
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

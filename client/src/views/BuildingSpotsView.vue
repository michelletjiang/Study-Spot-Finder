<script setup>
// ACTIVE: lists the spots in one building. This is where students pick spots to compare with the Compare buttons.
// watch re-runs a function when a value changes.
import { ref, computed, watch } from 'vue'
// useRoute reads the building name from the URL (/building/:name).
import { useRoute } from 'vue-router'
import { api } from '../api'
// The shared favourites list.
import { favourites } from '../stores/favourites'
// The shared minimap state.
import { mapStore } from '../stores/map'
// The star button for each spot.
import FavouriteButton from '../components/FavouriteButton.vue'
// The comparison shortlist.
import { comparison } from '../stores/compare'

// The current route.
const route = useRoute()
// The building name from the URL.
const buildingName = computed(() => route.params.name)
// The spots in this building.
const spots = ref([])
// A message to show on failure.
const error = ref('')
// True while loading.
const loading = ref(true)

// Existing note: runs again when the name changes.
// re-runs when the name changes too: clicking another building on the minimap reuses this page
// Run this when the name is set.
watch(buildingName, async name => {
  if (!name) return // leaving this page
  loading.value = true
  error.value = ''
  // Fetch the building and its spots (GET /api/buildings/:name/spots).
  try {
    const data = await api(`/api/buildings/${encodeURIComponent(name)}/spots`)
    // Keep the spots.
    spots.value = data.studySpots
    // Point the minimap at the building. A building with no coordinates just shows a message.
    mapStore.showBuilding(data.building) // minimap zooms here and finds the fastest route
    // Load the favourites for the stars.
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
  <!-- The heading with the building name. -->
  <p v-if="loading">Loading...</p>
  <!-- Loading message. -->
  <p v-else-if="error">{{ error }}</p>
  <!-- Error message. -->
  <p v-else-if="spots.length === 0">No study spots found in this building.</p>
  <!-- A building with no spots. -->
  <div v-else v-for="spot in spots" :key="spot._id">
    <!-- One block per spot: this is the list the student compares. -->
    <p><strong>{{ spot.name }}</strong></p>
    <!-- The stored facts about the spot. -->
    Floor: {{ spot.floor }}<br>
    Seats: {{ spot.seatCount }}<br>
    Power Socket: {{ spot.hasPowerSocket ? 'Yes' : 'No' }}<br>
    Noise Level: {{ spot.noiseLevel }}<br>
    <!-- A link to the spot's detail page and reviews. -->
    <RouterLink :to="`/spots/${spot._id}`">View Details &amp; Reviews</RouterLink> |
    <RouterLink :to="`/spots/${spot._id}/reviews/new`">Add a Review</RouterLink><br>
    <!-- The favourites button. -->
    <FavouriteButton :spot="spot" />
    <!-- The Compare button toggles this spot on the shortlist. aria-pressed tells assistive tech whether the spot is chosen. -->
    <button type="button" class="secondary compare-button" :aria-pressed="comparison.has(spot._id)" @click="comparison.toggle(spot._id)">
      <!-- The label flips between Compare and Remove from comparison. -->
      {{ comparison.has(spot._id) ? 'Remove from comparison' : 'Compare' }}
    </button>
    <hr>
  </div>
</template>

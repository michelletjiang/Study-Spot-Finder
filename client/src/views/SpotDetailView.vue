<script setup>
// ACTIVE: one spot's details and reviews. It also has a Compare button, the second entry point to the comparison.
// onMounted runs code once when the page appears.
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'
// auth tells whether a review belongs to the current user.
import { auth } from '../stores/auth'
// The shared favourites list.
import { favourites } from '../stores/favourites'
// The star button.
import FavouriteButton from '../components/FavouriteButton.vue'
// The comparison shortlist.
import { comparison } from '../stores/compare'

// Existing note: replaces the old EJS spot and review pages.
// Spot details + its reviews (replaces studyspot-details.ejs and display-reviews.ejs)
// The route, with the spot id.
const route = useRoute()
// The spot, empty until loaded.
const spot = ref(null)
// The reviews of the spot.
const reviews = ref([])
// A message to show on failure.
const error = ref('')

// Load everything once.
onMounted(async () => {
  try {
    // GET /api/spots/:id for the spot.
    spot.value = await api(`/api/spots/${route.params.id}`)
    // GET /api/reviews?spotId= for its reviews.
    reviews.value = await api(`/api/reviews?spotId=${route.params.id}`)
    // Load the favourites for the star.
    await favourites.load()
  } catch (e) {
    // Show the error message.
    error.value = e.message
  }
})

// Delete one of your reviews.
async function deleteReview(review) {
  // Ask first.
  if (!confirm(`Delete your review "${review.title}"?`)) return
  try {
    // DELETE /api/reviews/:id.
    await api(`/api/reviews/${review._id}`, { method: 'DELETE' })
    // Remove it from the page without reloading.
    reviews.value = reviews.value.filter(r => r._id !== review._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Error message. -->
  <p v-if="error" style="color: red">{{ error }}</p>
  <!-- Everything below shows once the spot has loaded. -->
  <template v-if="spot">
    <!-- Spot facts. -->
    <h2>{{ spot.name }}</h2>
    Building: {{ spot.buildingName }}<br>
    Floor: {{ spot.floor }}<br>
    Seats: {{ spot.seatCount }}<br>
    Power Socket: {{ spot.hasPowerSocket ? 'Yes' : 'No' }}<br>
    Noise Level: {{ spot.noiseLevel }}<br>
    <!-- The favourites button. -->
    <FavouriteButton :spot="spot" />
    <!-- The Compare button, the same as on the building page: it toggles the spot on the shortlist. -->
    <button type="button" class="secondary compare-button" :aria-pressed="comparison.has(spot._id)" @click="comparison.toggle(spot._id)">
      {{ comparison.has(spot._id) ? 'Remove from comparison' : 'Compare' }}
    </button>
    <hr>

    <h3>Reviews</h3>
    <!-- Existing link to write a review. -->
    <RouterLink :to="`/spots/${spot._id}/reviews/new`">+ Add a Review</RouterLink>
    <!-- Empty state. -->
    <p v-if="reviews.length === 0">No reviews yet.</p>
    <!-- One block per review. -->
    <div v-for="review in reviews" :key="review._id">
      <!-- Title, rating and author. -->
      <p><strong>{{ review.title }}</strong> ({{ review.rating }}/5) by {{ review.userId }}<template v-if="review.noiseLevel"> · Noise: {{ review.noiseLevel }}</template></p>
      {{ review.content }}<br>
      <!-- Edit and delete are shown only for your own reviews. -->
      <template v-if="review.userId === auth.user?.username">
        <RouterLink :to="{ path: `/reviews/${review._id}/edit`, query: { back: route.fullPath } }">Edit</RouterLink> |
        <button @click="deleteReview(review)">Delete</button> |
      </template>
      <!-- Everyone can report a review. -->
      <RouterLink :to="`/reviews/${review._id}/report`">Report Review</RouterLink>
      <hr>
    </div>

    <!-- Back to the building page. -->
    <RouterLink :to="`/building/${spot.buildingName}`">Back to {{ spot.buildingName }}</RouterLink>
  </template>
  <!-- Loading message. -->
  <p v-else-if="!error">Loading...</p>
</template>

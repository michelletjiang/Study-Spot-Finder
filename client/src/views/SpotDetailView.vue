<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { formatDate, noiseSummary } from '../reviews'
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'
import FavouriteButton from '../components/FavouriteButton.vue'

// Spot details + its reviews (replaces studyspot-details.ejs and display-reviews.ejs)
const route = useRoute()
const spot = ref(null)
const reviews = ref([])
const error = ref('')

onMounted(async () => {
  try {
    spot.value = await api(`/api/spots/${route.params.id}`)
    reviews.value = await api(`/api/reviews?spotId=${route.params.id}`)
    await favourites.load()
  } catch (e) {
    error.value = e.message
  }
})

const noiseLevel = computed(() => noiseSummary(reviews.value))

async function deleteReview(review) {
  if (!confirm(`Delete your review "${review.title}"?`)) return
  try {
    await api(`/api/reviews/${review._id}`, { method: 'DELETE' })
    reviews.value = reviews.value.filter(r => r._id !== review._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <p v-if="error" style="color: red">{{ error }}</p>
  <template v-if="spot">
    <h2>{{ spot.name }}</h2>
    Building: {{ spot.buildingName }}<br>
    Floor: {{ spot.floor }}<br>
    Seats: {{ spot.seatCount }}<br>
    Power Socket: {{ spot.hasPowerSocket ? 'Yes' : 'No' }}<br>
    Noise Level: {{ noiseLevel }}<br>
    <FavouriteButton :spot="spot" />
    <hr>

    <h3>Reviews</h3>
    <RouterLink :to="`/spots/${spot._id}/reviews/new`">+ Add a Review</RouterLink>
    <p v-if="reviews.length === 0">No reviews yet.</p>
    <div v-for="review in reviews" :key="review._id">
      <p><strong>{{ review.title }}</strong> ({{ review.rating }}/5) by {{ review.userId }}</p>
      <small>{{ formatDate(review.createdAt) }}</small><br>
      <template v-if="review.noiseLevel">Noise Level: {{ review.noiseLevel }}<br></template>
      {{ review.content }}<br>
      <template v-if="review.userId === auth.user?.username">
        <RouterLink :to="{ path: `/reviews/${review._id}/edit`, query: { back: route.fullPath } }">Edit</RouterLink> |
        <button @click="deleteReview(review)">Delete</button> |
      </template>
      <RouterLink :to="`/reviews/${review._id}/report`">Report Review</RouterLink>
      <hr>
    </div>

    <RouterLink :to="`/building/${spot.buildingName}`">Back to {{ spot.buildingName }}</RouterLink>
  </template>
  <p v-else-if="!error">Loading...</p>
</template>

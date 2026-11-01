<script setup>
// ACTIVE: the student's own reviews.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// The shared JSON helper.
import { api } from '../api'

// Existing note: replaces the old EJS pages.
// The logged-in user's reviews (replaces user-reviews.ejs and show-marked-review.ejs)
// The reviews from the server.
const reviews = ref([])
// A message to show on failure.
const error = ref('')
// True while loading.
const loading = ref(true)

// Run once when the page appears.
onMounted(async () => {
  try {
    // GET /api/reviews/mine.
    reviews.value = await api('/api/reviews/mine')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Delete one review.
async function deleteReview(review) {
  // Ask first.
  if (!confirm(`Delete your review "${review.title}"?`)) return
  try {
    // DELETE /api/reviews/:id (own reviews only).
    await api(`/api/reviews/${review._id}`, { method: 'DELETE' })
    // Remove it from the page without reloading.
    reviews.value = reviews.value.filter(r => r._id !== review._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Page title. -->
  <h2>Your Reviews</h2>
  <!-- Error message. -->
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="loading">Loading...</p>
  <p v-else-if="reviews.length === 0">No reviews yet.</p>
  <!-- One block per review. -->
  <div v-for="review in reviews" :key="review._id">
    <p><strong>{{ review.title }}</strong> ({{ review.rating }}/5)</p>
    {{ review.buildingName }}, {{ review.roomId }}<br>
    {{ review.content }}<br>
    <!-- Edit opens ReviewFormView.vue. -->
    <RouterLink :to="`/reviews/${review._id}/edit`">Edit</RouterLink> |
    <button @click="deleteReview(review)">Delete</button>
    <hr>
  </div>
</template>

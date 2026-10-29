<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'

// The logged-in user's reviews (replaces user-reviews.ejs and show-marked-review.ejs)
const reviews = ref([])
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    reviews.value = await api('/api/reviews/mine')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

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
  <h2>Your Reviews</h2>
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="loading">Loading...</p>
  <p v-else-if="reviews.length === 0">No reviews yet.</p>
  <div v-for="review in reviews" :key="review._id">
    <p><strong>{{ review.title }}</strong> ({{ review.rating }}/5)</p>
    {{ review.buildingName }}, {{ review.roomId }}<br>
    {{ review.content }}<br>
    <RouterLink :to="`/reviews/${review._id}/edit`">Edit</RouterLink> |
    <button @click="deleteReview(review)">Delete</button>
    <hr>
  </div>
</template>

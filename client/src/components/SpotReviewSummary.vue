<script setup>
import { ref, watch } from 'vue'
import { api } from '../api'
import { formatDate, noiseSummary, averageRating } from '../reviews'

// Rating, noise level and the latest few reviews for one study spot (shown in the selected card on the building page)
const props = defineProps({ spot: { type: Object, required: true } })

const reviews = ref([])
const loading = ref(true)
const error = ref('')

watch(() => props.spot._id, async id => {
  reviews.value = []
  error.value = ''
  loading.value = true
  try {
    const data = await api(`/api/reviews?spotId=${id}`)
    if (props.spot._id === id) reviews.value = data // ignore a slow answer for a spot that's no longer shown
  } catch (e) {
    if (props.spot._id === id) error.value = e.message
  } finally {
    if (props.spot._id === id) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <div class="summary">
    <p v-if="loading">Loading reviews...</p>
    <p v-else-if="error" style="color: red">{{ error }}</p>
    <template v-else>
      Rating: {{ averageRating(reviews) ? `${averageRating(reviews)}/5 (${reviews.length} reviews)` : 'No reviews yet' }}<br>
      Noise Level: {{ noiseSummary(reviews) }}
      <div v-for="review in reviews.slice(0, 3)" :key="review._id" class="review">
        <strong>{{ review.title }}</strong> ({{ review.rating }}/5) by {{ review.userId }}<br>
        <small>{{ formatDate(review.createdAt) }}<template v-if="review.noiseLevel"> · {{ review.noiseLevel }}</template></small>
        <p>{{ review.content }}</p>
      </div>
      <RouterLink v-if="reviews.length > 3" :to="`/spots/${spot._id}`">See all {{ reviews.length }} reviews</RouterLink>
    </template>
  </div>
</template>

<style scoped>
.summary {
  margin: 8px 0;
}

.review {
  margin-top: 10px;
}

.review p {
  margin: 4px 0 0;
}
</style>

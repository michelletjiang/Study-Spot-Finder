<script setup>
// ACTIVE: the student's own reviews, each on a sheet with a folder tab naming its room.
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { loadSpotIndex } from '../spotIndex'
import StarRating from '../components/StarRating.vue'

const reviews = ref([])
const error = ref('')
const loading = ref(true)
// finds a review's spot (for the link to its room); null until loaded, or if loading the spots failed
const findSpot = ref(null)

onMounted(async () => {
  try {
    // GET /api/reviews/mine, newest first.
    reviews.value = await api('/api/reviews/mine')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
  // the room links are an extra: without them the tabs just aren't links
  loadSpotIndex().then(find => (findSpot.value = find)).catch(e => console.error('Could not load spots:', e.message))
})

const spotOf = review => findSpot.value?.(review.buildingName, review.roomId)

async function deleteReview(review) {
  if (!confirm(`Delete your review "${review.title}"?`)) return
  try {
    // DELETE /api/reviews/:id (own reviews only).
    await api(`/api/reviews/${review._id}`, { method: 'DELETE' })
    reviews.value = reviews.value.filter(r => r._id !== review._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="nb-page">
    <div class="list">
      <h1 class="nb-title">My reviews</h1>
      <p class="nb-subtitle">
        <template v-if="!loading">{{ reviews.length }} review{{ reviews.length === 1 ? '' : 's' }}</template>
        <template v-if="reviews.length"> · tap the tab to open the room</template>
      </p>

      <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
      <p v-if="loading" class="nb-state">Loading your reviews…</p>
      <p v-else-if="!reviews.length && !error" class="nb-state">
        You haven’t written any reviews yet. <RouterLink to="/">Pick a building</RouterLink> and tell others what a room is like.
      </p>

      <article v-for="review in reviews" :key="review._id" class="entry">
        <RouterLink v-if="spotOf(review)" :to="`/spots/${spotOf(review)._id}`" class="nb-folder-tab">
          {{ review.buildingName }} · {{ review.roomId }} <span aria-hidden="true">›</span>
        </RouterLink>
        <span v-else class="nb-folder-tab">{{ review.buildingName }} · {{ review.roomId }}</span>
        <div class="nb-sheet nb-review review">
          <h2 class="nb-review-title">{{ review.title }} <StarRating :rating="review.rating" /></h2>
          <p v-if="review.noiseLevel">Noise: {{ review.noiseLevel }}</p>
          <p>{{ review.content }}</p>
          <div class="actions">
            <!-- ReviewFormView.vue; it comes back here after saving -->
            <RouterLink :to="`/reviews/${review._id}/edit`" class="nb-btn">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
              Edit
            </RouterLink>
            <button type="button" class="nb-btn nb-btn--danger" @click="deleteReview(review)">Delete</button>
          </div>
        </div>
      </article>
    </div>

  </div>
</template>

<style scoped>
.list { max-width: 760px; }

.entry { margin-bottom: 30px; }
.nb-folder-tab { font-size: 0.92rem; }
.review { border-radius: 0 8px 8px 8px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px; border-top: 1px solid var(--nb-rule-light); }
.actions .nb-btn { padding: 5px 16px; font-size: 0.92rem; }

</style>

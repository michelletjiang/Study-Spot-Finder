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
        <RouterLink v-if="spotOf(review)" :to="`/spots/${spotOf(review)._id}`" class="tab">
          {{ review.buildingName }} · {{ review.roomId }} <span aria-hidden="true">›</span>
        </RouterLink>
        <span v-else class="tab">{{ review.buildingName }} · {{ review.roomId }}</span>
        <div class="nb-sheet review">
          <h2>{{ review.title }} <StarRating :rating="review.rating" /></h2>
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
/* the folder tab naming the room, sitting on the sheet's top edge */
.tab {
  position: relative;
  bottom: -2px;
  display: inline-block;
  max-width: calc(100% - 20px);
  padding: 6px 18px;
  border: 2px solid #28263f;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  background: var(--nb-manila-dark);
  color: #28263f;
  font-weight: 700;
  font-size: 0.92rem;
  text-decoration: none;
}
a.tab:hover { background: var(--nb-highlight); color: #28263f; }
a.tab:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
.review { padding: 18px 22px 16px; border-radius: 0 8px 8px 8px; }
.review h2 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 0 0 6px; font: 700 1.7rem/1.15 var(--nb-heading); color: var(--nb-ink); }
.review h2 .stars { font: 1.2rem/1 system-ui, sans-serif; }
.review > p { margin: 0 0 12px; white-space: pre-line; }
.actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px; border-top: 1px solid var(--nb-rule-light); }
.actions .nb-btn { padding: 5px 16px; font-size: 0.92rem; }

</style>

<script setup>
// ACTIVE: one spot's details and reviews. It also has a Compare button, the second entry point to the comparison.
// Drawn as a notebook page: the room's facts on sticky notes, then its reviews on sheets of paper.
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
// auth tells whether a review belongs to the current user.
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'
import { comparison } from '../stores/compare'
import { averageRating } from '../reviews'
import { floorLabel, normalizeFloor } from '../floors'
import FavouriteButton from '../components/FavouriteButton.vue'
import StarRating from '../components/StarRating.vue'

const route = useRoute()
// The spot, empty until loaded.
const spot = ref(null)
// The reviews of the spot, newest first.
const reviews = ref([])
const error = ref('')

onMounted(async () => {
  try {
    // GET /api/spots/:id for the spot, GET /api/reviews?spotId= for its reviews.
    spot.value = await api(`/api/spots/${route.params.id}`)
    reviews.value = await api(`/api/reviews?spotId=${route.params.id}`)
    // Load the favourites so the heart knows whether this spot is saved.
    await favourites.load()
  } catch (e) {
    error.value = e.message
  }
})

const level = computed(() => spot.value && floorLabel(normalizeFloor(spot.value.floor)))
// the building page opens on this spot's floor
const floorLink = computed(() => spot.value && { path: `/building/${spot.value.buildingName}`, query: { floor: normalizeFloor(spot.value.floor) } })
const average = computed(() => averageRating(reviews.value))
const isMine = review => review.userId === auth.user?.username

// Delete one of your reviews.
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
  <div class="nb-page">
    <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="!spot && !error" class="nb-state">Loading this room…</p>

    <template v-if="spot">
      <nav class="crumbs" aria-label="Breadcrumb">
        <RouterLink to="/">All buildings</RouterLink><span aria-hidden="true">/</span>
        <RouterLink :to="`/building/${spot.buildingName}`">{{ spot.buildingName }}</RouterLink><span aria-hidden="true">/</span>
        <RouterLink :to="floorLink">{{ level }}</RouterLink><span aria-hidden="true">/</span>
        <span aria-current="page">{{ spot.name }}</span>
      </nav>

      <header class="head">
        <div>
          <h1 class="nb-title">{{ spot.name }}</h1>
          <p class="nb-subtitle">{{ spot.buildingName }} · {{ level }}</p>
        </div>
        <div class="head-actions">
          <FavouriteButton :spot="spot" />
          <button type="button" class="nb-btn" :aria-pressed="comparison.has(spot._id)" @click="comparison.toggle(spot._id)">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 3h12v10H2Z M8 3v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
            {{ comparison.has(spot._id) ? 'Comparing' : 'Compare' }}
          </button>
        </div>
      </header>

      <!-- the room's facts, one per sticky note -->
      <ul class="facts" aria-label="About this room">
        <li class="nb-note"><strong>{{ spot.seatCount }}</strong>seats</li>
        <li class="nb-note nb-note--blue"><strong>{{ spot.hasPowerSocket ? 'Yes' : 'No' }}</strong>power sockets</li>
        <li class="nb-note nb-note--pink"><strong>{{ spot.noiseLevel || '–' }}</strong>noise level</li>
        <li class="nb-note white">
          <template v-if="average"><strong>{{ average }} <span aria-hidden="true">★</span></strong>from {{ reviews.length }} review{{ reviews.length === 1 ? '' : 's' }}</template>
          <template v-else><strong>–</strong>no reviews yet</template>
        </li>
      </ul>

      <section class="reviews" aria-labelledby="reviews-title">
        <div class="reviews-head">
          <h2 id="reviews-title">Reviews</h2>
          <RouterLink :to="`/spots/${spot._id}/reviews/new`" class="nb-btn nb-btn--primary">+ Write a review</RouterLink>
        </div>

        <p v-if="!reviews.length" class="nb-state">No reviews yet. Be the first to say what this room is like.</p>
        <article v-for="review in reviews" :key="review._id" class="nb-sheet review">
          <h3>{{ review.title }} <StarRating :rating="review.rating" /></h3>
          <p>{{ review.content }}</p>
          <footer>
            <span class="author">{{ review.userId }} <span v-if="isMine(review)" class="you">You</span></span>
            <span class="review-actions">
              <!-- your own reviews can be edited or deleted; anyone else's can be reported -->
              <template v-if="isMine(review)">
                <RouterLink :to="{ path: `/reviews/${review._id}/edit`, query: { back: route.fullPath } }" class="nb-btn">Edit</RouterLink>
                <button type="button" class="nb-btn nb-btn--danger" @click="deleteReview(review)">Delete</button>
              </template>
              <RouterLink v-else :to="`/reviews/${review._id}/report`" class="nb-btn">Report</RouterLink>
            </span>
          </footer>
        </article>
      </section>

      <RouterLink :to="floorLink" class="nb-back">‹ Back to {{ level }} floor plan</RouterLink>
    </template>
  </div>
</template>

<style scoped>
.crumbs { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 8px; color: var(--nb-muted); }
.crumbs a { color: var(--nb-ink); font-weight: 700; text-decoration: none; }
.crumbs a:hover { text-decoration: underline; }

.head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; max-width: 1000px; }
.head .nb-title { overflow-wrap: anywhere; }
.head-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 24px;
  max-width: 1000px;
  margin: 0 0 36px;
  padding: 0;
  list-style: none;
}
.facts .nb-note { min-height: 96px; padding: 16px 20px; font-weight: 700; }
.facts strong { display: block; font: 700 2.4rem/1.1 var(--nb-heading); }
.facts .nb-note:nth-child(2) { transform: rotate(-0.6deg); }
.facts .nb-note:nth-child(3) { transform: rotate(0.8deg); }
.facts .white { background: #fffef9; transform: rotate(-0.4deg); }

.reviews { max-width: 1000px; padding-top: 22px; border-top: 2px solid var(--nb-ink); }
.reviews-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.reviews-head h2 { margin: 0; font: 700 2.4rem/1.1 var(--nb-heading); color: var(--nb-ink); }

.review { max-width: 720px; margin-bottom: 22px; padding: 18px 22px 16px; }
.review h3 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 0 0 6px; font: 700 1.7rem/1.15 var(--nb-heading); color: var(--nb-ink); }
.review h3 .stars { font: 1.2rem/1 system-ui, sans-serif; }
.review > p { margin: 0 0 12px; white-space: pre-line; }
.review footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px solid var(--nb-rule-light); }
.author { font-weight: 700; }
.you { margin-left: 4px; padding: 0 8px; border: 1.5px solid #28263f; border-radius: 999px; background: var(--nb-highlight); color: #28263f; font-size: 0.78rem; }
.review-actions { display: flex; gap: 8px; }
.review-actions .nb-btn { padding: 4px 14px; font-size: 0.92rem; }

.nb-back { display: inline-block; margin-top: 12px; }
</style>

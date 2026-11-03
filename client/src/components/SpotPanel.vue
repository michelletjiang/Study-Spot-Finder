<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../api'
import { favourites } from '../stores/favourites'
import { comparison } from '../stores/compare.js'
import { floorLabel, normalizeFloor } from '../floors'
import { roomType } from '../roomTypes'

// The details card beside the building page's floor plan, for the room that was clicked.
// Shows rating, seats, sockets, how busy it is right now (crowd check-ins) and the latest reviews.
const props = defineProps({ spot: { type: Object, required: true } })
const emit = defineEmits(['close'])

const reviews = ref([])
const reviewsLoading = ref(true)
const reviewsError = ref('')

const crowd = ref(null)      // { current, lastReportedAt, count } or null while loading
const crowdError = ref('')
const checkInMessage = ref('')
const checkingIn = ref(false)

const favBusy = ref(false)
const favError = ref('')

const CROWD_LEVELS = ['Quiet', 'Moderate', 'Busy', 'Full']

// reload everything when another room is picked; ignore answers for a room that's no longer shown
watch(() => props.spot._id, async id => {
  reviews.value = []
  reviewsError.value = crowdError.value = checkInMessage.value = favError.value = ''
  reviewsLoading.value = true
  crowd.value = null

  api(`/api/reviews?spotId=${id}`)
    .then(data => { if (props.spot._id === id) reviews.value = data })
    .catch(e => { if (props.spot._id === id) reviewsError.value = e.message })
    .finally(() => { if (props.spot._id === id) reviewsLoading.value = false })

  api(`/api/crowd/${id}`)
    .then(data => { if (props.spot._id === id) crowd.value = data.summary })
    .catch(e => { if (props.spot._id === id) crowdError.value = e.message })
}, { immediate: true })

const average = computed(() => {
  if (!reviews.value.length) return null
  return (reviews.value.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.value.length).toFixed(1)
})
const isFavourite = computed(() => !!favourites.find(props.spot))
const inComparison = computed(() => comparison.has(props.spot._id))

// "12 min ago", "2 days ago"
function timeAgo(date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  return new Date(date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const stars = rating => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))

async function checkIn(status) {
  checkingIn.value = true
  checkInMessage.value = ''
  const id = props.spot._id
  try {
    const data = await api(`/api/crowd/${id}`, { method: 'POST', body: { status } })
    if (props.spot._id === id) {
      crowd.value = data.summary
      checkInMessage.value = 'Thanks! Your check-in was added.'
    }
  } catch (e) {
    if (props.spot._id === id) checkInMessage.value = e.message // e.g. "You already checked in here. Try again in 9 min."
  } finally {
    checkingIn.value = false
  }
}

async function toggleFavourite() {
  favBusy.value = true
  favError.value = ''
  try {
    await favourites.toggle(props.spot)
  } catch (e) {
    favError.value = e.message
  } finally {
    favBusy.value = false
  }
}
</script>

<template>
  <aside class="panel" :aria-label="`${spot.name} details`">
    <div class="nb-tape" aria-hidden="true"></div>
    <header>
      <div>
        <h2>{{ spot.name }}</h2>
        <p class="kind">{{ roomType(spot) }} · {{ floorLabel(normalizeFloor(spot.floor)) }}</p>
      </div>
      <button type="button" class="close" aria-label="Close room details" @click="emit('close')">✕</button>
    </header>

    <div class="stats">
      <div class="stat">
        <strong>{{ average ?? '–' }}</strong>
        <span v-if="reviewsLoading">loading…</span>
        <span v-else-if="average">★ {{ reviews.length }} review{{ reviews.length === 1 ? '' : 's' }}</span>
        <span v-else>no reviews yet</span>
      </div>
      <div class="stat">
        <strong>{{ spot.seatCount }}</strong>
        <span>seats</span>
      </div>
      <div class="stat">
        <strong>{{ spot.hasPowerSocket ? 'Yes' : 'No' }}</strong>
        <span>power sockets</span>
      </div>
    </div>

    <div v-if="spot.noiseLevel" class="tags">
      <span class="tag">{{ spot.noiseLevel }}</span>
    </div>

    <section class="crowd" aria-live="polite">
      <p v-if="crowdError" class="muted">Couldn't load how busy it is.</p>
      <p v-else-if="!crowd" class="muted">Checking how busy it is…</p>
      <p v-else-if="crowd.current">
        <span class="dot" :class="crowd.current.toLowerCase()" aria-hidden="true"></span>
        <strong>{{ crowd.current }}</strong> · reported {{ timeAgo(crowd.lastReportedAt) }}
      </p>
      <p v-else class="muted">No one has said how busy it is in the last 2 hours.</p>
      <div class="check-in">
        <span>Here now? It's</span>
        <button v-for="level in CROWD_LEVELS" :key="level" type="button" :disabled="checkingIn" @click="checkIn(level)">
          {{ level }}
        </button>
      </div>
      <p v-if="checkInMessage" class="note">{{ checkInMessage }}</p>
    </section>

    <section class="reviews">
      <h3>Latest reviews</h3>
      <p v-if="reviewsLoading" class="muted">Loading reviews…</p>
      <p v-else-if="reviewsError" class="error">Couldn't load reviews: {{ reviewsError }}</p>
      <p v-else-if="!reviews.length" class="empty">No reviews yet. Be the first to say what this room is like.</p>
      <template v-else>
        <article v-for="review in reviews.slice(0, 2)" :key="review._id" class="review">
          <div class="review-head">
            <strong>{{ review.userId }}</strong>
            <span><span class="stars" :aria-label="`${review.rating} out of 5`">{{ stars(review.rating) }}</span> · {{ timeAgo(review.createdAt) }}</span>
          </div>
          <p>{{ review.content }}</p>
        </article>
      </template>
      <RouterLink :to="`/spots/${spot._id}`" class="more">
        {{ reviews.length > 2 ? `See all ${reviews.length} reviews` : 'Room details' }} →
      </RouterLink>
    </section>

    <div class="actions">
      <RouterLink :to="`/spots/${spot._id}/reviews/new`" class="nb-btn nb-btn--primary">Write a review</RouterLink>
      <button type="button" class="nb-btn" :aria-pressed="isFavourite" :disabled="favBusy" @click="toggleFavourite">
        {{ isFavourite ? '♥ Saved' : '♡ Favourite' }}
      </button>
      <button type="button" class="nb-btn" :aria-pressed="inComparison" @click="comparison.toggle(spot._id)">
        {{ inComparison ? 'Comparing' : 'Compare' }}
      </button>
    </div>
    <p v-if="favError" class="error">{{ favError }}</p>
  </aside>
</template>

<style scoped>
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 18px 18px;
  background: var(--nb-card);
  border: 2px solid var(--nb-ink);
  border-radius: 6px;
  box-shadow: 6px 6px 0 var(--nb-ink);
  color: var(--nb-ink);
  text-align: left;
}

header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

h2 {
  margin: 0;
  font: 700 2rem/1.05 var(--nb-heading);
  color: var(--nb-ink);
  text-wrap: balance;
}

.kind {
  margin: 4px 0 0;
  color: var(--nb-muted);
  font-size: 0.85rem;
}

.close {
  flex: none;
  width: 36px;
  height: 36px;
  border: 2px solid var(--nb-ink);
  border-radius: 8px;
  background: transparent;
  color: var(--nb-ink);
  font-size: 1rem;
  cursor: pointer;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border: 2px solid var(--nb-ink);
  border-radius: 6px;
  background: var(--nb-paper);
  text-align: center;
}
.stat strong { font-size: 1.35rem; line-height: 1.2; }
.stat span { font-size: 0.72rem; color: var(--nb-muted); line-height: 1.25; }

.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  padding: 1px 10px;
  border: 1.5px dashed var(--nb-ink);
  border-radius: 999px;
  font-size: 0.82rem;
}

.crowd {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--nb-paper);
  font-size: 0.88rem;
}
.crowd p { margin: 0; }
.dot {
  display: inline-block;
  width: 11px;
  height: 11px;
  margin-right: 6px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 50%;
  vertical-align: -1px;
}
.dot.quiet { background: #5fb36b; }
.dot.moderate { background: #f0c23a; }
.dot.busy { background: #f0a23a; }
.dot.full { background: #e0606a; }

.check-in { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.check-in span { flex-basis: 100%; color: var(--nb-muted); }
.check-in button {
  padding: 1px 9px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.check-in button:hover { background: var(--nb-highlight); color: #28263f; }

.reviews { display: grid; gap: 8px; }
.reviews h3 { margin: 0; font-size: 1rem; color: var(--nb-ink); }
.review { padding-bottom: 8px; border-bottom: 1.5px dashed var(--nb-rule); }
.review p { margin: 4px 0 0; font-size: 0.9rem; }
.review-head { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; font-size: 0.82rem; }
.review-head > span { color: var(--nb-muted); }
.stars { color: var(--nb-ink); letter-spacing: 1px; }
.empty {
  margin: 0;
  padding: 12px;
  border: 1.5px dashed var(--nb-rule);
  border-radius: 6px;
  color: var(--nb-muted);
  font-size: 0.9rem;
}
.more { color: var(--nb-ink); font-weight: 700; font-size: 0.9rem; }

.actions { display: flex; flex-wrap: wrap; gap: 8px; }
/* the shared notebook buttons (style.css), a little smaller to fit the panel */
.actions .nb-btn { flex: 1 1 auto; padding: 7px 12px; border-radius: 8px; font-size: 0.92rem; }

.muted { color: var(--nb-muted); }
.note { color: var(--nb-muted); font-size: 0.82rem; }
.error { margin: 0; color: var(--nb-error); font-size: 0.88rem; }

button:focus-visible, a:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../api'
import { favourites } from '../stores/favourites'
import { comparison } from '../stores/compare.js'
import { levelLabel } from '../floors'
import { roomType } from '../roomTypes'
import { timeAgo } from '../reviews'
import { myCheckIn } from '../stores/checkin'
import { seatsLevel, seatsFreeText, peopleText, clockTime, busiestSummary, sgNow } from '../seats'
import SpotAlerts from './SpotAlerts.vue'
import NoiseRating from './NoiseRating.vue'

// The details card beside the building page's floor plan, for the room that was clicked.
// Shows rating, seats, sockets, reported issues (alerts), seats free right now (check-ins) and the latest reviews.
// A student checked in here can also say how loud it is, in the check-in box and the check-in popup.
const props = defineProps({ spot: { type: Object, required: true } })
// alerts-change: (spotId, alerts), checkins-change: ({ spotId: people checked in }) and noise-rated keep the floor plan up to date
const emit = defineEmits(['close', 'alerts-change', 'checkins-change', 'noise-rated'])

const reviews = ref([])
const reviewsLoading = ref(true)
const reviewsError = ref('')

const checkedIn = ref(null)  // people checked in here right now, or null while loading
const countError = ref('')
const checkInMessage = ref('')
const checkingIn = ref(false)
const busiestToday = ref(null) // "On Tuesdays it's usually busiest around 2 pm (~40% of seats taken)." once there's enough data

// the "You're checked in" popup: { spotName, buildingName, endsAt, previous, alreadyHere } while it's open
const confirmDialog = ref(null)
const confirmed = ref(null)

const favBusy = ref(false)
const favError = ref('')

// where the user is checked in (loaded once per page, shared with other panels)
myCheckIn.load().catch(() => {}) // logged out or offline: the buttons still work and report their own errors
const hereNow = computed(() => myCheckIn.isAt(props.spot._id))
const elsewhere = computed(() => (myCheckIn.active && !hereNow.value ? myCheckIn.current : null))
const isFull = computed(() => checkedIn.value !== null && checkedIn.value >= props.spot.seatCount && !hereNow.value)
// "Seminar Room 2-1 (School of Computing & Information Systems 1)", or just the room if its building isn't known
const placeName = place => (place.buildingName ? `${place.spotName} (${place.buildingName})` : place.spotName)

// reload everything when another room is picked; ignore answers for a room that's no longer shown
watch(() => props.spot._id, async id => {
  reviews.value = []
  reviewsError.value = countError.value = checkInMessage.value = favError.value = ''
  reviewsLoading.value = true
  checkedIn.value = null
  busiestToday.value = null

  // the full chart is on the room page; the panel only has room for one line
  api(`/api/checkins/${id}/pattern`)
    .then(data => { if (props.spot._id === id) busiestToday.value = busiestSummary(data, sgNow().day) })
    .catch(() => {}) // optional extra, so nothing to show

  api(`/api/reviews?spotId=${id}`)
    .then(data => { if (props.spot._id === id) reviews.value = data })
    .catch(e => { if (props.spot._id === id) reviewsError.value = e.message })
    .finally(() => { if (props.spot._id === id) reviewsLoading.value = false })

  api(`/api/checkins?spots=${id}`)
    .then(data => { if (props.spot._id === id) checkedIn.value = data[id] || 0 })
    .catch(e => { if (props.spot._id === id) countError.value = e.message })
}, { immediate: true })

const average = computed(() => {
  if (!reviews.value.length) return null
  return (reviews.value.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.value.length).toFixed(1)
})
const isFavourite = computed(() => !!favourites.find(props.spot))
const inComparison = computed(() => comparison.has(props.spot._id))

const stars = rating => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))

// the server sends fresh counts for every spot a check-in or check-out changed (e.g. the room you moved out of too)
function applyCounts(counts) {
  if (props.spot._id in counts) checkedIn.value = counts[props.spot._id]
  emit('checkins-change', counts)
}

async function checkIn() {
  checkingIn.value = true
  checkInMessage.value = ''
  const id = props.spot._id
  try {
    const data = await api(`/api/checkins/${id}`, { method: 'POST' })
    myCheckIn.current = data.checkIn
    applyCounts(data.counts)
    if (props.spot._id !== id) return
    confirmed.value = { ...data.checkIn, previous: data.previous, alreadyHere: !!data.alreadyHere }
    confirmDialog.value?.showModal()
  } catch (e) {
    if (props.spot._id === id) checkInMessage.value = e.message // e.g. "All 6 seats here are taken by people who checked in."
  } finally {
    checkingIn.value = false
  }
}

async function checkOut() {
  checkingIn.value = true
  checkInMessage.value = ''
  try {
    const data = await api('/api/checkins/me', { method: 'DELETE' })
    myCheckIn.current = null
    applyCounts(data.counts)
    checkInMessage.value = "You've checked out. Thanks for freeing up the seat!"
  } catch (e) {
    if (e.status === 404) myCheckIn.current = null // the 3 hours were already up
    checkInMessage.value = e.message
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
        <p class="kind">{{ roomType(spot) }} · {{ levelLabel(spot.floor) }}</p>
        <!-- the full room page: every review and the busiest-times chart -->
        <RouterLink :to="`/spots/${spot._id}`" class="more">Room page <span aria-hidden="true">→</span></RouterLink>
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

    <!-- the room's usual noise level (from the spot itself), not how busy it is right now. Plain text: it isn't clickable -->
    <p v-if="spot.noiseLevel" class="noise">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4ZM16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9.5 9.5 0 0 1 0 13" /></svg>
      Usually <strong>{{ spot.noiseLevel.toLowerCase() }}</strong> noise
    </p>

    <h3 class="section-title">Right now</h3>
    <section class="checkin" aria-live="polite">
      <p v-if="countError" class="muted">Couldn't load how many seats are free.</p>
      <p v-else-if="checkedIn === null" class="muted">Counting free seats…</p>
      <p v-else-if="checkedIn > 0">
        <span class="nb-dot" :class="`nb-dot--${seatsLevel(checkedIn, spot.seatCount)}`" aria-hidden="true"></span>
        <strong>{{ seatsFreeText(checkedIn, spot.seatCount) }}</strong>
        <span class="muted"> · {{ peopleText(checkedIn) }} checked in via the app</span>
      </p>
      <p v-else class="muted">Nobody has checked in here through the app right now.</p>

      <div v-if="hereNow" class="here">
        <p><strong>✓ You're checked in here</strong> until {{ clockTime(myCheckIn.current.endsAt) }}</p>
        <button type="button" class="nb-btn" :disabled="checkingIn" @click="checkOut">Check out</button>
      </div>
      <NoiseRating v-if="hereNow" :spot-id="spot._id" @rated="emit('noise-rated')" />
      <template v-else>
        <button type="button" class="nb-btn nb-btn--primary" :disabled="checkingIn || isFull" @click="checkIn">
          {{ isFull ? 'No free seats' : 'Check in here' }}
        </button>
        <p v-if="elsewhere" class="note">You're checked in at {{ placeName(elsewhere) }}. Checking in here will move you.</p>
      </template>
      <p v-if="checkInMessage" class="note">{{ checkInMessage }}</p>
      <p v-if="busiestToday" class="note">
        {{ busiestToday }} <RouterLink :to="`/spots/${spot._id}`" class="busy-link">Busiest times →</RouterLink>
      </p>
    </section>

    <h3 class="section-title">Reported issues</h3>
    <SpotAlerts :spot="spot" @change="list => emit('alerts-change', spot._id, list)" />

    <!-- confirmation after checking in (a modal dialog, so it can't be missed) -->
    <dialog ref="confirmDialog" class="confirm" aria-labelledby="confirm-title" @close="confirmed = null">
      <template v-if="confirmed">
        <p class="tick" aria-hidden="true">✓</p>
        <h3 id="confirm-title">{{ confirmed.alreadyHere ? "You're already checked in" : "You're checked in!" }}</h3>
        <p><strong>{{ confirmed.spotName }}</strong><br>{{ confirmed.buildingName }}</p>
        <p v-if="confirmed.previous">We've checked you out of {{ placeName(confirmed.previous) }}.</p>
        <p>
          We'll check you out automatically at <strong>{{ clockTime(confirmed.endsAt) }}</strong>.
          Tap <strong>Check out</strong> when you leave so others can see the seat is free.
        </p>
        <NoiseRating :spot-id="spot._id" class="confirm-noise" @rated="emit('noise-rated')" />
        <form method="dialog"><button class="nb-btn nb-btn--primary" autofocus>OK</button></form>
      </template>
    </dialog>

    <section class="reviews">
      <div class="reviews-head">
        <h3 class="section-title">Latest reviews</h3>
        <RouterLink v-if="reviews.length > 2" :to="`/spots/${spot._id}`" class="all-reviews">All {{ reviews.length }} reviews →</RouterLink>
      </div>
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
  box-shadow: 6px 6px 0 var(--nb-shadow);
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

/* the usual noise level: a plain line with a speaker, so it doesn't look like a button */
.noise { display: flex; align-items: center; gap: 6px; margin: -4px 0 0; color: var(--nb-muted); font-size: 0.9rem; }
.noise strong { color: var(--nb-ink); }
.noise svg { flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* each part of the panel gets a small heading over a dashed line, so it reads in clear blocks */
.section-title {
  margin: 4px 0 -6px;
  padding-top: 12px;
  border-top: 1.5px dashed var(--nb-rule);
  color: var(--nb-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.checkin {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--nb-paper);
  font-size: 0.88rem;
}
.checkin p { margin: 0; }
.checkin .nb-btn { justify-self: start; padding: 6px 16px; border-radius: 8px; font-size: 0.92rem; }
.here { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }

.confirm {
  max-width: min(360px, calc(100vw - 32px));
  padding: 22px 24px 20px;
  border: 2px solid var(--nb-ink);
  border-radius: 10px;
  background: var(--nb-card);
  box-shadow: 6px 6px 0 var(--nb-shadow);
  color: var(--nb-ink);
  text-align: center;
}
.confirm::backdrop { background: rgba(40, 38, 63, 0.35); }
.confirm h3 { margin: 0 0 8px; font: 700 1.9rem/1.1 var(--nb-heading); color: var(--nb-ink); }
.confirm p { margin: 0 0 10px; font-size: 0.95rem; }
.confirm .tick {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: 0 auto 8px;
  border: 2px solid var(--nb-ink);
  border-radius: 50%;
  background: #5fb36b;
  color: #28263f;
  font-size: 1.5rem;
  font-weight: 700;
}
.confirm-noise { justify-items: center; padding-top: 12px; border-top: 1.5px dashed var(--nb-rule); text-align: center; }
.confirm form { margin-top: 14px; }

.reviews { display: grid; gap: 8px; }
.reviews-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin: 4px 0 2px; padding-top: 12px; border-top: 1.5px dashed var(--nb-rule); }
.reviews-head .section-title { margin: 0; padding: 0; border: none; }
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
/* a small outlined button, so the way to the room page is easy to spot */
.more {
  flex: none;
  padding: 2px 12px;
  border: 2px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-sheet);
  color: var(--nb-ink);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 2px 2px 0 var(--nb-shadow);
  transition: transform 0.1s, box-shadow 0.1s;
}
.kind + .more { display: inline-block; margin-top: 10px; }
.all-reviews { color: var(--nb-ink); font-size: 0.85rem; font-weight: 700; }
.all-reviews:hover { color: var(--nb-ink); }
.more:hover { color: var(--nb-ink); transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--nb-shadow); }

.actions { display: flex; flex-wrap: wrap; gap: 8px; }
/* the shared notebook buttons (style.css), a little smaller to fit the panel */
.actions .nb-btn { flex: 1 1 auto; padding: 7px 12px; border-radius: 8px; font-size: 0.92rem; }

.muted { color: var(--nb-muted); }
.note { color: var(--nb-muted); font-size: 0.82rem; }
.busy-link { color: var(--nb-ink); font-weight: 700; white-space: nowrap; }
.error { margin: 0; color: var(--nb-error); font-size: 0.88rem; }

button:focus-visible, a:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

<script setup>
// ACTIVE (comparison): the side-by-side table at /compare?ids=a,b[,c]. It only reads: it never edits spots.
// Catalogue rows (where, seats, sockets, noise) come from the spot. Live rows (rating, seats free now,
// usual crowd) come from reviews and check-ins, and the best value in a live row is highlighted.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { comparison } from '../stores/compare'
import { comparisonLocation, idsAfterRemoval } from './compare-navigation'
import { averageRating } from '../reviews'
import { MIN_FOR_SUMMARY, seatsLevel, hourLabel, percent, sgNow } from '../seats'
import { levelLabel } from '../floors'

const route = useRoute()
const router = useRouter()
const spots = ref([])
// Ids the server could not find, for example a spot deleted after it was chosen.
const missingIds = ref([])
const loading = ref(true)
const error = ref('')
// Live data per spot id. A missing entry means it is still loading or failed.
const reviewsById = ref({})
const patternsById = ref({})
const checkedIn = ref(null) // { spotId: people checked in }, or null until loaded
const liveError = ref(false)
const hideSame = ref(false)
const now = sgNow()

const requestedIds = computed(() => String(route.query.ids || '').split(',').map(id => id.trim()).filter(Boolean))

async function load() {
  loading.value = true
  error.value = ''
  spots.value = []
  missingIds.value = []
  reviewsById.value = {}
  patternsById.value = {}
  checkedIn.value = null
  liveError.value = false
  // Put the URL's ids on the shortlist, so a shared or reloaded link shows the right tray.
  comparison.restore(requestedIds.value)
  // Two or three spots only. This mirrors the server rule.
  if (requestedIds.value.length < 2 || requestedIds.value.length > 3) {
    error.value = 'Choose exactly two or three spots from a spot list.'
    loading.value = false
    return
  }
  try {
    // GET /api/spots/compare?ids=... (logged in only).
    const data = await api(`/api/spots/compare?ids=${encodeURIComponent(requestedIds.value.join(','))}`)
    spots.value = data.spots
    missingIds.value = data.missingIds
    if (missingIds.value.length) error.value = 'Some selected spots are no longer available.'
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
  if (spots.value.length) loadLive(spots.value.map(s => s._id))
}

// Reviews, usual crowd and seats free now. Each one fails on its own, so the catalogue rows always show.
function loadLive(ids) {
  const fail = e => { liveError.value = true; console.error('Compare live data:', e.message) }
  for (const id of ids) {
    api(`/api/reviews?spotId=${id}`).then(list => { reviewsById.value = { ...reviewsById.value, [id]: list } }).catch(fail)
    api(`/api/checkins/${id}/pattern`).then(p => { patternsById.value = { ...patternsById.value, [id]: p } }).catch(fail)
  }
  api(`/api/checkins?spots=${ids.join(',')}`).then(counts => { checkedIn.value = counts }).catch(fail)
}

watch(() => String(route.query.ids || ''), load, { immediate: true })

function removeSpot(id) {
  const ids = idsAfterRemoval(comparison.selectedIds.value, id)
  comparison.restore(ids)
  // With fewer than two spots the student goes home, otherwise the page reloads with the shorter list.
  router.replace(comparisonLocation(ids))
}

// The column that wins a row: the only spot with the highest (or lowest) value. Needs two spots with data and no tie.
function bestIndex(values, higherIsBetter) {
  const known = values.filter(v => v != null)
  if (known.length < 2) return -1
  const top = higherIsBetter ? Math.max(...known) : Math.min(...known)
  return known.filter(v => v === top).length === 1 ? values.indexOf(top) : -1
}

// Each cell is { text, tag?, dot?, sort? }; sort is the number compared for "best".
const rows = computed(() => {
  const list = spots.value
  const cells = {
    where: list.map(s => ({ text: `${s.buildingName}, ${levelLabel(s.floor)}` })),
    seats: list.map(s => ({ text: `${s.seatCount} seats` })),
    power: list.map(s => ({ text: s.hasPowerSocket ? 'Available' : 'Not available' })),
    noise: list.map(s => (s.noiseLevel ? { text: s.noiseLevel, tag: s.noiseLevel.toLowerCase() } : { text: 'Not set' })),
    rating: list.map(s => {
      const reviews = reviewsById.value[s._id]
      if (!reviews) return { text: liveError.value ? '–' : '…' }
      const avg = averageRating(reviews)
      return avg ? { text: `★ ${avg} (${reviews.length})`, sort: Number(avg) } : { text: 'No reviews yet' }
    }),
    free: list.map(s => {
      if (!checkedIn.value) return { text: liveError.value ? '–' : '…' }
      const people = checkedIn.value[s._id] || 0
      const free = Math.max(0, s.seatCount - people)
      return { text: `~${free} of ${s.seatCount} free`, dot: seatsLevel(people, s.seatCount), sort: free }
    }),
    crowd: list.map(s => {
      const pattern = patternsById.value[s._id]
      if (!pattern) return { text: liveError.value ? '–' : '…' }
      if (pattern.total < MIN_FOR_SUMMARY) return { text: 'Not enough check-ins' }
      // null means nobody has checked in at this hour in the last 8 weeks
      const taken = pattern.days[now.day][now.hour]?.taken ?? 0
      return { text: `${percent(taken)} full`, sort: taken }
    }),
  }
  const at = hourLabel(now.hour)
  return [
    { key: 'where', label: 'Where', note: '' },
    { key: 'seats', label: 'Seats', note: '' },
    { key: 'power', label: 'Power sockets', note: '' },
    { key: 'noise', label: 'Noise level', note: 'from the catalogue' },
    { key: 'rating', label: 'Rating', note: 'from reviews', higher: true },
    { key: 'free', label: 'Seats free now', note: 'from check-ins', higher: true },
    { key: 'crowd', label: 'Usual crowd', note: `at ${at} · less is better`, higher: false },
  ].map(row => {
    const values = cells[row.key]
    const same = values.length > 1 && values.every(v => v.text === values[0].text)
    const best = 'higher' in row && !same ? bestIndex(values.map(v => v.sort ?? null), row.higher) : -1
    return { ...row, values, same, best }
  })
})

const sameCount = computed(() => rows.value.filter(r => r.same).length)
const shownRows = computed(() => (hideSame.value ? rows.value.filter(r => !r.same) : rows.value))

// The sticky note: the spot that wins the most live rows, with the reasons. Hidden on a tie.
const suggestion = computed(() => {
  const wins = spots.value.map(() => [])
  for (const row of rows.value) if (row.best >= 0) wins[row.best].push(row)
  const counts = wins.map(w => w.length)
  const top = Math.max(0, ...counts)
  if (!top || counts.filter(c => c === top).length > 1) return null
  const i = counts.indexOf(top)
  const spot = spots.value[i]
  const reasons = wins[i].map(row => {
    const text = row.values[i].text
    if (row.key === 'free') return `${text.replace(' free', '')} seats free right now`
    if (row.key === 'crowd') return `usually ${text} at ${hourLabel(now.hour)}`
    return `rated ${text}`
  })
  if (spot.hasPowerSocket) reasons.push('with power sockets')
  const sentence = reasons.join(', ')
  return { spot, reason: sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.' }
})
</script>

<template>
  <main class="nb-page" aria-labelledby="comparison-title">
    <RouterLink to="/" class="nb-back">‹ Back to study spots</RouterLink>

    <header class="nb-page-head">
      <div>
        <h1 id="comparison-title" class="nb-title">Compare study spots</h1>
        <p class="nb-subtitle">
          <template v-if="!loading && spots.length">
            {{ spots.length }} of {{ requestedIds.length }} spots · <mark class="nb-mark"><strong>highlighted</strong></mark> = best in that row
          </template>
        </p>
      </div>
      <button v-if="sameCount && spots.length" type="button" class="nb-btn same-toggle" :aria-pressed="hideSame" @click="hideSame = !hideSame">
        <span aria-hidden="true">≡</span> {{ hideSame ? `Show all rows (${sameCount} hidden)` : 'Hide rows that are the same' }}
      </button>
    </header>

    <p v-if="loading" class="nb-state" aria-live="polite">Loading the spots…</p>
    <p v-else-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="!loading && liveError" class="nb-state">Some reviews or check-ins couldn't load, so those rows may be incomplete.</p>

    <div v-if="!loading && spots.length" class="nb-table-wrap">
      <table class="compare">
        <caption class="visually-hidden">Study spots side by side. The best value in each live row is marked Best.</caption>
        <thead>
          <tr>
            <td class="corner"></td>
            <th v-for="spot in spots" :key="spot._id" scope="col">
              <div class="spot-head">
                <h2>{{ spot.name }}</h2>
                <button type="button" class="nb-icon-btn" :aria-label="`Remove ${spot.name} from the comparison`" @click="removeSpot(spot._id)">✕</button>
              </div>
              <p class="where">{{ spot.buildingName }} · {{ levelLabel(spot.floor) }}</p>
              <RouterLink :to="`/spots/${spot._id}`" class="view">View room →</RouterLink>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in shownRows" :key="row.key" :class="{ live: 'higher' in row }">
            <th scope="row">
              {{ row.label }}
              <small>{{ row.same ? 'same for all' : row.note }}</small>
            </th>
            <td v-for="(cell, i) in row.values" :key="spots[i]._id">
              <span v-if="cell.tag" class="nb-tag" :class="`nb-tag--${cell.tag}`">{{ cell.text }}</span>
              <template v-else>
                <span v-if="cell.dot" class="nb-dot" :class="`nb-dot--${cell.dot}`" aria-hidden="true"></span>
                <mark v-if="i === row.best" class="nb-mark"><strong>{{ cell.text }}</strong></mark>
                <span v-else>{{ cell.text }}</span>
              </template>
              <span v-if="i === row.best" class="best">☆ Best</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <aside v-if="suggestion" class="nb-note suggestion">
      <span class="nb-pin" aria-hidden="true"></span>
      <h2>Going now? Try {{ suggestion.spot.name }}</h2>
      <p>{{ suggestion.reason }}</p>
    </aside>

    <p v-if="!loading && !spots.length && !error" class="nb-state">No matching spots found.</p>
  </main>
</template>

<style scoped>
.nb-page-head { max-width: 1240px; }
.same-toggle { margin-bottom: 28px; border-style: dashed; border-radius: 999px; background: transparent; }
.same-toggle[aria-pressed='true'] { border-style: solid; background: var(--nb-highlight); }
.nb-state { margin-bottom: 20px; }

.nb-table-wrap { max-width: 1240px; }
.compare { width: 100%; min-width: 640px; border-collapse: collapse; color: var(--nb-ink); table-layout: fixed; }
.compare .corner { width: 190px; }
.compare thead th,
.compare .corner { background: var(--nb-manila-dark); border-bottom: 2px solid var(--nb-ink); }
.compare thead th { padding: 16px 20px 18px; font-weight: 400; text-align: left; vertical-align: top; }
.compare thead th,
.compare td { border-left: 2px solid var(--nb-ink); }

.spot-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.spot-head h2 { margin: 0; font: 700 1.8rem/1.1 var(--nb-heading); color: #28263f; overflow-wrap: break-word; }
.where { margin: 8px 0 6px; color: #28263f; font-size: 0.92rem; }
.view { color: #28263f; font-weight: 700; text-underline-offset: 3px; }

.compare tbody th,
.compare td { padding: 18px 20px; border-bottom: 1.5px dashed var(--nb-rule); text-align: left; vertical-align: middle; }
.compare tbody tr:last-child > * { border-bottom: none; }
.compare tbody th { font-weight: 700; }
.compare tbody th small { display: block; margin-top: 2px; color: var(--nb-muted); font-size: 0.82rem; font-weight: 400; }
/* catalogue rows sit on a slightly greyer paper than the live rows */
.compare tbody tr:not(.live) > * { background: rgba(40, 38, 63, 0.025); }
.compare tbody tr:not(.live) td { color: var(--nb-muted); }
.best { margin-left: 8px; font-size: 0.82rem; font-weight: 700; white-space: nowrap; }

.suggestion { max-width: 560px; margin: 40px 0 0 4px; transform: rotate(-1deg); }

/* On phones the table scrolls sideways inside its sheet (not the page), with the row labels pinned on the left. */
@media (max-width: 650px) {
  .compare { min-width: 660px; }
  .compare .corner { width: 118px; }
  .compare .corner,
  .compare tbody th { position: sticky; left: 0; z-index: 1; padding-left: 14px; padding-right: 10px; }
  .compare tbody th { background: var(--nb-sheet); box-shadow: 2px 0 0 var(--nb-ink); }
  .compare tbody tr:not(.live) > th { background: #f8f6f2; }
  .spot-head h2 { font-size: 1.5rem; }
}
</style>

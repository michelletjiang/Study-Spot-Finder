<script setup>
// ACTIVE (comparison): the side-by-side table at /compare?ids=a,b[,c]. It only reads: it never edits spots.
// Catalogue rows (where, seats, sockets, noise) come from the spot. Live rows (rating, seats free now,
// usual crowd) come from reviews and check-ins, and the best value in a live row is highlighted.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Tooltip } from 'bootstrap'
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
let tooltips = []

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
  // Meters are relative to this comparison, so the largest capacity is always the full bar.
  const largestSeatCount = Math.max(1, ...list.map(s => s.seatCount))
  const cells = {
    where: list.map(s => ({ text: `${s.buildingName}, ${levelLabel(s.floor)}` })),
    seats: list.map(s => ({ text: `${s.seatCount} seats`, progress: Math.round(s.seatCount / largestSeatCount * 100) })),
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
      return { text: `~${free} of ${s.seatCount} free`, dot: seatsLevel(people, s.seatCount), sort: free, progress: Math.round(free / largestSeatCount * 100) }
    }),
    crowd: list.map(s => {
      const pattern = patternsById.value[s._id]
      if (!pattern) return { text: liveError.value ? '–' : '…' }
      if (pattern.total < MIN_FOR_SUMMARY) return { text: 'Not enough check-ins' }
      // null means nobody has checked in at this hour in the last 8 weeks
      const taken = pattern.days[now.day][now.hour]?.taken ?? 0
      return { text: `${percent(taken)} full`, sort: taken, progress: Math.round(taken * 100) }
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

// Summarise the unique row winners before the detailed cards, so students can decide at a glance.
const winnerSummary = computed(() => rows.value.filter(row => row.best >= 0).map(row => ({ label: row.label, spot: spots.value[row.best]?.name })))

// Bootstrap tooltips explain live rows and the meaning of the highlighted best badge.
function refreshTooltips() {
  tooltips.forEach(tooltip => tooltip.dispose())
  tooltips = [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].map(node => new Tooltip(node))
}
onMounted(refreshTooltips)
watch([shownRows, spots], refreshTooltips)
onBeforeUnmount(() => tooltips.forEach(tooltip => tooltip.dispose()))

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
  <main class="nb-page compare-page" aria-labelledby="comparison-title">
    <!-- Bootstrap's container and flex utilities keep the heading and controls aligned at every width. -->
    <div class="container-fluid px-0">
      <RouterLink to="/" class="nb-back">‹ Back to study spots</RouterLink>
      <header class="page-heading d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <h1 id="comparison-title" class="nb-title">Compare study spots</h1>
          <p class="nb-subtitle" aria-live="polite">
            <template v-if="!loading && spots.length">{{ spots.length }} spots · <mark class="nb-mark"><strong>highlighted</strong></mark> = best in that row</template>
          </p>
        </div>
        <!-- A Bootstrap button group makes the table filter easy to find and keyboard accessible. -->
        <div v-if="sameCount && spots.length" class="btn-group same-toggle" role="group" aria-label="Comparison row options">
          <button type="button" class="btn nb-btn" :class="{ 'is-active': hideSame }" :aria-pressed="hideSame" @click="hideSame = !hideSame">
            <span aria-hidden="true">≡</span> {{ hideSame ? `Show all rows (${sameCount} hidden)` : 'Hide same rows' }}
          </button>
        </div>
      </header>
    </div>

    <p v-if="loading" class="nb-state" aria-live="polite">Loading the spots…</p>
    <p v-else-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="!loading && liveError" class="nb-state" role="status">Some reviews or check-ins couldn't load, so those rows may be incomplete.</p>

    <!-- This compact Bootstrap alert gives the computed row winners a useful summary. -->
    <div v-if="!loading && winnerSummary.length" class="alert winner-summary" role="status">
      <strong>Quick take:</strong>
      <span v-for="winner in winnerSummary" :key="winner.label" class="winner-item">{{ winner.label }}: {{ winner.spot }}</span>
    </div>

    <!-- Each spot is a Bootstrap card on small screens; the same cards become columns on larger screens. -->
    <TransitionGroup v-if="!loading && spots.length" name="compare-card" tag="div" class="row g-3 spot-grid">
      <article v-for="spot in spots" :key="spot._id" class="col-12 spot-column">
        <section class="card spot-card h-100">
          <header class="card-header spot-card-header">
            <div class="spot-head">
              <div>
                <h2 class="card-title mb-1">{{ spot.name }}</h2>
                <p class="where">{{ spot.buildingName }} · {{ levelLabel(spot.floor) }}</p>
              </div>
              <button type="button" class="nb-icon-btn" :aria-label="`Remove ${spot.name} from the comparison`" @click="removeSpot(spot._id)">✕</button>
            </div>
            <RouterLink :to="`/spots/${spot._id}`" class="view">View room →</RouterLink>
          </header>
          <div class="card-body">
            <dl class="comparison-list">
              <template v-for="row in shownRows" :key="row.key">
                <div class="comparison-row" :class="{ 'is-live': 'higher' in row }">
                  <dt>{{ row.label }} <small :title="'higher' in row ? 'Live data from reviews or check-ins.' : row.note">{{ row.same ? 'same for all' : row.note }}</small></dt>
                  <dd>
                    <span v-if="row.values[spots.indexOf(spot)].tag" class="badge nb-tag" :class="`nb-tag--${row.values[spots.indexOf(spot)].tag}`">{{ row.values[spots.indexOf(spot)].text }}</span>
                    <template v-else>
                      <span v-if="row.values[spots.indexOf(spot)].dot" class="nb-dot" :class="`nb-dot--${row.values[spots.indexOf(spot)].dot}`" aria-hidden="true"></span>
                      <mark v-if="spots.indexOf(spot) === row.best" class="nb-mark"><strong>{{ row.values[spots.indexOf(spot)].text }}</strong></mark>
                      <span v-else>{{ row.values[spots.indexOf(spot)].text }}</span>
                    </template>
                    <span v-if="row.values[spots.indexOf(spot)].progress != null" class="progress value-meter" role="progressbar" :aria-valuenow="row.values[spots.indexOf(spot)].progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`${row.label} visual meter`">
                      <span class="progress-bar" :style="{ width: `${row.values[spots.indexOf(spot)].progress}%` }"></span>
                    </span>
                    <span v-if="spots.indexOf(spot) === row.best" class="badge best-badge" data-bs-toggle="tooltip" title="This is the strongest unique value in this row.">Best</span>
                  </dd>
                </div>
              </template>
            </dl>
          </div>
        </section>
      </article>
    </TransitionGroup>

    <aside v-if="suggestion" class="nb-note suggestion">
      <span class="nb-pin" aria-hidden="true"></span>
      <h2>Going now? Try {{ suggestion.spot.name }}</h2>
      <p>{{ suggestion.reason }}</p>
    </aside>
    <p v-if="!loading && !spots.length && !error" class="nb-state">No matching spots found.</p>
  </main>
</template>

<style scoped>
/* The comparison sheet uses Bootstrap layout primitives while preserving the notebook tokens for its surfaces. */
.compare-page { max-width: 1240px; }
.page-heading { margin-bottom: 24px; }
.same-toggle .nb-btn { border-style: dashed; border-radius: 999px; background: transparent; }
.same-toggle .nb-btn.is-active { border-style: solid; background: var(--nb-highlight); }
.nb-state { margin-bottom: 20px; }
/* The summary uses Bootstrap alert semantics but keeps the notebook's paper and ink colours. */
.winner-summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; max-width: 1240px; margin: 0 auto 20px; border: 2px solid var(--nb-ink); background: var(--nb-note-blue); color: var(--nb-ink); }
.winner-item { font-weight: 700; }
/* Small progress bars add a visual scale to seat capacity and live occupancy without replacing the text. */
.spot-grid { max-width: 1240px; margin-inline: auto; }
.value-meter { display: inline-flex; width: 56px; height: 7px; margin: 0 0 0 8px; vertical-align: middle; background: var(--nb-rule-light); }
.value-meter .progress-bar { background: var(--nb-focus); }

.spot-column { min-width: 0; }
.spot-card { overflow: hidden; border: 2px solid var(--nb-ink); border-radius: 10px; background: var(--nb-card); box-shadow: 6px 6px 0 var(--nb-shadow); color: var(--nb-ink); }
.spot-card-header { border-bottom: 2px solid var(--nb-ink); background: var(--nb-manila-dark); }
.spot-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.spot-head h2 { color: var(--nb-ink); font: 700 1.8rem/1.1 var(--nb-heading); overflow-wrap: anywhere; }
.where { margin: 4px 0 8px; color: var(--nb-ink); font-size: .92rem; }
.view { color: var(--nb-ink); font-weight: 700; text-underline-offset: 3px; }
.comparison-list { margin: 0; }
.comparison-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; padding: 10px 0; border-bottom: 1.5px dashed var(--nb-rule); }
.comparison-row:last-child { border-bottom: 0; }
.comparison-row dt { min-width: 0; font-weight: 700; }
.comparison-row dt small { display: block; color: var(--nb-muted); font-size: .78rem; font-weight: 400; line-height: 1.2; }
.comparison-row dd { flex: 0 1 auto; margin: 0; text-align: right; }
.comparison-row.is-live dd { font-weight: 600; }
.best-badge { margin-left: 8px; border: 1px solid var(--nb-ink); background: var(--nb-highlight); color: var(--nb-ink); }
.suggestion { max-width: 560px; margin: 40px 0 0 4px; transform: rotate(-1deg); }
.compare-card-enter-active, .compare-card-leave-active { transition: opacity .2s ease, transform .2s ease; }
.compare-card-enter-from, .compare-card-leave-to { opacity: 0; transform: translateY(8px); }
/* Two cards fit comfortably on desktop; phones retain one readable card per spot with no sideways page scroll. */
@media (min-width: 800px) { .spot-column { flex: 1 0 0; width: auto; } }
/* Narrow screens use one card per spot and keep every label readable without horizontal scrolling. */
@media (max-width: 650px) { .compare-page { padding-inline: 12px; } .comparison-row { align-items: flex-start; } .comparison-row dt { position: sticky; left: 0; } }
@media (prefers-reduced-motion: reduce) { .compare-card-enter-active, .compare-card-leave-active { transition: none; } }
</style>

<script setup>
// ACTIVE: the student's favourite spots, one manila folder each, plus a card that leads to more spots.
// Each folder also shows the room's live status: reported issues (alerts) and seats free right now.
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { favourites } from '../stores/favourites'
import { loadSpotIndex } from '../spotIndex'
import { floorLabel, normalizeFloor } from '../floors'
import { alertLabel, alertIcon } from '../alerts'
import { timeAgo } from '../reviews'
import { seatsLevel, seatsFreeText } from '../seats'

const error = ref('')
const loading = ref(true)
// finds a favourite's spot (for "View room"); null until loaded, or if loading the spots failed
const findSpot = ref(null)
// live status, keyed by spot _id: people checked in and [active alerts]
const checkedInBySpot = ref({})
const alertsBySpot = ref({})
const statusLoaded = ref(false)

onMounted(async () => {
  try {
    // GET /api/favourites, filled into the shared list.
    await favourites.load()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
  // without the spots, "View room" falls back to the building page
  loadSpotIndex()
    .then(find => {
      findSpot.value = find
      return loadLiveStatus()
    })
    .catch(e => console.error('Could not load spots:', e.message))
})

const spotFor = fav => findSpot.value?.(fav.buildingName, fav.spotName)

// one request each for every saved room; either can fail without breaking the page
async function loadLiveStatus() {
  const ids = favourites.list.map(spotFor).filter(Boolean).map(s => s._id).join(',')
  if (!ids) return
  const [checkins, alerts] = await Promise.allSettled([api(`/api/checkins?spots=${ids}`), api(`/api/alerts?spots=${ids}`)])
  if (checkins.status === 'fulfilled') checkedInBySpot.value = checkins.value
  if (alerts.status === 'fulfilled') alertsBySpot.value = alerts.value
  statusLoaded.value = checkins.status === 'fulfilled'
}

const checkedInFor = fav => checkedInBySpot.value[spotFor(fav)?._id] || 0
const alertsFor = fav => alertsBySpot.value[spotFor(fav)?._id] || []

// Favourites are copies of the spot's details taken when it was saved, so link by building + name.
function roomLink(fav) {
  const spot = spotFor(fav)
  return spot ? `/spots/${spot._id}` : `/building/${fav.buildingName}`
}

async function remove(fav) {
  try {
    // DELETE /api/favourites/:id (only your own).
    await api(`/api/favourites/${fav._id}`, { method: 'DELETE' })
    favourites.list = favourites.list.filter(f => f._id !== fav._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="nb-page">
    <h1 class="nb-title">My favourite spots</h1>
    <p class="nb-subtitle">
      <template v-if="!loading">{{ favourites.list.length }} spot{{ favourites.list.length === 1 ? '' : 's' }} saved</template>
    </p>

    <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="loading" class="nb-state">Loading your favourites…</p>

    <div v-else class="grid">
      <article v-for="fav in favourites.list" :key="fav._id" class="nb-folder">
        <span class="nb-folder-paper" aria-hidden="true">{{ fav.buildingName }}</span>
        <div class="nb-folder-front">
          <div class="title-row">
            <h2>{{ fav.spotName }}</h2>
            <button type="button" class="heart" :aria-label="`Remove ${fav.spotName} from favourites`" @click="remove(fav)">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="#f5a0a6" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <p class="where">{{ fav.buildingName }} · {{ floorLabel(normalizeFloor(fav.floor)) }}</p>
          <p class="tags">
            <span class="nb-tag">{{ fav.seatCount }} seats</span>
            <span v-if="fav.hasPowerSocket" class="nb-tag">Power sockets</span>
            <span v-if="fav.noiseLevel" class="nb-tag" :class="`nb-tag--${fav.noiseLevel.toLowerCase()}`">{{ fav.noiseLevel }}</span>
          </p>
          <div class="live">
            <p v-for="alert in alertsFor(fav)" :key="alert._id" class="live-alert">
              <span aria-hidden="true">{{ alertIcon(alert.type) }}</span> <strong>{{ alertLabel(alert.type) }}</strong> · {{ timeAgo(alert.createdAt) }}
            </p>
            <p v-if="checkedInFor(fav)">
              <span class="nb-dot" :class="`nb-dot--${seatsLevel(checkedInFor(fav), spotFor(fav).seatCount)}`" aria-hidden="true"></span>
              <strong>{{ seatsFreeText(checkedInFor(fav), spotFor(fav).seatCount) }}</strong> right now
            </p>
            <p v-else-if="statusLoaded && spotFor(fav)" class="live-none">Nobody checked in right now</p>
          </div>
          <RouterLink :to="roomLink(fav)" class="view">View room →</RouterLink>
        </div>
      </article>

      <RouterLink to="/" class="find-more">
        <span class="plus" aria-hidden="true">+</span>
        <strong>Find more spots</strong>
        <span>Tap ♥ on any room to save it here</span>
      </RouterLink>
    </div>

    <RouterLink to="/" class="nb-back">‹ All buildings</RouterLink>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 32px;
  max-width: 1140px;
  margin-bottom: 36px;
}
.nb-folder { min-height: 270px; }

.live { display: grid; gap: 6px; margin-bottom: 10px; font-size: 0.92rem; }
.live p { margin: 0; }
.live-alert {
  width: fit-content;
  padding: 1px 8px;
  border: 1.5px solid var(--nb-error);
  border-radius: 6px;
  background: var(--nb-note-pink);
}
.live-none { color: #4a4660; font-style: italic; }

.title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; width: 100%; }
h2 { margin: 4px 0 0; font: 700 1.9rem/1.1 var(--nb-heading); color: #28263f; overflow-wrap: anywhere; }
.heart {
  display: grid;
  place-items: center;
  flex: none;
  width: 42px;
  height: 42px;
  border: 2px solid #28263f;
  border-radius: 50%;
  background: #fffef9;
  color: #28263f;
  cursor: pointer;
}
.heart:hover { background: var(--nb-note-pink); }
.heart:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
.where { margin: 8px 0 10px; color: #5e5a73; font-size: 0.92rem; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
.view { margin-top: auto; padding-top: 16px; color: #28263f; font-weight: 700; text-underline-offset: 3px; }
.view:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 3px; }

/* the empty slot at the end: a dashed card that leads back to the buildings */
.find-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 230px;
  margin-top: 40px;
  border: 2px dashed var(--nb-ink);
  border-radius: 6px;
  background: rgba(255, 254, 249, 0.6);
  color: var(--nb-muted);
  text-align: center;
  text-decoration: none;
}
.find-more:hover { background: var(--nb-sheet); color: var(--nb-muted); }
.find-more:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 3px; }
.find-more .plus { font-size: 2.4rem; line-height: 1; color: var(--nb-ink); }
.find-more strong { font: 700 1.9rem/1.1 var(--nb-heading); color: var(--nb-ink); }
</style>

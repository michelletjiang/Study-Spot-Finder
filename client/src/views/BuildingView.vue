<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { useBuildingSpots } from '../buildingSpots'
import { normalizeFloor, floorOrder, floorLabel } from '../floors'
import { floorplans, findFloorplan } from '../floorplans'
import { openStatus } from '../buildingHours'
import { isGroupRoom, isQuiet } from '../roomTypes'
import FloorPlan from '../components/FloorPlan.vue'
import SpotPanel from '../components/SpotPanel.vue'
import { seatsLevel, SEAT_LEVELS } from '../seats'

// A building: floor tabs, the chosen floor's plan (rooms coloured by rating), and a details card for the clicked room.
// The floor and room are kept in ?floor= and ?spot=, so the back button and shared links come back to the same view.
const route = useRoute()
const router = useRouter()
const buildingName = computed(() => route.params.name)
const { spots, loading, error } = useBuildingSpots(buildingName)

// only floors with something to show: a study spot or a floorplan (so e.g. LKS level 1 isn't listed)
const floors = computed(() => {
  const all = new Set(Object.keys(floorplans[buildingName.value] || {}))
  for (const s of spots.value) all.add(normalizeFloor(s.floor))
  return [...all].sort((a, b) => floorOrder(a) - floorOrder(b))
})

const spotsOn = floor => spots.value.filter(s => normalizeFloor(s.floor) === floor)
const hasPlan = floor => !!findFloorplan(buildingName.value, floor)
const tabLabel = floor => (floor.startsWith('B') ? floor : `L${floor}`)

// ?floor= if it's valid, otherwise the first floor with a floorplan, otherwise the first floor
const selectedFloor = computed(() =>
  floors.value.includes(route.query.floor) ? route.query.floor : floors.value.find(hasPlan) || floors.value[0])
const selectedPlan = computed(() => findFloorplan(buildingName.value, selectedFloor.value))
const floorSpots = computed(() => spotsOn(selectedFloor.value))
const selectedSpot = computed(() => floorSpots.value.find(s => s._id === route.query.spot) || null)

// open/closed badge, refreshed every minute
const now = ref(new Date())
const status = computed(() => openStatus(buildingName.value, now.value))

// ---------- filters ----------
const FILTERS = [
  { key: 'power', label: 'Power sockets', test: s => s.hasPowerSocket },
  { key: 'group', label: 'Group study rooms', test: isGroupRoom },
  { key: 'quiet', label: 'Quiet', test: isQuiet },
]
const activeFilters = ref([])
const matches = spot => FILTERS.filter(f => activeFilters.value.includes(f.key)).every(f => f.test(spot))
const dimmedIds = computed(() => floorSpots.value.filter(s => !matches(s)).map(s => s._id))
const matchCount = computed(() => floorSpots.value.length - dimmedIds.value.length)

function toggleFilter(key) {
  activeFilters.value = activeFilters.value.includes(key)
    ? activeFilters.value.filter(k => k !== key)
    : [...activeFilters.value, key]
}

// ---------- room colours: by rating, or by seats free right now ----------
const colourBy = ref('rating') // 'rating' | 'seats'

function ratingTone(spot) {
  if (spot.avgRating == null) return 'none'
  if (spot.avgRating >= 4.5) return 'top'
  if (spot.avgRating >= 4) return 'mid'
  return 'low'
}
// 'plenty' | 'some' | 'few' | 'full', or 'none' when nobody is checked in (so we don't know)
const seatsTone = spot => (checkedInBySpot.value[spot._id] ? seatsLevel(checkedInBySpot.value[spot._id], spot.seatCount) : 'none')
const tone = spot => (colourBy.value === 'seats' ? seatsTone(spot) : ratingTone(spot))

const tones = computed(() => Object.fromEntries(floorSpots.value.map(s => [s._id, tone(s)])))
const anyReviews = computed(() => spots.value.some(s => s.reviewCount > 0))
const anyCheckIns = computed(() => Object.values(checkedInBySpot.value).some(n => n > 0))

// ---------- live data for this floor's rooms: check-ins and reported issues (alerts) ----------
// spot _id -> people checked in, and spot _id -> active alerts. Rooms missing from a map have nothing to show.
const checkedInBySpot = ref({})
const alertsBySpot = ref({})
const floorSpotIds = computed(() => floorSpots.value.map(s => s._id).join(','))

// loads one map for the current floor; the plan works fine without it, so errors are ignored
async function loadFloorData(path, target, ids) {
  try {
    const data = await api(`${path}?spots=${ids}`)
    if (floorSpotIds.value === ids) target.value = data // still on the same floor
  } catch {
    // nothing to show
  }
}

watch(floorSpotIds, ids => {
  checkedInBySpot.value = {}
  alertsBySpot.value = {}
  if (!ids) return
  loadFloorData('/api/checkins', checkedInBySpot, ids)
  loadFloorData('/api/alerts', alertsBySpot, ids)
}, { immediate: true })

// the room panel posted, voted on or resolved an alert, or you checked in / out ({ spotId: people } for each room that changed)
function onAlertsChange(spotId, list) {
  alertsBySpot.value = { ...alertsBySpot.value, [spotId]: list }
}
function onCheckinsChange(counts) {
  checkedInBySpot.value = { ...checkedInBySpot.value, ...counts }
}
const hasAlerts = spot => alertsBySpot.value[spot._id]?.length > 0

// ---------- floors, rooms, zoom, list ----------
function chooseFloor(floor) {
  router.replace({ query: { floor } }) // a new floor starts with no room selected
}

function stepFloor(step) {
  const i = floors.value.indexOf(selectedFloor.value) + step
  if (i >= 0 && i < floors.value.length) chooseFloor(floors.value[i])
}
const isFirstFloor = computed(() => floors.value.indexOf(selectedFloor.value) <= 0)
const isLastFloor = computed(() => floors.value.indexOf(selectedFloor.value) >= floors.value.length - 1)

function selectSpot(spot) {
  router.replace({ query: { floor: selectedFloor.value, spot: spot._id } })
}
function closePanel() {
  router.replace({ query: { floor: selectedFloor.value } })
}

const ZOOMS = [1, 1.5, 2]
const zoom = ref(1)
const zoomIn = () => (zoom.value = ZOOMS[Math.min(ZOOMS.indexOf(zoom.value) + 1, ZOOMS.length - 1)])
const zoomOut = () => (zoom.value = ZOOMS[Math.max(ZOOMS.indexOf(zoom.value) - 1, 0)])

// list view: chosen with the ☰ button, and always used for floors without a plan
const listChosen = ref(false)
const showList = computed(() => listChosen.value || !selectedPlan.value)
watch(selectedFloor, () => (zoom.value = 1))

// ← / → switch floors, unless you're typing somewhere
function onKey(e) {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.altKey || e.ctrlKey || e.metaKey) return
  if (e.key === 'ArrowLeft') stepFloor(-1)
  if (e.key === 'ArrowRight') stepFloor(1)
}

let timer
onMounted(() => {
  window.addEventListener('keydown', onKey)
  timer = setInterval(() => (now.value = new Date()), 60_000)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  clearInterval(timer)
})
</script>

<template>
  <div class="building-page">
    <RouterLink to="/" class="back">‹ All buildings</RouterLink>

    <header class="title-row">
      <h1>{{ buildingName }}</h1>
      <span v-if="status" class="status" :class="status.state">
        <span class="dot" aria-hidden="true"></span>{{ status.text }}
      </span>
    </header>

    <p v-if="loading" class="nb-state">Loading floors and rooms…</p>
    <p v-else-if="error" class="nb-state nb-state--error">Couldn't load this building: {{ error }}</p>
    <p v-else-if="floors.length === 0" class="nb-state">No study spots in this building yet.</p>

    <template v-else>
      <div class="toolbar">
        <div class="filters" role="group" aria-label="Show rooms with">
          <span class="label">Show rooms with</span>
          <button
            v-for="f in FILTERS" :key="f.key" type="button" class="chip"
            :aria-pressed="activeFilters.includes(f.key)" @click="toggleFilter(f.key)"
          >{{ f.label }}</button>
        </div>
        <div class="legend-wrap">
          <div class="colour-by" role="group" aria-label="Colour rooms by">
            <span class="label">Colour rooms by</span>
            <button type="button" class="chip" :aria-pressed="colourBy === 'rating'" @click="colourBy = 'rating'">Rating</button>
            <button type="button" class="chip" :aria-pressed="colourBy === 'seats'" @click="colourBy = 'seats'">Seats free now</button>
          </div>
          <div v-if="colourBy === 'rating'" class="legend" aria-label="Room colours: average rating">
            <span><i class="swatch top"></i>4.5 and up</span>
            <span><i class="swatch mid"></i>4.0 – 4.4</span>
            <span><i class="swatch low"></i>Under 4.0</span>
            <span><i class="swatch none"></i>No reviews yet</span>
            <span><i class="swatch alert"></i>Issue reported</span>
          </div>
          <div v-else class="legend" aria-label="Room colours: seats free right now">
            <span v-for="level in SEAT_LEVELS" :key="level.key"><i class="swatch" :class="level.key"></i>{{ level.label }}</span>
            <span><i class="swatch none"></i>Nobody checked in</span>
            <span><i class="swatch alert"></i>Issue reported</span>
          </div>
        </div>
      </div>

      <div class="layout" :class="{ 'with-panel': selectedSpot }">
        <div class="plan-col">
          <div class="tab-row">
            <nav class="tabs" aria-label="Floors">
              <button
                v-for="floor in floors" :key="floor" type="button" class="tab"
                :class="{ active: floor === selectedFloor }" :aria-current="floor === selectedFloor ? 'true' : null"
                :aria-label="`${floorLabel(floor)}, ${spotsOn(floor).length} study spots`"
                @click="chooseFloor(floor)"
              >
                <strong>{{ tabLabel(floor) }}</strong>
                <small> · {{ spotsOn(floor).length }}<template v-if="floor === selectedFloor"> spot{{ spotsOn(floor).length === 1 ? '' : 's' }}</template></small>
              </button>
            </nav>
            <div class="steppers">
              <button type="button" class="square" aria-label="Previous floor" :disabled="isFirstFloor" @click="stepFloor(-1)">‹</button>
              <button type="button" class="square" aria-label="Next floor" :disabled="isLastFloor" @click="stepFloor(1)">›</button>
            </div>
          </div>

          <section class="sheet" :aria-label="`${floorLabel(selectedFloor)} floor plan`">
            <div class="sheet-tools">
              <template v-if="selectedPlan && !showList">
                <button type="button" class="square" aria-label="Zoom in" :disabled="zoom === ZOOMS[ZOOMS.length - 1]" @click="zoomIn">+</button>
                <button type="button" class="square" aria-label="Zoom out" :disabled="zoom === ZOOMS[0]" @click="zoomOut">−</button>
              </template>
              <button
                v-if="selectedPlan" type="button" class="square" :aria-pressed="listChosen"
                :aria-label="listChosen ? 'Show floor plan' : 'Show rooms as a list'" @click="listChosen = !listChosen"
              >{{ listChosen ? '▦' : '☰' }}</button>
            </div>

            <p v-if="activeFilters.length" class="match-note">
              {{ matchCount }} of {{ floorSpots.length }} rooms match
              <button type="button" class="link" @click="activeFilters = []">Clear filters</button>
            </p>

            <!-- plan -->
            <div v-if="!showList" class="plan-scroll">
              <div class="plan-inner" :style="{ width: `${zoom * 100}%` }">
                <FloorPlan
                  :plan="selectedPlan" :spots="floorSpots" :selected-id="selectedSpot?._id ?? null"
                  :tones="tones" :dimmed-ids="dimmedIds" :alerts="alertsBySpot" :checked-in="checkedInBySpot" @select="selectSpot"
                />
              </div>
            </div>

            <!-- list (also the fallback for floors without a plan) -->
            <div v-else class="room-list">
              <p v-if="!selectedPlan" class="no-plan">No floor plan for {{ floorLabel(selectedFloor) }} yet, so here are its rooms as a list.</p>
              <p v-if="!floorSpots.length" class="no-plan">No study spots on this floor yet.</p>
              <button
                v-for="spot in floorSpots" :key="spot._id" type="button" class="room"
                :class="[`tone-${tone(spot)}`, { dimmed: dimmedIds.includes(spot._id), selected: selectedSpot?._id === spot._id }]"
                @click="selectSpot(spot)"
              >
                <strong>{{ spot.name }}<span v-if="hasAlerts(spot)" class="alert-flag" title="Issue reported"> ⚠</span></strong>
                <span>{{ spot.seatCount }} seats</span>
                <span>{{ spot.hasPowerSocket ? '🔌 Sockets' : 'No sockets' }}</span>
                <span v-if="colourBy === 'seats'">{{ checkedInBySpot[spot._id] ? `~${Math.max(0, spot.seatCount - checkedInBySpot[spot._id])} free` : 'Nobody checked in' }}</span>
                <span v-else>{{ spot.avgRating != null ? `★ ${spot.avgRating.toFixed(1)}` : 'No reviews' }}</span>
              </button>
            </div>

            <p class="footnote">
              Tap a room for seats and reviews. Use ← → to switch floors.
              <template v-if="colourBy === 'rating' && !anyReviews"> Rooms get their colour once they have reviews.</template>
              <template v-if="colourBy === 'seats' && !anyCheckIns"> Nobody on this floor is checked in right now. Pick the room you're in and tap Check in here.</template>
              <template v-if="colourBy === 'seats'"> Seats free only counts people who checked in through the app, so it's an estimate.</template>
            </p>
          </section>
        </div>

        <SpotPanel
          v-if="selectedSpot" :spot="selectedSpot" class="panel"
          @close="closePanel" @alerts-change="onAlertsChange" @checkins-change="onCheckinsChange"
        />
        <aside v-else class="hint-card">
          <h2>{{ floorLabel(selectedFloor) }}</h2>
          <p>{{ floorSpots.length }} study spot{{ floorSpots.length === 1 ? '' : 's' }} ·
            {{ floorSpots.filter(s => s.hasPowerSocket).length }} with power sockets</p>
          <p class="muted">Pick a room on the plan to see its seats, how busy it is and what people say about it.</p>
          <p class="muted">Something wrong in a room (aircon, Wi-Fi, locked)? Pick it and tap <strong>Report an issue</strong> to warn others.</p>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.building-page {
  /* colours come from the shared notebook palette (style.css) */
  padding: 18px 24px 140px 48px; /* left clears the pink margin line, bottom clears the minimap */
  color: var(--nb-ink);
  text-align: left;
  font-family: 'Patrick Hand', system-ui, sans-serif;
  font-size: 1.05rem;
}

.back { color: var(--nb-ink); font-weight: 700; text-decoration: none; }
.back:hover { text-decoration: underline; }

.title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 16px; margin: 6px 0 14px; }
h1 {
  margin: 0;
  font: 700 clamp(2.4rem, 5vw, 3.4rem)/1.05 var(--nb-heading);
  color: var(--nb-ink);
  letter-spacing: 0;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 2px 12px;
  border: 2px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-card);
  font-size: 0.95rem;
  white-space: nowrap;
}
.status .dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--nb-ink); }
.status.open .dot { background: #5fb36b; }
.status.closing { background: var(--nb-highlight); color: #28263f; }
.status.closing .dot { background: #f0a23a; }
.status.closed { border-style: dashed; background: transparent; color: var(--nb-muted); }
.status.closed .dot { background: #f5a0a6; }

/* ---------- toolbar ---------- */
.toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px 24px; margin-bottom: 18px; }
.filters, .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.label { font-weight: 700; margin-right: 4px; }
.chip {
  padding: 2px 14px;
  border: 2px dashed var(--nb-ink);
  border-radius: 999px;
  background: transparent;
  color: var(--nb-ink);
  font: inherit;
  font-size: 0.98rem;
  cursor: pointer;
}
.chip[aria-pressed='true'] { border-style: solid; background: var(--nb-highlight); color: #28263f; }
.legend { font-size: 0.9rem; gap: 6px 14px; }
.legend > span:not(.label) { display: inline-flex; align-items: center; gap: 5px; }
.swatch { display: inline-block; width: 16px; height: 16px; border: 1.5px solid var(--nb-ink); border-radius: 3px; }
.swatch.top { background: #5cb068; }
.swatch.mid { background: #a4d99c; }
.swatch.low { background: #def3d6; }
.swatch.none { background: transparent; border-style: dashed; }
.swatch.alert { background: transparent; border: 2px dashed var(--nb-error); }
.swatch.plenty { background: #5fb36b; }
.swatch.some { background: #f0c23a; }
.swatch.few { background: #f0a23a; }
.swatch.full { background: #e0606a; }
.legend-wrap { display: grid; gap: 6px; justify-items: start; }
.colour-by { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.colour-by .chip { padding: 0 12px; font-size: 0.92rem; }
.alert-flag { color: var(--nb-error); }

/* ---------- layout ---------- */
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; align-items: start; }
.plan-col { min-width: 0; }

.tab-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 10px; }
.tab {
  position: relative;
  bottom: -2px; /* sits on the sheet's top border */
  padding: 6px 16px 5px;
  border: 2px solid var(--nb-ink);
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: inherit;
  cursor: pointer;
}
.tab small { color: var(--nb-muted); font-size: 0.82rem; }
.tab.active { z-index: 1; padding-top: 10px; background: var(--nb-highlight); color: #28263f; }
.tab.active small { color: #4a4660; }
.steppers { display: flex; gap: 6px; margin-bottom: 8px; }

.square {
  width: 38px;
  height: 38px;
  border: 2px solid var(--nb-ink);
  border-radius: 8px;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: 700 1.2rem/1 system-ui, sans-serif;
  cursor: pointer;
}
.square:disabled { opacity: 0.35; cursor: default; }
.square[aria-pressed='true'] { background: var(--nb-highlight); color: #28263f; }

.sheet {
  position: relative;
  padding: 14px 14px 12px;
  background: var(--nb-sheet);
  border: 2px solid var(--nb-ink);
  border-radius: 4px;
  box-shadow: 7px 7px 0 var(--nb-ink);
}
.sheet-tools { position: absolute; top: 14px; right: 14px; z-index: 2; display: flex; flex-direction: column; gap: 6px; }

.match-note { margin: 0 56px 8px 0; font-size: 0.95rem; }
.link { border: none; background: none; color: var(--nb-ink); font: inherit; text-decoration: underline; cursor: pointer; }

.plan-scroll { overflow: auto; max-height: 72vh; margin-right: 52px; border-radius: 6px; }
.plan-inner { min-width: 100%; }

.room-list { display: grid; gap: 8px; margin-right: 52px; }
.room {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
  padding: 9px 14px;
  border: 2px solid var(--nb-ink);
  border-radius: 6px;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.room span { color: var(--nb-muted); font-size: 0.92rem; }
.room.tone-top { background: #5cb068; color: #28263f; }
.room.tone-mid { background: #a4d99c; color: #28263f; }
.room.tone-low { background: #def3d6; color: #28263f; }
.room.tone-plenty { background: #5fb36b; color: #28263f; }
.room.tone-some { background: #f0c23a; color: #28263f; }
.room.tone-few { background: #f0a23a; color: #28263f; }
.room.tone-full { background: #e0606a; color: #28263f; }
.room[class*='tone-']:not(.tone-none) span { color: #4a4660; }
.room.selected { box-shadow: 4px 4px 0 var(--nb-ink); }
.room.dimmed { opacity: 0.35; }
.no-plan { margin: 0; padding: 12px; border: 1.5px dashed var(--nb-rule); border-radius: 6px; color: var(--nb-muted); }

.footnote { margin: 10px 0 0; font-size: 0.9rem; color: var(--nb-muted); }

.hint-card {
  padding: 18px;
  border: 2px dashed var(--nb-ink);
  border-radius: 6px;
  background: var(--nb-card);
}
.hint-card h2 { margin: 0 0 6px; font: 700 1.8rem/1.1 var(--nb-heading); color: var(--nb-ink); }
.hint-card p { margin: 0 0 6px; }
.muted { color: var(--nb-muted); }

button:focus-visible, a:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }

@media (max-width: 960px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .building-page { padding-left: 16px; padding-right: 16px; }
  .plan-scroll, .room-list { margin-right: 0; margin-top: 50px; }
  .sheet-tools { flex-direction: row; }
  .room { grid-template-columns: 1fr 1fr; }
}
</style>

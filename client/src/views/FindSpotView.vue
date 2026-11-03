<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '../api'
import { NEEDS, rankSpots } from '../ranking'
import { levelLabel } from '../floors'
import { alertLabel, alertIcon } from '../alerts'
import { seatsLevel, seatsFreeText, peopleText } from '../seats'
import { fetchNearby, walkText } from '../location'
import { NEED_LEVELS, DISTANCE_LEVELS } from '../preferences'

// /find - "Find the right study spot" (linked from the home page): pick needs, share your location,
// get the top 10 spots ranked. The ranking itself lives in ranking.js; this file is the page around it.

// ---------------------------------------------------------------------
// Page state
// ---------------------------------------------------------------------
const needOptions = Object.entries(NEEDS).map(([id, n]) => ({ id, label: n.label }))
const picked = reactive(Object.fromEntries(needOptions.map((n) => [n.id, { on: false, level: 'important' }])))
const distanceImportance = ref('medium')
const seatsNeeded = ref('') // '' = any

const spots = ref([]) // everything the server sent back (unranked, with distances)
const loading = ref(false)
const status = ref('')
const error = ref('')
const searched = ref(false)

// The ranking is a computed value: it recalculates instantly whenever the user changes a choice.
// No new request to the server is needed.
const selectedNeeds = computed(() =>
  needOptions.filter((n) => picked[n.id].on).map((n) => ({ id: n.id, level: picked[n.id].level }))
)
const seatsMin = computed(() =>
  Number.isInteger(seatsNeeded.value) && seatsNeeded.value >= 1 ? seatsNeeded.value : null
)
const ranking = computed(() =>
  rankSpots(spots.value, selectedNeeds.value, {
    seatsNeeded: seatsMin.value,
    distanceImportance: distanceImportance.value,
  })
)
const results = computed(() =>
  ranking.value.ranked.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1, scorePercent: Math.round(r.score * 100) }))
)

const buttonText = computed(() => status.value || (searched.value ? 'Search again' : 'Use my location'))

// ---------------------------------------------------------------------
// Saved preferences (profile page)
// ---------------------------------------------------------------------
// The page starts from them, and "Use my preferences" puts them back after changes. Changes here aren't saved back.
const savedPrefs = ref(null) // { needs: { id: 'off' | 'nice' | 'must' }, distance, seats }, null until loaded
const prefsError = ref(false)

function usePrefs() {
  const prefs = savedPrefs.value
  for (const [id, level] of Object.entries(prefs.needs)) {
    if (picked[id]) picked[id] = { on: level !== 'off', level: level === 'off' ? 'important' : level }
  }
  distanceImportance.value = prefs.distance
  seatsNeeded.value = prefs.seats ?? ''
}

// do the fields still match the saved preferences?
const usingPrefs = computed(() => {
  const prefs = savedPrefs.value
  if (!prefs) return false
  const needsMatch = needOptions.every(({ id }) => {
    const level = prefs.needs[id] ?? 'off'
    return level === 'off' ? !picked[id].on : picked[id].on && picked[id].level === level
  })
  return needsMatch && distanceImportance.value === prefs.distance && (seatsMin.value ?? null) === (prefs.seats ?? null)
})

// nothing changed from the defaults, so there's nothing to apply
const prefsEmpty = computed(() => {
  const prefs = savedPrefs.value
  return !!prefs && Object.values(prefs.needs).every(level => level === 'off') && prefs.distance === 'medium' && prefs.seats == null
})

// "Quiet (must have), Power outlets (nice to have) · distance matters somewhat · 4+ seats"
const prefsSummary = computed(() => {
  const prefs = savedPrefs.value
  if (!prefs) return ''
  const levelText = level => NEED_LEVELS.find(l => l.value === level)?.label.toLowerCase()
  const needs = needOptions.filter(({ id }) => (prefs.needs[id] ?? 'off') !== 'off').map(n => `${n.label} (${levelText(prefs.needs[n.id])})`)
  const distance = `distance matters ${DISTANCE_LEVELS.find(l => l.value === prefs.distance)?.label.toLowerCase()}`
  return [needs.join(', ') || 'No needs picked', distance, prefs.seats ? `${prefs.seats}+ seats` : 'any number of seats'].join(' · ')
})

onMounted(async () => {
  try {
    savedPrefs.value = await api('/api/profile/preferences')
    usePrefs()
  } catch (e) {
    prefsError.value = true
    console.error('Could not load preferences:', e.message)
  }
})

// ---------------------------------------------------------------------
// Server request
// ---------------------------------------------------------------------

async function findNearby() {
  loading.value = true
  error.value = ''
  try {
    spots.value = await fetchNearby(message => (status.value = message))
    searched.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
    status.value = ''
  }
}
</script>

<template>
  <main class="nearby">
    <h1>Find the right study spot</h1>
    <p class="lede">Pick what you need, share your location, and we'll rank nearby study spots for you.</p>

    <!-- saved preferences from the profile page -->
    <section v-if="savedPrefs || prefsError" class="prefs-bar" aria-label="Your saved preferences">
      <template v-if="prefsError">
        <p class="prefs-text">Couldn't load your saved preferences, so pick what you need below.</p>
      </template>
      <template v-else-if="prefsEmpty">
        <p class="prefs-text">You haven't saved any study preferences yet.</p>
        <RouterLink to="/profile" class="prefs-link">Set them on your profile →</RouterLink>
      </template>
      <template v-else>
        <button type="button" class="use-prefs" :aria-pressed="usingPrefs" :disabled="usingPrefs" @click="usePrefs">
          {{ usingPrefs ? '✓ Using your preferences' : 'Use my preferences' }}
        </button>
        <p class="prefs-text">
          <span class="prefs-summary">{{ prefsSummary }}</span>
          <RouterLink to="/profile" class="prefs-link">Edit in profile</RouterLink>
        </p>
      </template>
    </section>

    <fieldset>
      <legend>What do you need?</legend>
      <div v-for="n in needOptions" :key="n.id" class="need">
        <input type="checkbox" :id="'need-' + n.id" v-model="picked[n.id].on" />
        <label :for="'need-' + n.id">{{ n.label }}</label>
        <select v-model="picked[n.id].level" :disabled="!picked[n.id].on" :aria-label="n.label + ' importance'">
          <option value="nice">Nice to have</option>
          <option value="important">Important</option>
          <option value="must">Must have</option>
        </select>
      </div>
    </fieldset>

    <fieldset>
      <legend>Your priorities</legend>
      <div class="option">
        <label for="distance">How much does distance matter?</label>
        <select id="distance" v-model="distanceImportance">
          <option value="low">Not much</option>
          <option value="medium">Somewhat</option>
          <option value="high">A lot</option>
        </select>
      </div>
      <div class="option">
        <label for="seats">Seats needed (leave blank for any)</label>
        <input id="seats" type="number" min="1" max="1000" step="1" v-model.number="seatsNeeded" placeholder="Any" />
      </div>
    </fieldset>

    <button class="go" :disabled="loading" @click="findNearby">{{ buttonText }}</button>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <template v-if="searched">
      <p v-if="ranking.excludedBySeats > 0" class="note">
        {{ ranking.excludedBySeats }} study spot(s) hidden because they have fewer seats than you need.
      </p>
      <p v-if="ranking.excludedByMustHaves > 0" class="note">
        {{ ranking.excludedByMustHaves }} study spot(s) hidden because they don't meet your must-haves.
      </p>
      <p v-if="!results.length" class="note">
        No study spots match. Try fewer seats, or change a must-have to "Important".
      </p>
    </template>

    <!-- TransitionGroup makes the cards slide to their new place whenever the ranking changes -->
    <TransitionGroup v-if="results.length" name="list" tag="ol" class="spots">
      <li v-for="r in results" :key="r._id" class="spot-wrap">
        <!-- Top 3 only: the speech bubble, shown while the card is hovered -->
        <span v-if="r.rank <= 3" class="bubble">recommended by gus</span>

        <article class="spot">
          <div class="score">
            <strong>{{ r.scorePercent }}%</strong>
            <span>#{{ r.rank }} match</span>
          </div>
          <div>
            <h3 class="name">
              <RouterLink :to="`/spots/${r._id}`" class="name-text">
                {{ r.name }}
                <!-- Top 3 only: a hand-drawn oval that sweeps around the name when the spot enters the top 3 -->
                <span v-if="r.rank <= 3" class="oval" aria-hidden="true"></span>
              </RouterLink>
            </h3>
            <p class="meta">
              {{ r.buildingname }}, {{ levelLabel(r.floor) }} · {{ r.seats }} seats ·
              {{ walkText(r.distanceMeters, r.walkingMinutes) }}
            </p>
            <p v-if="r.checkedIn" class="line seats">
              <span class="nb-dot" :class="`nb-dot--${seatsLevel(r.checkedIn, r.seats)}`" aria-hidden="true"></span>{{ seatsFreeText(r.checkedIn, r.seats) }}
              ({{ peopleText(r.checkedIn) }} checked in)
            </p>
            <p v-if="r.alerts.length" class="line alert">
              ⚠ Reported: <template v-for="(type, i) in r.alerts" :key="type">{{ i ? ', ' : '' }}<span aria-hidden="true">{{ alertIcon(type) }}</span> {{ alertLabel(type) }}</template>
            </p>
            <p v-if="r.matched.length" class="line ok">Meets: {{ r.matched.join(', ') }}</p>
            <p v-if="r.missing.length" class="line miss">Missing: {{ r.missing.join(', ') }}</p>
            <p v-if="r.unknown.length" class="line unknown">Not enough info yet: {{ r.unknown.join(', ') }}</p>
          </div>
        </article>
      </li>
    </TransitionGroup>
  </main>
</template>

<style>
/* Global. Registering --p lets the browser animate the oval's "drawing" sweep.
   Its default (360deg) means "fully drawn", so the oval is simply visible if animation is off. */
@property --p {
  syntax: '<angle>';
  inherits: false;
  initial-value: 360deg;
}
</style>

<style scoped>
/* ---------- The sketchbook page ---------- */
.nearby {
  --ink: #2a2a2a;
  --pencil: #6b6659;
  --red: #d9483b;
  --red-text: #b3362b;
  --blue: #2f5fa8;
  --highlight: #ffe66d;
  --paper: #fffdf6;
  --hand: 'Caveat', 'Segoe Print', 'Bradley Hand', 'Marker Felt', cursive;

  position: relative;
  box-sizing: border-box;
  width: min(44rem, calc(100% - 1.5rem));
  margin: 2rem auto;
  padding: 1.75rem 1.5rem 2.5rem 3.5rem;
  background: var(--paper);
  border-radius: 4px 10px 6px 12px;
  box-shadow: 2px 3px 0 #bfb292, 0 10px 28px rgba(70, 55, 20, 0.22);
  font-family: 'Patrick Hand', 'Segoe Print', system-ui, sans-serif;
  font-size: 1.1rem;
  color: var(--ink);
  text-align: left; /* the app centres text by default */
}

/* spiral binding holes down the left edge */
.nearby::before {
  content: '';
  position: absolute;
  top: 1rem;
  bottom: 1rem;
  left: 0.9rem;
  width: 1.3rem;
  background: radial-gradient(circle at 50% 50%, #d8ccb0 0 0.32rem, #2a2a2a 0.34rem 0.44rem, transparent 0.46rem) 0 0 / 100% 2.2rem repeat-y;
}

h1 {
  margin: 0 0 0.3rem;
  font-family: var(--hand);
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: normal;
  color: var(--ink);
  text-decoration: underline wavy var(--red);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.35rem;
}

.lede {
  margin: 0.6rem 0 1.2rem;
  color: var(--pencil);
}

/* ---------- Saved preferences, a sticky note above the form ---------- */
.prefs-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin: 0 0 1.1rem;
  padding: 0.7rem 1rem;
  background: #fff8d6;
  border: 2px dashed var(--ink);
  border-radius: 6px 14px 5px 16px / 14px 6px 16px 5px;
}

.use-prefs {
  flex: none;
  padding: 0.15rem 1rem 0.25rem;
  font-family: var(--hand);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ink);
  background: var(--highlight);
  border: 2px solid var(--ink);
  border-radius: 14px 5px 16px 5px / 5px 14px 5px 16px;
  box-shadow: 2px 2px 0 var(--ink);
  cursor: pointer;
}

.use-prefs:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}

/* already applied: drawn flat, like a ticked box */
.use-prefs:disabled {
  background: #fff;
  box-shadow: none;
  cursor: default;
}

.use-prefs:focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 3px;
}

.prefs-text {
  flex: 1 1 14rem;
  margin: 0;
  font-size: 0.98rem;
}

.prefs-summary {
  color: var(--pencil);
}

.prefs-link {
  margin-left: 0.5rem;
  color: var(--blue);
  font-weight: 700;
  white-space: nowrap;
}

/* ---------- Form, drawn in pen ---------- */
fieldset {
  margin: 0 0 1.1rem;
  padding: 0.6rem 1rem 0.8rem;
  background: #fff;
  border: 2px solid var(--ink);
  border-radius: 14px 6px 16px 5px / 6px 14px 5px 16px;
}

legend {
  float: none; /* undo Bootstrap's legend reset so it sits in the border */
  width: auto;
  margin: 0;
  padding: 0 0.5rem;
  font-family: var(--hand);
  font-size: 1.55rem;
  font-weight: 700;
  line-height: inherit;
}

.need,
.option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
}

.need label,
.option label {
  flex: 1;
  cursor: pointer;
}

input[type='checkbox'] {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--red);
}

select,
input[type='number'] {
  padding: 0.15rem 0.3rem;
  font: inherit;
  font-size: 1rem;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-bottom: 2px dashed var(--pencil);
}

input[type='number'] {
  width: 5rem;
}

select:disabled {
  opacity: 0.35;
}

select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

.go {
  padding: 0.35rem 1.3rem 0.45rem;
  font-family: var(--hand);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  background: var(--highlight);
  border: 2px solid var(--ink);
  border-radius: 18px 6px 20px 6px / 6px 18px 6px 20px;
  box-shadow: 3px 3px 0 var(--ink);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.go:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--ink);
}

.go:active:not(:disabled) {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--ink);
}

.go:focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 3px;
}

.go:disabled {
  opacity: 0.6;
  cursor: progress;
}

.error {
  margin: 1rem 0 0;
  padding: 0.6rem 1rem;
  color: var(--red-text);
  background: #fdeceb;
  border-left: 4px solid var(--red);
}

.note {
  margin: 0.8rem 0 0;
  font-family: var(--hand);
  font-size: 1.3rem;
  color: var(--pencil);
}

/* ---------- The ranked list ---------- */
.spots {
  position: relative;
  /* needed so a card that is leaving can be taken out of the flow */
  display: flex;
  flex-direction: column;
  gap: 2.2rem;
  margin: 2.4rem 0 0;
  /* room above for the first speech bubble */
  padding: 0;
  list-style: none;
}

.spot-wrap {
  position: relative;
  --tilt: -0.4deg;
}

.spot-wrap:nth-child(even) {
  --tilt: 0.5deg;
}

.spot {
  position: relative;
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 1rem;
  padding: 1rem 1.1rem;
  background: #fff;
  border: 2px solid var(--ink);
  border-radius: 12px 5px 14px 6px / 6px 14px 5px 12px;
  box-shadow: 3px 4px 0 rgba(42, 42, 42, 0.16);
  transform: rotate(var(--tilt));
  transition: transform 0.2s, box-shadow 0.2s;
}

.spot:hover {
  transform: rotate(0deg) translateY(-2px);
  box-shadow: 4px 7px 0 rgba(42, 42, 42, 0.2);
}

/* a strip of tape holding the card to the page */
.spot::before {
  content: '';
  position: absolute;
  top: -11px;
  left: 1.3rem;
  width: 3.4rem;
  height: 1.25rem;
  background: rgba(255, 230, 109, 0.7);
  transform: rotate(-3deg);
}

.score strong {
  display: block;
  width: fit-content;
  padding: 0 0.15rem;
  font-family: var(--hand);
  font-size: 2.3rem;
  line-height: 1;
  background: linear-gradient(transparent 58%, var(--highlight) 58% 92%, transparent 92%);
  /* highlighter pen */
}

.score span {
  color: var(--pencil);
  font-size: 0.95rem;
}

.name {
  margin: 0 0 0.55rem;
  font-family: var(--hand);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
}

.name-text {
  position: relative;
  display: inline-block;
  padding: 0 0.15rem;
  color: inherit; /* a link to the spot's page, but drawn like the rest of the card */
  text-decoration: none;
}

.name-text:hover {
  text-decoration: underline;
}

.meta {
  margin: 0 0 0.4rem;
  color: var(--pencil);
  font-size: 0.95rem;
}

.line {
  margin: 0.15rem 0;
  font-size: 1rem;
}

.ok {
  color: var(--blue);
}

.miss {
  color: var(--red-text);
}

.unknown {
  color: var(--pencil);
}

/* an active alert pushes the room down the list; say why */
.alert {
  width: fit-content;
  padding: 0.05rem 0.5rem;
  color: var(--red-text);
  background: #fdeceb;
  border-left: 3px solid var(--red);
}

/* ---------- Top 3: hand-drawn oval ---------- */
/* Two slightly different red rings, revealed by a mask that sweeps clockwise from the top. */
.oval {
  position: absolute;
  inset: -9px -22px;
  pointer-events: none;
  -webkit-mask-image: conic-gradient(#000 var(--p), transparent var(--p));
  mask-image: conic-gradient(#000 var(--p), transparent var(--p));
  --p: 0deg;
  /* 0deg = nothing drawn yet, so the oval is hidden */
}

.oval::before,
.oval::after {
  content: '';
  position: absolute;
  border: 3px solid var(--red);
}

.oval::before {
  inset: 0;
  border-radius: 50% 50% 47% 53% / 55% 50% 50% 45%;
}

.oval::after {
  inset: 4px 2px 1px 6px;
  border-width: 2px;
  border-radius: 47% 53% 50% 50% / 50% 56% 44% 50%;
  opacity: 0.7;
  transform: rotate(-1.2deg);
}

/* While the card is hovered, draw the oval */
.spot-wrap:hover .oval {
  --p: 360deg;
  animation: draw 0.9s ease-in-out both;
}

@keyframes draw {
  from {
    --p: 0deg;
  }

  to {
    --p: 360deg;
  }
}

/* ---------- Top 3: speech bubble ---------- */
.bubble {
  position: absolute;
  z-index: 2;
  top: -1.55rem;
  right: 1rem;
  padding: 0.05rem 0.8rem 0.15rem;
  font-family: var(--hand);
  font-size: 1.3rem;
  font-weight: 700;
  white-space: nowrap;
  color: var(--ink);
  background: #fff;
  border: 2px solid var(--ink);
  border-radius: 16px 20px 18px 14px / 18px 14px 20px 16px;
  transform: rotate(2deg);
  display: none;
  /* hidden until the card is hovered */
  animation: pop 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) 0.8s both;
  /* starts after the oval is drawn */
}

.spot-wrap:hover .bubble {
  display: block;
}

/* the tail: a rotated square showing only its right and bottom edges */
.bubble::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 1.2rem;
  width: 12px;
  height: 12px;
  background: #fff;
  border-right: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
  transform: rotate(45deg);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.3) rotate(-8deg);
  }

  to {
    opacity: 1;
    transform: scale(1) rotate(2deg);
  }
}

/* ---------- Cards slide when the ranking changes ---------- */
.list-move {
  transition: transform 0.5s cubic-bezier(0.3, 0.8, 0.3, 1);
}

.list-enter-active,
.list-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

@media (max-width: 30rem) {
  .nearby {
    padding-left: 2.8rem;
  }

  .spot {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spot-wrap:hover .oval,
  .bubble {
    animation: none;
  }

  .list-move,
  .list-enter-active,
  .list-leave-active,
  .spot,
  .go {
    transition: none;
  }
}
</style>

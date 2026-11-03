<script setup>
// ACTIVE: "Top picks for you" on the profile page: the 3 best nearby spots for the saved study preferences.
// Uses the same nearby search (POST /api/nearby) and ranking (ranking.js) as the /find page.
import { ref, computed, onMounted } from 'vue'
import { NEEDS, rankSpots } from '../ranking'
import { rankingInput } from '../preferences'
import { levelLabel } from '../floors'
import { fetchNearby, positionAllowed, walkText } from '../location'

const props = defineProps({ prefs: { type: Object, required: true } })

const spots = ref(null) // null until the search has run
const loading = ref(false)
const error = ref('')

async function search() {
  loading.value = true
  error.value = ''
  try {
    spots.value = await fetchNearby()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Search straight away only if that won't pop up a location prompt; otherwise wait for the button.
onMounted(async () => { if (await positionAllowed()) search() })

// Re-ranks instantly when a preference changes, without asking the server again.
const picks = computed(() => {
  if (!spots.value) return []
  const { needs, options } = rankingInput(props.prefs)
  return rankSpots(spots.value, needs, options).ranked.slice(0, 3).map(r => ({
    ...r,
    percent: Math.round(r.score * 100),
    // one tag per preference: met, missed, or not enough data yet (see explain() in ranking.js)
    tags: needs.map(({ id }) => {
      const label = NEEDS[id].label
      const state = r.matched.includes(label) ? 'met' : r.missing.includes(label) ? 'missed' : 'unknown'
      return { id, label, state, title: state === 'unknown' ? `Not enough info yet: ${NEEDS[id].unknownNote}` : '' }
    }),
  }))
})
const SYMBOL = { met: '✓', missed: '✗', unknown: '~' }
</script>

<template>
  <section class="picks" aria-labelledby="picks-title">
    <header>
      <h2 id="picks-title" class="nb-section-title">Top picks for you</h2>
      <RouterLink to="/find" class="all">See all matches →</RouterLink>
    </header>

    <div v-if="!spots" class="nb-state ask">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else>Share your location to see the best spots near you for these preferences.</p>
      <button type="button" class="nb-btn nb-btn--primary" :disabled="loading" @click="search">
        {{ loading ? 'Finding spots…' : 'Use my location' }}
      </button>
    </div>
    <p v-else-if="!picks.length" class="nb-state">No spots meet all your must-haves. Try changing one to “Nice to have”.</p>

    <ol v-else class="list">
      <li v-for="(pick, i) in picks" :key="pick._id" class="pick">
        <span class="tape" aria-hidden="true"></span>
        <div class="score">
          <strong><mark class="nb-mark">{{ pick.percent }}%</mark></strong>
          <span>#{{ i + 1 }} match</span>
        </div>
        <div class="info">
          <h3><RouterLink :to="`/spots/${pick._id}`">{{ pick.name }}</RouterLink></h3>
          <p class="meta">
            {{ pick.buildingname }}, {{ levelLabel(pick.floor) }} · {{ pick.seats }} seats ·
            {{ walkText(pick.distanceMeters, pick.walkingMinutes) }}
          </p>
          <p v-if="pick.tags.length" class="tags">
            <span v-for="tag in pick.tags" :key="tag.id" class="tag" :class="`tag--${tag.state}`" :title="tag.title">
              <span aria-hidden="true">{{ SYMBOL[tag.state] }}</span>
              <span class="visually-hidden">{{ tag.state === 'met' ? 'Meets' : tag.state === 'missed' ? 'Missing' : 'Not enough info:' }}</span>
              {{ tag.label }}
            </span>
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.picks header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 18px; }
.all { color: var(--nb-ink); font-weight: 700; text-underline-offset: 3px; }

.ask { display: grid; gap: 12px; justify-items: start; max-width: none; }
.ask p { margin: 0; }
.ask .error { color: var(--nb-error); }

.list { display: grid; gap: 26px; margin: 0; padding: 0; list-style: none; }
.pick {
  position: relative;
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px;
  align-items: center;
  padding: 18px 20px 16px;
  background: var(--nb-sheet);
  border: 2px solid var(--nb-ink);
  border-radius: 4px;
  box-shadow: 4px 4px 0 rgba(40, 38, 63, 0.18);
}
/* a strip of yellow tape over the top-left corner */
.tape {
  position: absolute;
  top: -10px;
  left: 26px;
  width: 80px;
  height: 18px;
  background: rgba(255, 229, 138, 0.85);
  transform: rotate(-1.5deg);
}
.score strong { display: block; font: 700 2.4rem/1 var(--nb-heading); color: var(--nb-ink); }
.score span { color: var(--nb-muted); font-size: 0.82rem; }
.info { min-width: 0; }
.info h3 { margin: 0; font: 700 1.9rem/1.1 var(--nb-heading); }
.info h3 a { color: var(--nb-ink); text-decoration: none; }
.info h3 a:hover { text-decoration: underline; }
.meta { margin: 4px 0 8px; color: var(--nb-muted); font-size: 0.92rem; }

.tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
.tag { padding: 1px 10px; border: 1.5px solid var(--nb-ink); border-radius: 999px; font-size: 0.8rem; font-weight: 700; color: #28263f; }
.tag--met { background: #def3d6; border-color: #2f6b3a; color: #1f4d29; }
.tag--missed { background: var(--nb-note-pink); }
.tag--unknown { border-style: dashed; background: transparent; color: var(--nb-muted); }

@media (max-width: 520px) {
  .pick { grid-template-columns: 1fr; }
}
</style>

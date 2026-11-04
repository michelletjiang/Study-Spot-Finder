<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../api'
import { myCheckIn } from '../stores/checkin'
import { noiseLabel, noiseStyle, reportCount } from '../heatmap'
import { timeAgo } from '../reviews'
import SpotAlerts from './SpotAlerts.vue'
import NoiseRating from './NoiseRating.vue'

// The column beside the floor plan while the noise heatmap is on: the clicked room's latest reports and issues,
// the quietest rooms on this floor, and a sticky note for rating the room's noise.
// Only a student checked in to the room can rate it. Checking in is on SpotPanel, and 'details' goes there.
const props = defineProps({
  spot: { type: Object, default: null }, // the clicked room, if any
  spots: { type: Array, required: true }, // this floor's rooms
  heat: { type: Object, required: true }, // spot _id -> { score, current, count }
})
const emit = defineEmits(['close', 'rated', 'select', 'alerts-change', 'details'])

const noise = ref(null) // { summary, recent } or null while loading
const noiseError = ref('')

myCheckIn.load().catch(() => {}) // logged out or offline: the note just asks them to check in
const hereNow = computed(() => !!props.spot && myCheckIn.isAt(props.spot._id))

// ignore answers for a room that's no longer shown
async function loadNoise(id) {
  try {
    const data = await api(`/api/noise/${id}`)
    if (props.spot?._id === id) {
      noise.value = data
      noiseError.value = ''
    }
  } catch (e) {
    if (props.spot?._id === id) noiseError.value = e.message
  }
}

watch(() => props.spot?._id, id => {
  noise.value = null
  noiseError.value = ''
  if (id) loadNoise(id)
}, { immediate: true })

function onRated() {
  emit('rated')
  loadNoise(props.spot._id)
}

// only rooms closer to Quiet than to Some chatter, quietest first, and the better reported one when two tie
const quietest = computed(() => props.spots
  .filter(s => props.heat[s._id]?.score < 0.5)
  .sort((a, b) => props.heat[a._id].score - props.heat[b._id].score || props.heat[b._id].count - props.heat[a._id].count)
  .slice(0, 3))
</script>

<template>
  <aside class="heat-panel" aria-label="Noise reports">
    <section v-if="spot" class="heat-card" aria-live="polite">
      <header>
        <h2>{{ spot.name }}</h2>
        <button type="button" class="close" aria-label="Close room details" @click="emit('close')">✕</button>
      </header>
      <span v-if="noise?.summary.current" class="pill" :style="noiseStyle(noise.summary.current)">{{ noiseLabel(noise.summary.current) }}</span>

      <p v-if="noiseError" class="muted">Couldn't load this room's reports.</p>
      <p v-else-if="!noise" class="muted">Loading reports…</p>
      <template v-else-if="noise.recent.length">
        <p class="muted">{{ reportCount(noise.summary.count) }} in the last 30 min, newest first</p>
        <ul class="reports">
          <li v-for="item in noise.recent.slice(0, 3)" :key="item.createdAt">
            <span class="pill" :style="noiseStyle(item.status)">{{ noiseLabel(item.status) }}</span>
            <span class="muted">{{ timeAgo(item.createdAt) }}</span>
          </li>
        </ul>
      </template>
      <p v-else class="muted">No one checked in here has rated the noise in the last 30 minutes.</p>

      <div class="alerts"><SpotAlerts :spot="spot" @change="list => emit('alerts-change', spot._id, list)" /></div>

      <button type="button" class="more" @click="emit('details')">Check in, seats and reviews →</button>
    </section>

    <section class="heat-card">
      <h2>Quiet right now</h2>
      <ol v-if="quietest.length" class="quiet">
        <li v-for="room in quietest" :key="room._id">
          <button type="button" @click="emit('select', room)"><strong>{{ room.name }}</strong></button>
          <span class="muted"> · {{ reportCount(heat[room._id].count) }}</span>
        </li>
      </ol>
      <p v-else class="muted">No room on this floor has been rated quiet lately.</p>
    </section>

    <section class="nb-note">
      <div class="nb-pin" aria-hidden="true"></div>
      <template v-if="hereNow">
        <h2 class="question">In {{ spot.name }} now?<br>How loud is it?</h2>
        <NoiseRating :spot-id="spot._id" question="" class="note-levels" @rated="onRated" />
      </template>
      <template v-else-if="spot">
        <h2 class="question">In {{ spot.name }} now?</h2>
        <p>Check in to rate how loud it is.</p>
        <button type="button" class="nb-btn nb-btn--small note-btn" @click="emit('details')">Check in to rate</button>
      </template>
      <template v-else>
        <h2>Here right now?</h2>
        <p>Pick your room on the plan and check in to rate how loud it is.</p>
      </template>
    </section>
  </aside>
</template>

<style scoped>
.heat-panel { display: grid; gap: 22px; color: var(--nb-ink); text-align: left; }

.heat-card {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 16px 18px;
  background: var(--nb-card);
  border: 2px solid var(--nb-ink);
  border-radius: 4px;
  box-shadow: 6px 6px 0 var(--nb-shadow);
}
.heat-card header { display: flex; justify-content: space-between; gap: 10px; width: 100%; }
.alerts { width: 100%; }
h2 { margin: 0; font: 700 1.8rem/1.1 var(--nb-heading); color: inherit; text-wrap: balance; }

.close {
  flex: none;
  width: 32px;
  height: 32px;
  border: 2px solid var(--nb-ink);
  border-radius: 8px;
  background: transparent;
  color: var(--nb-ink);
  cursor: pointer;
}

.pill {
  display: inline-block;
  padding: 1px 12px;
  border: 1.5px solid #28263f;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
}

.reports, .quiet { display: grid; gap: 7px; margin: 0; padding: 0; }
.reports { list-style: none; }
.reports li { display: flex; align-items: center; gap: 10px; }
.quiet { padding-left: 20px; }
.quiet button { padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.quiet button:hover { text-decoration: underline; }

.more { padding: 0; border: none; background: none; color: var(--nb-ink); font: inherit; font-weight: 700; text-align: left; text-decoration: underline; cursor: pointer; }
.muted { margin: 0; color: var(--nb-muted); }

.question { font-size: 1.55rem; text-wrap: wrap; }
.note-levels, .note-btn { margin-top: 12px; }

button:focus-visible, a:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

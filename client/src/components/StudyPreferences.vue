<script setup>
// ACTIVE: the "My study preferences" sheet on the profile page. Every change is saved straight away
// (PUT /api/profile/preferences) and the parent's top picks re-rank from the same object.
import { ref, onUnmounted } from 'vue'
import { api } from '../api'
import { NEED_LEVELS, DISTANCE_LEVELS, SEAT_CHOICES, needList } from '../preferences'

// { needs: { quiet, power, rated, seatsFree }, distance, seats }, owned by ProfileView.vue
const prefs = defineModel({ type: Object, required: true })

const status = ref('Changes save automatically')
const failed = ref(false)
let timer = null
// The latest choices. prefs only updates after the parent re-renders, so two quick clicks would otherwise lose the first.
let current = prefs.value

// Wait a moment after the last click, so tapping through options sends one request.
function save() {
  clearTimeout(timer)
  status.value = 'Saving…'
  failed.value = false
  timer = setTimeout(async () => {
    try {
      await api('/api/profile/preferences', { method: 'PUT', body: current })
      status.value = 'Saved'
    } catch (e) {
      failed.value = true
      status.value = `Couldn’t save: ${e.message}`
    }
  }, 400)
}
onUnmounted(() => clearTimeout(timer))

function set(update) {
  current = { ...current, ...update }
  prefs.value = current
  save()
}
const setNeed = (id, level) => set({ needs: { ...current.needs, [id]: level } })
</script>

<template>
  <section class="nb-sheet prefs" aria-labelledby="prefs-title">
    <h2 id="prefs-title" class="nb-section-title">My study preferences</h2>
    <p class="status" :class="{ failed }" role="status">{{ status }}</p>
    <p class="intro">We use these to rank spots for you. The “Find the right study spot” page starts from them too.</p>

    <div v-for="need in needList" :key="need.id" class="pref-row">
      <span :id="`pref-${need.id}-label`" class="row-label">{{ need.label }}</span>
      <div class="nb-segmented" role="radiogroup" :aria-labelledby="`pref-${need.id}-label`">
        <label v-for="level in NEED_LEVELS" :key="level.value">
          <input type="radio" :name="`pref-${need.id}`" :checked="prefs.needs[need.id] === level.value" @change="setNeed(need.id, level.value)">{{ level.label }}
        </label>
      </div>
    </div>

    <div class="pref-row stacked">
      <span id="pref-distance-label" class="row-label">How much does distance matter?</span>
      <div class="nb-segmented" role="radiogroup" aria-labelledby="pref-distance-label">
        <label v-for="level in DISTANCE_LEVELS" :key="level.value">
          <input type="radio" name="pref-distance" :checked="prefs.distance === level.value" @change="set({ distance: level.value })">{{ level.label }}
        </label>
      </div>
    </div>

    <div class="pref-row stacked">
      <span id="pref-seats-label" class="row-label">Seats needed</span>
      <div class="nb-segmented" role="radiogroup" aria-labelledby="pref-seats-label">
        <label v-for="choice in SEAT_CHOICES" :key="choice.label">
          <input type="radio" name="pref-seats" :checked="prefs.seats === choice.value" @change="set({ seats: choice.value })">{{ choice.label }}
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
.prefs { padding: 26px 28px 24px; }
.status { margin: 6px 0 0; color: var(--nb-muted); font-size: 0.85rem; font-weight: 700; }
.status.failed { color: var(--nb-error); }
.intro { margin: 14px 0 10px; color: var(--nb-muted); font-size: 0.95rem; line-height: 1.5; }

.pref-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 14px 0;
  border-bottom: 1.5px dashed var(--nb-rule);
}
.pref-row:last-child { border-bottom: none; padding-bottom: 0; }
.pref-row.stacked { display: grid; justify-content: start; }
.row-label { font-weight: 700; }
.nb-segmented { border-radius: 999px; }
.nb-segmented label { padding: 6px 14px; font-size: 0.88rem; white-space: nowrap; cursor: pointer; }
@media (max-width: 420px) {
  .prefs { padding: 22px 16px 20px; }
  .nb-segmented label { padding: 6px 10px; font-size: 0.82rem; }
}
</style>

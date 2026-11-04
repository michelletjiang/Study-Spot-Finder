<script setup>
import { ref, watch } from 'vue'
import { api } from '../api'
import { myCheckIn } from '../stores/checkin'
import { NOISE_LEVELS, noiseStyle } from '../heatmap'

// "How loud is it?" buttons for a student checked in to this room: in the check-in popup, the check-in box and the heatmap's note.
// The server refuses anyone who isn't checked in here, so only show this to them.
const props = defineProps({
  spotId: { type: String, required: true },
  question: { type: String, default: 'How loud is it here right now?' },
})
const emit = defineEmits(['rated'])

const busy = ref(false)
const message = ref('')

// the student's answer is kept in the store, so the popup and the box behind it agree
watch(() => props.spotId, async id => {
  message.value = ''
  try {
    const { mine } = await api(`/api/noise/${id}`)
    myCheckIn.noiseRatings[id] = mine
  } catch {
    // only the highlight on their last answer is missing
  }
}, { immediate: true })

async function rate(status) {
  busy.value = true
  message.value = ''
  const id = props.spotId
  try {
    const { mine } = await api(`/api/noise/${id}`, { method: 'POST', body: { status } })
    myCheckIn.noiseRatings[id] = mine
    if (props.spotId === id) message.value = 'Thanks! Your rating counts for an hour.'
    emit('rated')
  } catch (e) {
    if (props.spotId === id) message.value = e.message // e.g. "Check in to this room to rate how loud it is."
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="noise-rating" role="group" :aria-label="question || 'How loud is it?'">
    <p v-if="question" class="question">{{ question }}</p>
    <div class="levels">
      <button
        v-for="level in NOISE_LEVELS" :key="level.key" type="button" class="level"
        :style="noiseStyle(level.key)" :aria-pressed="myCheckIn.noiseRatings[spotId] === level.key"
        :disabled="busy" @click="rate(level.key)"
      >{{ level.label }}</button>
    </div>
    <p v-if="message" class="message" aria-live="polite">{{ message }}</p>
  </div>
</template>

<style scoped>
.noise-rating { display: grid; gap: 7px; text-align: left; }
.question { margin: 0; font-weight: 700; }
.levels { display: flex; flex-wrap: wrap; gap: 6px; }
.level {
  padding: 4px 12px;
  border: 1.5px solid #28263f;
  border-radius: 999px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.level:hover:not(:disabled) { box-shadow: 2px 2px 0 #28263f; }
.level:disabled { opacity: 0.6; cursor: default; }
/* the student's current answer */
.level[aria-pressed='true'] { outline: 2.5px solid #28263f; outline-offset: 1.5px; }
.level:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
.message { margin: 0; font-size: 0.85rem; }
</style>

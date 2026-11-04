<script setup>
// ACTIVE (admin only): form to add a study spot or edit one, with a preview of how the room's card will look.
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { levelLabel } from '../floors'

const route = useRoute()
const router = useRouter()
// True when the URL has a spot id, meaning we are editing.
const isEdit = computed(() => !!route.params.id)

const NOISE_LEVELS = ['Quiet', 'Moderate', 'Loud']

// The buildings for the drop-down (only needed when adding).
const buildings = ref([])
// Noise level must be Quiet, Moderate or Loud, which the server also checks.
const form = ref({ buildingName: '', name: '', floor: '', seatCount: '', hasPowerSocket: false, noiseLevel: 'Quiet' })
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    if (isEdit.value) {
      // Editing: load the spot to fill the form (older spots may have no noise level yet).
      const spot = await api(`/api/spots/${route.params.id}`)
      form.value = { ...spot, noiseLevel: spot.noiseLevel || 'Moderate' }
    } else {
      // Adding: load the buildings for the drop-down.
      buildings.value = await api('/api/buildings')
    }
  } catch (e) {
    error.value = e.message
  }
})

// the floors the chosen building has, as a hint under the Floor box (only when adding, where the buildings are loaded)
const floorHint = computed(() => {
  const b = buildings.value.find(b => b.buildingname === form.value.buildingName)
  if (!b) return ''
  const basements = Array.from({ length: b.basements || 0 }, (_, i) => `B${i + 1}`)
  return `This building has ${[...basements, `1–${b.floors}`].join(', ').replace(/, (?=[^,]*$)/, ' and ')}.`
})
const level = computed(() => (String(form.value.floor).trim() ? levelLabel(form.value.floor) : 'Level ?'))
const noiseNote = computed(() => ({ Quiet: 'nb-note--blue', Moderate: '', Loud: 'nb-note--pink' })[form.value.noiseLevel])

function check() {
  if (!isEdit.value && !form.value.buildingName) return 'Please choose a building.'
  if (!form.value.name.trim()) return 'Please give the room a name.'
  if (!String(form.value.floor).trim()) return 'Please say which floor it’s on.'
  if (!(Number(form.value.seatCount) >= 1)) return 'Seats should be 1 or more.'
  return ''
}

async function save() {
  error.value = check()
  if (error.value) return
  saving.value = true
  try {
    if (isEdit.value) {
      // PUT /api/spots/:id. The building cannot be changed.
      await api(`/api/spots/${route.params.id}`, { method: 'PUT', body: form.value })
    } else {
      // POST /api/spots.
      await api('/api/spots', { method: 'POST', body: form.value })
    }
    router.push('/admin/spots')
  } catch (e) {
    error.value = e.message // server validation message, e.g. "Floor must be B1 or 1-5."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="nb-page">
    <RouterLink to="/admin/spots" class="nb-back">‹ All study spots</RouterLink>
    <h1 class="nb-title">{{ isEdit ? `Edit ${form.name || 'study spot'}` : 'Add a study spot' }}</h1>

    <div class="layout">
      <form class="nb-sheet nb-form-sheet" novalidate @submit.prevent="save">
        <div class="nb-field">
          <label for="building">Building</label>
          <!-- the building can only be chosen when adding -->
          <input v-if="isEdit" id="building" :value="form.buildingName" class="nb-input" disabled>
          <select v-else id="building" v-model="form.buildingName" class="nb-input" required>
            <option value="">Choose a building</option>
            <option v-for="b in buildings" :key="b._id" :value="b.buildingname">{{ b.buildingname }}</option>
          </select>
        </div>
        <div class="nb-field">
          <label for="room">Room name</label>
          <input id="room" v-model="form.name" class="nb-input" placeholder="e.g. GSR 2-13" required>
        </div>
        <div class="pair">
          <div class="nb-field">
            <label for="floor">Floor</label>
            <input id="floor" v-model="form.floor" class="nb-input" placeholder="2 or B1" required :aria-describedby="floorHint ? 'floor-hint' : undefined">
            <small v-if="floorHint" id="floor-hint" class="nb-hint">{{ floorHint }}</small>
          </div>
          <div class="nb-field">
            <label for="seats">Seats</label>
            <input id="seats" v-model.number="form.seatCount" class="nb-input" type="number" min="1" placeholder="e.g. 6" required>
          </div>
        </div>

        <fieldset class="nb-field choice">
          <legend class="nb-label">Power sockets</legend>
          <div class="nb-segmented">
            <label><input v-model="form.hasPowerSocket" type="radio" name="power" :value="true">Yes</label>
            <label><input v-model="form.hasPowerSocket" type="radio" name="power" :value="false">No</label>
          </div>
        </fieldset>
        <fieldset class="nb-field choice">
          <legend class="nb-label">Noise level</legend>
          <div class="nb-segmented">
            <label v-for="n in NOISE_LEVELS" :key="n"><input v-model="form.noiseLevel" type="radio" name="noise" :value="n">{{ n }}</label>
          </div>
        </fieldset>

        <p v-if="error" class="nb-errors single" role="alert">{{ error }}</p>

        <div class="nb-form-actions">
          <button type="submit" class="nb-btn nb-btn--primary" :disabled="saving">
            {{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add study spot' }}
          </button>
          <RouterLink to="/admin/spots" class="nb-cancel">Cancel</RouterLink>
        </div>
      </form>

      <!-- a live preview of the room's facts, as on its room page -->
      <aside class="preview" aria-label="How students will see it">
        <p class="nb-preview-label">How students will see it</p>
        <div class="nb-sheet preview-card" aria-hidden="true">
          <strong class="name">{{ form.name || 'Room name' }}</strong>
          <span class="meta">{{ form.buildingName || 'Building' }} · {{ level }}</span>
          <div class="facts">
            <span class="nb-note"><b>{{ form.seatCount || '–' }}</b>seats</span>
            <span class="nb-note nb-note--blue"><b>{{ form.hasPowerSocket ? 'Yes' : 'No' }}</b>sockets</span>
            <span class="nb-note" :class="noiseNote"><b>{{ form.noiseLevel }}</b>noise</span>
          </div>
        </div>
        <p class="nb-hint">After saving, draw the room on its floor plan so students can tap it.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.nb-title { margin-bottom: 24px; }
.layout { display: grid; grid-template-columns: minmax(300px, 620px) minmax(260px, 380px); gap: 56px; align-items: start; }
.pair { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 18px; }
.choice { padding: 0; border: none; }
.choice legend { float: none; margin-bottom: 6px; font-size: 1rem; }


.preview-card { display: grid; gap: 4px; margin-bottom: 14px; padding: 18px 20px 20px; }
.name { font: 700 2rem/1.1 var(--nb-heading); overflow-wrap: anywhere; }
.meta { color: var(--nb-muted); font-size: 0.92rem; }
.facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.facts .nb-note { padding: 10px 6px; text-align: center; font-size: 0.82rem; font-weight: 700; box-shadow: none; transform: none; }
.facts b { display: block; font: 700 1.5rem/1.1 var(--nb-heading); overflow-wrap: anywhere; }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; gap: 36px; }
  .pair { grid-template-columns: 1fr; gap: 0; }
}
</style>

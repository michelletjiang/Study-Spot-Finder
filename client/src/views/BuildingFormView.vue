<script setup>
// ACTIVE (admin only): form to add a building or change its floors, with a preview of its card on the home page.
// Add: /admin/buildings/new   Edit: /admin/buildings/:postal/edit
// (replaces add-building.ejs and update-building.ejs - only floors can change, same as before)
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

const route = useRoute()
const router = useRouter()
// True when the URL has a postal code, meaning we are editing.
const isEdit = computed(() => !!route.params.postal)

const MIN_FLOORS = 1
const MAX_FLOORS = 10

const form = ref({ buildingname: '', postal: '', floors: 1 })
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  // Nothing to load when adding.
  if (!isEdit.value) return
  try {
    // GET /api/buildings/:postal to fill the form.
    form.value = await api(`/api/buildings/${route.params.postal}`)
  } catch (e) {
    error.value = e.message
  }
})

const floors = computed(() => Number(form.value.floors) || MIN_FLOORS)
const stepFloors = step => (form.value.floors = Math.min(MAX_FLOORS, Math.max(MIN_FLOORS, floors.value + step)))

function check() {
  if (!isEdit.value) {
    if (!form.value.buildingname.trim()) return 'Please give the building a name.'
    if (!/^\d{6}$/.test(String(form.value.postal).trim())) return 'The postal code should be 6 digits.'
  }
  if (!(floors.value >= MIN_FLOORS && floors.value <= MAX_FLOORS)) return `Floors should be between ${MIN_FLOORS} and ${MAX_FLOORS}.`
  return ''
}

async function save() {
  error.value = check()
  if (error.value) return
  saving.value = true
  try {
    if (isEdit.value) {
      // PUT /api/buildings/:postal, which can only change the floors.
      await api(`/api/buildings/${route.params.postal}`, { method: 'PUT', body: { floors: floors.value } })
    } else {
      // POST /api/buildings. The server looks up the building's coordinates from its postal code (OneMap).
      await api('/api/buildings', { method: 'POST', body: { ...form.value, floors: floors.value } })
    }
    router.push('/admin/buildings')
  } catch (e) {
    error.value = e.message // e.g. "Postal Code Exist Already."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="nb-page">
    <RouterLink to="/admin/buildings" class="nb-back">‹ All buildings</RouterLink>
    <h1 class="nb-title">{{ isEdit ? `Edit ${form.buildingname || 'building'}` : 'Add a building' }}</h1>

    <div class="layout">
      <form class="nb-sheet nb-form-sheet" novalidate @submit.prevent="save">
        <div class="nb-field">
          <label for="name">Building name</label>
          <input id="name" v-model="form.buildingname" class="nb-input" :disabled="isEdit" placeholder="e.g. School of Economics" required>
        </div>
        <div class="nb-field">
          <label for="postal">Postal code</label>
          <input id="postal" v-model="form.postal" class="nb-input short" :disabled="isEdit" inputmode="numeric" maxlength="6"
                 placeholder="6 digits" aria-describedby="postal-hint" required>
          <small id="postal-hint" class="nb-hint">Used for directions on the map.</small>
        </div>
        <p v-if="isEdit" class="nb-hint locked">The name and postal code can’t be changed. Delete the building and add it again to change them.</p>

        <div class="nb-field">
          <label for="floors">Number of floors</label>
          <div class="stepper">
            <button type="button" aria-label="One floor fewer" :disabled="floors <= MIN_FLOORS" @click="stepFloors(-1)">−</button>
            <input id="floors" v-model.number="form.floors" type="number" :min="MIN_FLOORS" :max="MAX_FLOORS" inputmode="numeric">
            <button type="button" aria-label="One floor more" :disabled="floors >= MAX_FLOORS" @click="stepFloors(1)">+</button>
          </div>
        </div>

        <p v-if="error" class="nb-errors single" role="alert">{{ error }}</p>

        <div class="nb-form-actions">
          <button type="submit" class="nb-btn nb-btn--primary" :disabled="saving">
            {{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add building' }}
          </button>
          <RouterLink to="/admin/buildings" class="nb-cancel">Cancel</RouterLink>
        </div>
      </form>

      <!-- a live preview of the building's folder on the home page -->
      <aside class="preview" aria-label="How students will see it">
        <p class="nb-preview-label">How students will see it</p>
        <div class="nb-folder" aria-hidden="true">
          <span class="nb-folder-paper floor-tabs">
            <span v-for="n in Math.min(floors, 6)" :key="n">L{{ n }}</span><span v-if="floors > 6">…</span>
          </span>
          <div class="nb-folder-front">
            <strong class="name">{{ form.buildingname || 'Building name' }}</strong>
            <span class="meta">{{ floors }} floor{{ floors === 1 ? '' : 's' }}<template v-if="!isEdit"> · 0 study spots yet</template></span>
            <span class="open">Open floor plans →</span>
          </div>
        </div>
        <p class="nb-hint">Add study spots after saving. Floor plans are linked per floor.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.nb-title { margin-bottom: 24px; }
.layout { display: grid; grid-template-columns: minmax(300px, 560px) minmax(240px, 360px); gap: 56px; align-items: start; }
.short { max-width: 200px; }
.locked { margin: -4px 0 16px; }

.stepper { display: inline-flex; justify-self: start; border: 2px solid var(--nb-ink); border-radius: 10px; overflow: hidden; }
.stepper button {
  width: 48px;
  border: none;
  background: var(--nb-input);
  color: var(--nb-ink);
  font: 700 1.3rem/1 system-ui, sans-serif;
  cursor: pointer;
}
.stepper button:disabled { opacity: 0.35; cursor: default; }
.stepper button:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: -4px; }
.stepper input {
  width: 64px;
  padding: 8px 0;
  border: none;
  border-left: 2px solid var(--nb-ink);
  border-right: 2px solid var(--nb-ink);
  background: var(--nb-input);
  color: var(--nb-ink);
  font: 700 1.6rem/1.2 var(--nb-heading);
  text-align: center;
  -moz-appearance: textfield;
}
.stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { -webkit-appearance: none; }
.stepper input:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: -4px; }


.preview .nb-folder { min-height: 230px; margin-bottom: 14px; }
.floor-tabs { display: flex; justify-content: flex-end; gap: 3px; }
.floor-tabs span { height: 20px; padding: 0 5px; border: 1.5px solid #28263f; border-radius: 4px; background: var(--nb-highlight); font-size: 0.72rem; line-height: 17px; }
.name { margin-top: 6px; font: 700 1.8rem/1.1 var(--nb-heading); overflow-wrap: anywhere; }
.meta { color: #5e5a73; font-size: 0.92rem; }
.open { margin-top: auto; padding-top: 16px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }

@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; gap: 36px; }
}
</style>

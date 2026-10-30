<script setup>
// ACTIVE (admin only): form to add a study spot or edit one.
// ref makes a changing value, computed derives one, onMounted runs when the page appears.
import { ref, computed, onMounted } from 'vue'
// useRoute reads the URL, useRouter navigates.
import { useRoute, useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'

// The current route.
const route = useRoute()
// The router.
const router = useRouter()
// True when the URL has a spot id, meaning we are editing.
const isEdit = computed(() => !!route.params.id)

// The buildings for the drop-down (only needed when adding).
const buildings = ref([])
// The form fields. Noise level must be Quiet, Moderate or Loud, which the server also checks.
const form = ref({ buildingName: '', name: '', floor: '', seatCount: '', hasPowerSocket: false, noiseLevel: 'Quiet' })
// A message to show on failure.
const error = ref('')
// True while saving.
const saving = ref(false)

// Run once when the page appears.
onMounted(async () => {
  try {
    // Editing: load the spot to fill the form.
    if (isEdit.value) {
      form.value = await api(`/api/spots/${route.params.id}`) // pre-fill the form
    } else {
      // Adding: load the buildings for the drop-down.
      buildings.value = await api('/api/buildings')
    }
  } catch (e) {
    error.value = e.message
  }
})

// Called when the form is submitted.
async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit.value) {
      // PUT /api/spots/:id. The building cannot be changed.
      await api(`/api/spots/${route.params.id}`, { method: 'PUT', body: form.value })
    } else {
      // POST /api/spots.
      await api('/api/spots', { method: 'POST', body: form.value })
    }
    // Go back to the spot list.
    router.push('/admin/spots')
  } catch (e) {
    // Existing note: the server's validation message.
    error.value = e.message // server validation message, e.g. "Floor must be B1 or 1-5."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Heading changes between add and edit. -->
  <h3>{{ isEdit ? `Edit: ${form.buildingName}, ${form.name}` : 'Add a New Study Spot' }}</h3>
  <!-- prevent stops the normal form post and calls save() instead. -->
  <form @submit.prevent="save">
    <!-- The building drop-down only appears when adding. -->
    <label v-if="!isEdit">Building
      <select v-model="form.buildingName" required>
        <option value="">-- Select a Building --</option>
        <option v-for="b in buildings" :key="b._id" :value="b.buildingname">{{ b.buildingname }}</option>
      </select>
    </label><br>
    <label>Room Name <input v-model="form.name" required></label><br>
    <label>Floor <input v-model="form.floor" placeholder="e.g. 2 or B1" required></label><br>
    <label>Seat Count <input v-model.number="form.seatCount" type="number" min="1" required></label><br>
    <label>Power Socket
      <select v-model="form.hasPowerSocket">
        <option :value="true">Yes</option>
        <option :value="false">No</option>
      </select>
    </label><br>
    <label>Noise Level
      <select v-model="form.noiseLevel">
        <option>Quiet</option><option>Moderate</option><option>Loud</option>
      </select>
    </label><br>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="saving">{{ isEdit ? 'Update' : 'Add' }} Study Spot</button>
    <RouterLink to="/admin/spots">Cancel</RouterLink>
  </form>
</template>

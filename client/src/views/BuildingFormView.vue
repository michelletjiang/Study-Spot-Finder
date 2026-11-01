<script setup>
// ACTIVE (admin only): form to add a building or change its floors.
// computed derives a value, onMounted runs code when the page appears.
import { ref, computed, onMounted } from 'vue'
// useRoute reads the URL, useRouter navigates.
import { useRoute, useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'

// Existing note: one form for add and edit.
// Add: /admin/buildings/new   Edit: /admin/buildings/:postal/edit
// (replaces add-building.ejs and update-building.ejs - only floors can change, same as before)
// The current route.
const route = useRoute()
// The router.
const router = useRouter()
// True when the URL has a postal code, meaning we are editing.
const isEdit = computed(() => !!route.params.postal)

// The form fields.
const form = ref({ buildingname: '', postal: '', floors: '' })
// A message to show on failure.
const error = ref('')
// True while saving.
const saving = ref(false)

// Run once when the page appears.
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

// Called when the form is submitted.
async function save() {
  error.value = ''
  saving.value = true
  try {
    // Edit: PUT /api/buildings/:postal, which can only change the floors.
    if (isEdit.value) {
      await api(`/api/buildings/${route.params.postal}`, { method: 'PUT', body: { floors: form.value.floors } })
    } else {
      // Add: POST /api/buildings. The server tries to look up coordinates from OneMap, which the demo blocks.
      await api('/api/buildings', { method: 'POST', body: form.value })
    }
    // Go back to the list.
    router.push('/admin/buildings')
  } catch (e) {
    // Existing note: for example a duplicate postal code.
    error.value = e.message // e.g. "Postal Code Exist Already."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- The title changes between add and edit. -->
  <h3>{{ isEdit ? `Edit: ${form.buildingname}` : 'Add a New Building' }}</h3>
  <!-- prevent stops the normal form post and calls save() instead. -->
  <form @submit.prevent="save">
    <!-- Name and postal code are read-only when editing. -->
    <label>Building Name <input v-model="form.buildingname" :disabled="isEdit" required></label><br>
    <label>Postal Code <input v-model="form.postal" :disabled="isEdit" inputmode="numeric" maxlength="6" required></label><br>
    <!-- Floors as a number from 1 to 10. -->
    <label>Floors <input v-model.number="form.floors" type="number" min="1" max="10" required></label><br>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="saving">{{ isEdit ? 'Update' : 'Add' }} Building</button>
    <RouterLink to="/admin/buildings">Cancel</RouterLink>
  </form>
</template>

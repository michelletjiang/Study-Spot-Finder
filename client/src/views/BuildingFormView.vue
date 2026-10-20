<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

// Add: /admin/buildings/new   Edit: /admin/buildings/:postal/edit
// (replaces add-building.ejs and update-building.ejs - only floors can change, same as before)
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.postal)

const form = ref({ buildingname: '', postal: '', floors: '' })
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  if (!isEdit.value) return
  try {
    form.value = await api(`/api/buildings/${route.params.postal}`)
  } catch (e) {
    error.value = e.message
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit.value) {
      await api(`/api/buildings/${route.params.postal}`, { method: 'PUT', body: { floors: form.value.floors } })
    } else {
      await api('/api/buildings', { method: 'POST', body: form.value })
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
  <h3>{{ isEdit ? `Edit: ${form.buildingname}` : 'Add a New Building' }}</h3>
  <form @submit.prevent="save">
    <label>Building Name <input v-model="form.buildingname" :disabled="isEdit" required></label><br>
    <label>Postal Code <input v-model="form.postal" :disabled="isEdit" inputmode="numeric" maxlength="6" required></label><br>
    <label>Floors <input v-model.number="form.floors" type="number" min="1" max="10" required></label><br>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="saving">{{ isEdit ? 'Update' : 'Add' }} Building</button>
    <RouterLink to="/admin/buildings">Cancel</RouterLink>
  </form>
</template>

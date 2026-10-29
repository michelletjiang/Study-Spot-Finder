<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const buildings = ref([])
const form = ref({ buildingName: '', name: '', floor: '', seatCount: '', hasPowerSocket: false })
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    if (isEdit.value) {
      form.value = await api(`/api/spots/${route.params.id}`) // pre-fill the form
    } else {
      buildings.value = await api('/api/buildings')
    }
  } catch (e) {
    error.value = e.message
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit.value) {
      await api(`/api/spots/${route.params.id}`, { method: 'PUT', body: form.value })
    } else {
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
  <h3>{{ isEdit ? `Edit: ${form.buildingName}, ${form.name}` : 'Add a New Study Spot' }}</h3>
  <form @submit.prevent="save">
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
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="saving">{{ isEdit ? 'Update' : 'Add' }} Study Spot</button>
    <RouterLink to="/admin/spots">Cancel</RouterLink>
  </form>
</template>

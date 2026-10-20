<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'

// Replaces edit-building.ejs and delete-building.ejs
const buildings = ref([])
const error = ref('')

onMounted(async () => {
  try {
    buildings.value = await api('/api/buildings')
  } catch (e) {
    error.value = e.message
  }
})

async function remove(building) {
  if (!confirm(`Delete ${building.buildingname}?`)) return
  try {
    await api(`/api/buildings/${building.postal}`, { method: 'DELETE' })
    buildings.value = buildings.value.filter(b => b._id !== building._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <h2>Buildings</h2>
  <RouterLink to="/admin/buildings/new">+ Add Building</RouterLink>
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="buildings.length === 0">No buildings found.</p>
  <div v-for="building in buildings" :key="building._id">
    <p><strong>{{ building.buildingname }}</strong></p>
    Floors: {{ building.floors }} · Postal Code: {{ building.postal }}<br>
    <RouterLink :to="`/admin/buildings/${building.postal}/edit`">Edit</RouterLink> |
    <button @click="remove(building)">Delete</button>
    <hr>
  </div>
</template>

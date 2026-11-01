<script setup>
// ACTIVE (admin only): list of buildings with Edit and Delete. The router checks the admin role, and the server checks again.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// The shared JSON helper.
import { api } from '../api'

// Existing note: replaces the old EJS pages.
// Replaces edit-building.ejs and delete-building.ejs
// The buildings from the server.
const buildings = ref([])
// A message to show on failure.
const error = ref('')

// Run once when the page appears.
onMounted(async () => {
  try {
    // GET /api/buildings.
    buildings.value = await api('/api/buildings')
  } catch (e) {
    // Show the error text.
    error.value = e.message
  }
})

// Delete one building.
async function remove(building) {
  // Ask for confirmation first.
  if (!confirm(`Delete ${building.buildingname}?`)) return
  try {
    // DELETE /api/buildings/:postal (admin only on the server).
    await api(`/api/buildings/${building.postal}`, { method: 'DELETE' })
    // Remove it from the page without reloading.
    buildings.value = buildings.value.filter(b => b._id !== building._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Page title and add link. -->
  <h2>Buildings</h2>
  <!-- Link to the add-building form. -->
  <RouterLink to="/admin/buildings/new">+ Add Building</RouterLink>
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="buildings.length === 0">No buildings found.</p>
  <!-- One block per building. -->
  <div v-for="building in buildings" :key="building._id">
    <p><strong>{{ building.buildingname }}</strong></p>
    Floors: {{ building.floors }} · Postal Code: {{ building.postal }}<br>
    <!-- Edit opens BuildingFormView.vue. -->
    <RouterLink :to="`/admin/buildings/${building.postal}/edit`">Edit</RouterLink> |
    <button @click="remove(building)">Delete</button>
    <hr>
  </div>
</template>

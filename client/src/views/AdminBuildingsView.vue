<script setup>
// ACTIVE (admin only): list of buildings with Edit and Delete. The router checks the admin role, and the server checks again.
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { levelsText } from '../floors'
import AdminTabs from '../components/AdminTabs.vue'

const buildings = ref([])
const error = ref('')
const loading = ref(true)
const search = ref('')

onMounted(async () => {
  try {
    // GET /api/buildings.
    buildings.value = await api('/api/buildings')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// filters as you type, by name or postal code
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return buildings.value
  return buildings.value.filter(b => b.buildingname.toLowerCase().includes(q) || String(b.postal).includes(q))
})

async function remove(building) {
  if (!confirm(`Delete ${building.buildingname}? Its study spots and their reviews are deleted too.`)) return
  try {
    // DELETE /api/buildings/:postal (admin only on the server; it also removes the building's spots and reviews).
    await api(`/api/buildings/${building.postal}`, { method: 'DELETE' })
    buildings.value = buildings.value.filter(b => b._id !== building._id)
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="nb-page">
    <AdminTabs />

    <header class="nb-page-head">
      <div>
        <h1 class="nb-title">Buildings</h1>
        <p class="nb-subtitle">
          <template v-if="!loading">{{ search ? `${shown.length} of ${buildings.length}` : buildings.length }} building{{ buildings.length === 1 ? '' : 's' }}</template>
        </p>
      </div>
      <div class="nb-page-tools">
        <div class="nb-field">
          <label for="building-search">Search</label>
          <input id="building-search" v-model="search" class="nb-input" type="search" placeholder="Name or postal code">
        </div>
        <RouterLink to="/admin/buildings/new" class="nb-btn nb-btn--primary">+ Add building</RouterLink>
      </div>
    </header>

    <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="loading" class="nb-state">Loading buildings…</p>
    <p v-else-if="!buildings.length && !error" class="nb-state">No buildings yet. Add the first one.</p>
    <p v-else-if="!shown.length" class="nb-state">No buildings match “{{ search }}”.</p>

    <template v-else>
      <div class="nb-table-wrap">
        <table class="nb-table">
          <thead>
            <tr><th>Building</th><th>Floors</th><th>Postal code</th><th><span class="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="building in shown" :key="building._id">
              <td><strong>{{ building.buildingname }}</strong></td>
              <td>{{ levelsText(building) }}</td>
              <td>{{ building.postal }}</td>
              <td>
                <div class="nb-actions">
                  <!-- Edit opens BuildingFormView.vue. -->
                  <RouterLink :to="`/admin/buildings/${building.postal}/edit`" class="nb-btn" :aria-label="`Edit ${building.buildingname}`">
                    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
                    Edit
                  </RouterLink>
                  <button type="button" class="nb-btn nb-btn--danger" :aria-label="`Delete ${building.buildingname}`" @click="remove(building)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note">Deleting a building also removes its study spots and their reviews.</p>
    </template>
  </div>
</template>

<style scoped>
.nb-table-wrap { max-width: 1140px; }
.note { margin: 16px 0 0; color: var(--nb-muted); font-size: 0.92rem; }
</style>

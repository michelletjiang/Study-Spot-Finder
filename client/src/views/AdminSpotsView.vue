<script setup>
// ACTIVE (admin only): every study spot in one table, with search, building filters and View, Edit and Delete.
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import AdminTabs from '../components/AdminTabs.vue'

const spots = ref([])
const error = ref('')
const loading = ref(true)
const search = ref('')
const building = ref('') // '' = all buildings

onMounted(async () => {
  try {
    // GET /api/spots.
    spots.value = await api('/api/spots')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// one filter chip per building that has spots, in the order they first appear
const buildingNames = computed(() => [...new Set(spots.value.map(s => s.buildingName))])

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return spots.value.filter(s => (!building.value || s.buildingName === building.value) && (!q || s.name.toLowerCase().includes(q)))
})

async function remove(spot) {
  // TODO: swap for a ConfirmModal component later
  if (!confirm(`Delete ${spot.buildingName}, ${spot.name}? Its reviews are deleted too.`)) return
  try {
    // DELETE /api/spots/:id (admin only on the server).
    await api(`/api/spots/${spot._id}`, { method: 'DELETE' })
    spots.value = spots.value.filter(s => s._id !== spot._id) // remove without refetching
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
        <h1 class="nb-title">Study spots</h1>
        <p class="nb-subtitle"><template v-if="!loading">{{ shown.length }} of {{ spots.length }} spots shown</template></p>
      </div>
      <div class="nb-page-tools">
        <div class="nb-field">
          <label for="spot-search">Search</label>
          <input id="spot-search" v-model="search" class="nb-input" type="search" placeholder="Room name">
        </div>
        <RouterLink to="/admin/spots/new" class="nb-btn nb-btn--primary">+ Add study spot</RouterLink>
      </div>
    </header>

    <div v-if="buildingNames.length > 1" class="chips" role="group" aria-label="Filter by building">
      <button type="button" class="nb-chip" :aria-pressed="!building" @click="building = ''">All</button>
      <button v-for="name in buildingNames" :key="name" type="button" class="nb-chip" :aria-pressed="building === name" @click="building = name">
        {{ name }}
      </button>
    </div>

    <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="loading" class="nb-state">Loading study spots…</p>
    <p v-else-if="!spots.length && !error" class="nb-state">No study spots yet. Add the first one.</p>
    <p v-else-if="!shown.length" class="nb-state">No study spots match. <button type="button" class="nb-link" @click="search = ''; building = ''">Clear the filters</button></p>

    <div v-else class="nb-table-wrap">
      <table class="nb-table">
        <thead>
          <tr>
            <th>Room</th><th>Building</th><th>Floor</th><th>Seats</th><th>Power</th><th>Noise</th>
            <th><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="spot in shown" :key="spot._id">
            <td><strong>{{ spot.name }}</strong></td>
            <td>{{ spot.buildingName }}</td>
            <td>{{ spot.floor }}</td>
            <td>{{ spot.seatCount }}</td>
            <td>{{ spot.hasPowerSocket ? 'Yes' : 'No' }}</td>
            <td>
              <span v-if="spot.noiseLevel" class="nb-tag" :class="`nb-tag--${spot.noiseLevel.toLowerCase()}`">{{ spot.noiseLevel }}</span>
              <span v-else class="missing">Not set</span>
            </td>
            <td>
              <div class="nb-actions">
                <!-- View opens the public room page, which also has the Compare button. -->
                <RouterLink :to="`/spots/${spot._id}`" class="nb-btn" :aria-label="`View ${spot.name}`">View</RouterLink>
                <!-- Edit opens SpotFormView.vue. -->
                <RouterLink :to="`/admin/spots/${spot._id}/edit`" class="nb-btn" :aria-label="`Edit ${spot.name}`">Edit</RouterLink>
                <button type="button" class="nb-btn nb-btn--danger" :aria-label="`Delete ${spot.name}`" @click="remove(spot)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 8px; max-width: 1140px; margin: -8px 0 24px; }
.nb-table-wrap { max-width: 1140px; }
.missing { color: var(--nb-muted); font-size: 0.88rem; font-style: italic; }
</style>

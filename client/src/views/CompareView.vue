<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { comparison } from '../stores/compare'
import { comparisonLocation, idsAfterRemoval } from './compare-navigation'

const route = useRoute()
const router = useRouter()
const spots = ref([])
const missingIds = ref([])
const loading = ref(true)
const error = ref('')
const requestedIds = computed(() => String(route.query.ids || '').split(',').map(id => id.trim()).filter(Boolean))

async function load() {
  loading.value = true
  error.value = ''
  spots.value = []
  missingIds.value = []
  comparison.restore(requestedIds.value)
  if (requestedIds.value.length < 2 || requestedIds.value.length > 3) {
    error.value = 'Choose exactly two or three spots from a spot list.'
    loading.value = false
    return
  }
  try {
    const data = await api(`/api/spots/compare?ids=${encodeURIComponent(requestedIds.value.join(','))}`)
    spots.value = data.spots
    missingIds.value = data.missingIds
    if (missingIds.value.length) error.value = 'Some selected spots are no longer available.'
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

watch(() => String(route.query.ids || ''), load, { immediate: true })
function removeSpot(id) {
  const ids = idsAfterRemoval(comparison.selectedIds.value, id)
  comparison.restore(ids)
  router.replace(comparisonLocation(ids))
}
</script>

<template>
  <main class="comparison-page" aria-labelledby="comparison-title">
    <h2 id="comparison-title">Compare study spots</h2>
    <p v-if="loading" aria-live="polite">Loading catalogue facts...</p>
    <p v-else-if="error" class="comparison-message" role="alert">{{ error }}</p>
    <p v-if="missingIds.length" class="comparison-message">Unavailable selections: {{ missingIds.length }}.</p>
    <div v-if="!loading && spots.length" class="comparison-grid">
      <article v-for="spot in spots" :key="spot._id" class="comparison-card">
        <h3>{{ spot.name }}</h3>
        <dl>
          <div><dt>Building</dt><dd>{{ spot.buildingName }}</dd></div>
          <div><dt>Floor</dt><dd>{{ spot.floor }}</dd></div>
          <div><dt>Seats</dt><dd>{{ spot.seatCount }}</dd></div>
          <div><dt>Power</dt><dd>{{ spot.hasPowerSocket ? 'Available' : 'Not listed' }}</dd></div>
          <div><dt>Noise</dt><dd>{{ spot.noiseLevel }}</dd></div>
        </dl>
        <button type="button" class="secondary" @click="removeSpot(spot._id)">Remove</button>
      </article>
    </div>
    <p v-else-if="!loading && !error">No matching spots found.</p>
    <RouterLink to="/">Back to study spots</RouterLink>
  </main>
</template>

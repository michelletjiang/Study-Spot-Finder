<script setup>
// ACTIVE (comparison): the side-by-side page at /compare?ids=a,b[,c]. It only reads: it never edits spots or ranks them.
// watch re-runs a function when a value changes.
import { computed, ref, watch } from 'vue'
// useRoute reads the URL, useRouter changes it.
import { useRoute, useRouter } from 'vue-router'
// api is the shared JSON helper.
import { api } from '../api'
// The shortlist store.
import { comparison } from '../stores/compare'
// Helpers from compare-navigation.js for removing a spot and building the link.
import { comparisonLocation, idsAfterRemoval } from './compare-navigation'

// The current route, with the ids in the query.
const route = useRoute()
// The router, to update the URL after a removal.
const router = useRouter()
// The spots returned by the server.
const spots = ref([])
// Ids the server could not find, for example a spot deleted after it was chosen.
const missingIds = ref([])
// True while the request runs.
const loading = ref(true)
// A message to show, or empty.
const error = ref('')
// The ids from the URL, trimmed, with blanks dropped.
const requestedIds = computed(() => String(route.query.ids || '').split(',').map(id => id.trim()).filter(Boolean))

// Fetch the comparison from the server.
async function load() {
  // Reset the state before each load.
  loading.value = true
  error.value = ''
  spots.value = []
  missingIds.value = []
  // Put the URL's ids on the shortlist, so a shared or reloaded link shows the right tray.
  comparison.restore(requestedIds.value)
  // Client check: two or three spots only. This mirrors the server rule.
  if (requestedIds.value.length < 2 || requestedIds.value.length > 3) {
    // The message shown when the count is wrong.
    error.value = 'Choose exactly two or three spots from a spot list.'
    // Nothing to load.
    loading.value = false
    return
  }
  // Ask the server for the facts.
  try {
    // GET /api/spots/compare?ids=... The student must be logged in or the server answers 401.
    const data = await api(`/api/spots/compare?ids=${encodeURIComponent(requestedIds.value.join(','))}`)
    // Save the spots.
    spots.value = data.spots
    // Save the ids that were not found.
    missingIds.value = data.missingIds
    // Tell the student when some spots are gone.
    if (missingIds.value.length) error.value = 'Some selected spots are no longer available.'
  // A server error (such as 400 or 401) shows its message.
  } catch (e) { error.value = e.message }
  // Always stop the loading state.
  finally { loading.value = false }
}

// Load now, and again whenever the ids in the URL change.
watch(() => String(route.query.ids || ''), load, { immediate: true })
// Remove one spot from the comparison.
function removeSpot(id) {
  // The ids that remain.
  const ids = idsAfterRemoval(comparison.selectedIds.value, id)
  // Update the shortlist.
  comparison.restore(ids)
  // Replace the URL: with fewer than two spots the student goes home, otherwise the page reloads with the shorter list.
  router.replace(comparisonLocation(ids))
}
</script>

<template>
  <main class="comparison-page" aria-labelledby="comparison-title">
    <!-- The comparison page content. aria-labelledby points to the heading. -->
    <h2 id="comparison-title">Compare study spots</h2>
    <!-- Loading message. -->
    <p v-if="loading" aria-live="polite">Loading catalogue facts...</p>
    <!-- Error message, announced to screen readers. -->
    <p v-else-if="error" class="comparison-message" role="alert">{{ error }}</p>
    <!-- Shows how many selections were not found. -->
    <p v-if="missingIds.length" class="comparison-message">Unavailable selections: {{ missingIds.length }}.</p>
    <!-- One card per spot, in the order the student chose. -->
    <div v-if="!loading && spots.length" class="comparison-grid">
      <article v-for="spot in spots" :key="spot._id" class="comparison-card">
        <!-- The spot's name. -->
        <h3>{{ spot.name }}</h3>
        <!-- The facts shown: building, floor, seats, power sockets and noise. They are the stored catalogue values. No score or winner is shown. -->
        <dl>
          <div><dt>Building</dt><dd>{{ spot.buildingName }}</dd></div>
          <div><dt>Floor</dt><dd>{{ spot.floor }}</dd></div>
          <div><dt>Seats</dt><dd>{{ spot.seatCount }}</dd></div>
          <div><dt>Power sockets</dt><dd>{{ spot.hasPowerSocket ? 'Available' : 'Not available' }}</dd></div>
          <div><dt>Noise</dt><dd>{{ spot.noiseLevel }}</dd></div>
        </dl>
        <!-- Remove takes this spot out of the comparison. -->
        <button type="button" class="secondary" @click="removeSpot(spot._id)">Remove</button>
      </article>
    </div>
    <!-- Shown when the load worked but there were no spots. -->
    <p v-else-if="!loading && !error">No matching spots found.</p>
    <!-- A link back to the list. -->
    <RouterLink to="/">Back to study spots</RouterLink>
  </main>
</template>

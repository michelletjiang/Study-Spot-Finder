<script setup>
// ACTIVE (comparison): the tray that lists the shortlist and links to the comparison page. It shows on every page except /compare.
// computed makes a value that updates with the data it reads.
import { computed } from 'vue'
// useRoute reads the current URL, useRouter navigates.
import { useRoute, useRouter } from 'vue-router'
// The shortlist store (stores/compare.js).
import { comparison } from '../stores/compare'

// The current route, to hide the tray on /compare.
const route = useRoute()
// The router, to move to the comparison page.
const router = useRouter()
// The chosen ids, kept up to date as the store changes.
const ids = computed(() => comparison.selectedIds.value)
// A message from the store, such as the full-list warning.
const notice = computed(() => comparison.notice.value)
// Go to /compare?ids=a,b[,c] but only when at least two spots are chosen.
function compare() { if (comparison.canCompare) router.push({ path: '/compare', query: { ids: ids.value.join(',') } }) }
</script>

<template>
  <aside v-if="ids.length && route.path !== '/compare'" class="compare-tray" aria-label="Selected spots for comparison">
    <!-- The tray only exists when something is selected and the student is not already on /compare (v-if above). The aria-label names it for screen readers. -->
    <!-- Shows how many of the three spots are chosen. aria-live lets screen readers hear changes. -->
    <div><strong>Compare spots</strong><span aria-live="polite"> {{ ids.length }}/3 selected</span></div>
    <!-- The store's notice, for example when a fourth spot is refused. -->
    <p v-if="notice" class="comparison-limit" role="status">{{ notice }}</p>
    <!-- One spot chosen: ask for one more. -->
    <p v-else-if="ids.length < 2">Select one more spot to compare. You can choose up to three.</p>
    <!-- Two or three: reminds that facts come from the catalogue (the stored fields), with no scores. -->
    <p v-else>Facts come from the study-spot catalogue.</p>
    <div class="compare-tray-actions">
      <!-- Compare selected appears only with at least two spots, and navigates to the comparison page. -->
      <button v-if="ids.length >= 2" type="button" @click="compare">Compare selected</button>
      <!-- Clear empties the shortlist. -->
      <button type="button" class="secondary" @click="comparison.clear">Clear</button>
    </div>
  </aside>
</template>

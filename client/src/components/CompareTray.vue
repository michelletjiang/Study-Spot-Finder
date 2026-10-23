<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { comparison } from '../stores/compare'

const router = useRouter()
const ids = computed(() => comparison.selectedIds.value)
function compare() { if (comparison.canCompare) router.push({ path: '/compare', query: { ids: ids.value.join(',') } }) }
</script>

<template>
  <aside v-if="ids.length" class="compare-tray" aria-label="Selected spots for comparison">
    <div><strong>Compare spots</strong><span aria-live="polite"> {{ ids.length }}/3 selected</span></div>
    <p v-if="ids.length < 2">Select one more spot to compare. You can choose up to three.</p>
    <p v-else>Facts come from the study-spot catalogue.</p>
    <div class="compare-tray-actions">
      <button v-if="ids.length >= 2" type="button" @click="compare">Compare selected</button>
      <button type="button" class="secondary" @click="comparison.clear">Clear</button>
    </div>
  </aside>
</template>

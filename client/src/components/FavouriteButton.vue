<script setup>
// ACTIVE: the heart button that adds or removes a favourite. Used by BuildingSpotsView.vue and SpotDetailView.vue.
import { ref, computed } from 'vue'
import { favourites } from '../stores/favourites'

// The page that shows this button must call favourites.load() once on mount.
const props = defineProps({ spot: { type: Object, required: true } })

// True while a request is running, so the button is disabled.
const busy = ref(false)
const error = ref('')
// True if the shared list already contains this spot.
const isFavourite = computed(() => !!favourites.find(props.spot))

async function toggle() {
  busy.value = true
  error.value = ''
  try {
    // Ask the store to add or remove the favourite (a request to /api/favourites).
    await favourites.toggle(props.spot)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- yellow and pressed once saved; the heart fills in pink -->
  <button type="button" class="nb-btn" :class="{ 'nb-btn--primary': isFavourite }" :aria-pressed="isFavourite" :disabled="busy" @click="toggle">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" :fill="isFavourite ? '#f5a0a6' : 'none'"
            stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    </svg>
    {{ isFavourite ? 'Saved to favourites' : 'Save to favourites' }}
  </button>
  <span v-if="error" class="error" role="alert">{{ error }}</span>
</template>

<style scoped>
.error { margin-left: 8px; color: var(--nb-error); font-size: 0.9rem; }
</style>

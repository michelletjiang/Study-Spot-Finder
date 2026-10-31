<script setup>
// ACTIVE: the star button that adds or removes a favourite. Used by BuildingSpotsView.vue and SpotDetailView.vue.
// ref makes a changing value, computed derives one.
import { ref, computed } from 'vue'
// The shared favourites list.
import { favourites } from '../stores/favourites'

// Existing note: the page that uses this button must load the favourites first.
// The page that shows this button must call favourites.load() once on mount
// The spot is passed in by the parent page.
const props = defineProps({ spot: { type: Object, required: true } })

// True while a request is running, so the button is disabled.
const busy = ref(false)
// An error message to show next to the button.
const error = ref('')
// True if the shared list already contains this spot.
const isFavourite = computed(() => !!favourites.find(props.spot))

// Called when the button is clicked.
async function toggle() {
  busy.value = true
  error.value = ''
  try {
    // Ask the store to add or remove the favourite (a request to /api/favourites).
    await favourites.toggle(props.spot)
  } catch (e) {
    // Show the server's message if it fails.
    error.value = e.message
  } finally {
    // Always re-enable the button.
    busy.value = false
  }
}
</script>

<template>
  <!-- Disabled while a request is running. The label depends on the saved state. -->
  <button :disabled="busy" @click="toggle">
    {{ isFavourite ? '★ Remove from Favourites' : '☆ Add to Favourites' }}
  </button>
  <!-- Existing inline style: shows the error in red. -->
  <span v-if="error" style="color: red"> {{ error }}</span>
</template>

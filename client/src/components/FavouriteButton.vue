<script setup>
import { ref, computed } from 'vue'
import { favourites } from '../stores/favourites'

// The page that shows this button must call favourites.load() once on mount
const props = defineProps({ spot: { type: Object, required: true } })

const busy = ref(false)
const error = ref('')
const isFavourite = computed(() => !!favourites.find(props.spot))

async function toggle() {
  busy.value = true
  error.value = ''
  try {
    await favourites.toggle(props.spot)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button :disabled="busy" @click="toggle">
    {{ isFavourite ? '★ Remove from Favourites' : '☆ Add to Favourites' }}
  </button>
  <span v-if="error" style="color: red"> {{ error }}</span>
</template>

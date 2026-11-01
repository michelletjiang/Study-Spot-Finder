<script setup>
import { computed } from 'vue'

// A review's rating as five stars: filled ones in ink, the rest faded. Display only (the review form has its own picker).
const props = defineProps({ rating: { type: Number, required: true } })
const filled = computed(() => Math.max(0, Math.min(5, Math.round(props.rating))))
</script>

<template>
  <span class="stars" role="img" :aria-label="`${rating} out of 5`">
    <span aria-hidden="true">{{ '★'.repeat(filled) }}</span><span class="empty" aria-hidden="true">{{ '★'.repeat(5 - filled) }}</span>
  </span>
</template>

<style scoped>
.stars { color: var(--nb-ink); letter-spacing: 1px; white-space: nowrap; }
.empty { color: var(--nb-rule); }
</style>

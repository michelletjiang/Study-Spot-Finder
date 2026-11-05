<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { STUDY_FEATURES } from '../featureChecklist'

const props = defineProps({
  spots: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  filterMatches: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'update:filterMatches'])

const selected = ref([...props.modelValue])
const storageKey = 'study-spot-feature-checklist'

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (Array.isArray(saved)) selected.value = saved.filter(id => STUDY_FEATURES.some(feature => feature.id === id))
    emit('update:modelValue', [...selected.value])
  } catch {
    // Ignore unavailable or malformed browser storage.
  }
})

watch(selected, value => {
  emit('update:modelValue', [...value])
  try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* storage is optional */ }
}, { deep: true })

watch(() => props.modelValue, value => {
  if (JSON.stringify(value) !== JSON.stringify(selected.value)) selected.value = [...value]
})

const matchingCount = computed(() => props.spots.filter(spot =>
  selected.value.every(id => STUDY_FEATURES.find(feature => feature.id === id)?.matches(spot))
).length)

function toggleFilter(event) {
  emit('update:filterMatches', event.target.checked)
}
</script>

<template>
  <section class="feature-checklist" aria-labelledby="feature-checklist-title">
    <div class="feature-checklist__header">
      <div>
        <h3 id="feature-checklist-title">What would you like in your study spot?</h3>
        <p class="feature-checklist__hint">Tick features to highlight spots that have everything you selected.</p>
      </div>
      <span class="feature-checklist__count" role="status" aria-live="polite">
        {{ selected.length ? `${matchingCount} of ${spots.length} match` : `${spots.length} spots` }}
      </span>
    </div>
    <div class="feature-checklist__options">
      <label v-for="feature in STUDY_FEATURES" :key="feature.id" class="feature-checklist__option">
        <input v-model="selected" type="checkbox" :value="feature.id" :aria-label="feature.label" />
        <span>{{ feature.label }}</span>
      </label>
      <label v-if="selected.length" class="feature-checklist__filter">
        <input :checked="filterMatches" type="checkbox" @change="toggleFilter" />
        <span>Show matching spots only</span>
      </label>
    </div>
  </section>
</template>

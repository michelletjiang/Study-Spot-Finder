import { computed, ref } from 'vue'

const selectedIds = ref([])
const MAX = 3

export const comparison = {
  selectedIds,
  count: computed(() => selectedIds.value.length),
  has(id) { return selectedIds.value.includes(String(id)) },
  toggle(id) {
    id = String(id)
    if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(item => item !== id)
    else if (selectedIds.value.length < MAX) selectedIds.value = [...selectedIds.value, id]
    return selectedIds.value.length <= MAX
  },
  remove(id) { selectedIds.value = selectedIds.value.filter(item => item !== String(id)) },
  clear() { selectedIds.value = [] },
  restore(ids) { selectedIds.value = [...new Set(ids.map(String))].slice(0, MAX) },
  get canCompare() { return selectedIds.value.length >= 2 },
}

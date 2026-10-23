import { computed, ref } from 'vue'
import { restoreSelection, toggleSelection } from './compare-selection'

const selectedIds = ref([])

export const comparison = {
  selectedIds,
  count: computed(() => selectedIds.value.length),
  has(id) { return selectedIds.value.includes(String(id)) },
  toggle(id) {
    id = String(id)
    if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(item => item !== id)
    else selectedIds.value = toggleSelection(selectedIds.value, id)
    return selectedIds.value.length <= 3
  },
  remove(id) { selectedIds.value = selectedIds.value.filter(item => item !== String(id)) },
  clear() { selectedIds.value = [] },
  restore(ids) { selectedIds.value = restoreSelection(ids) },
  get canCompare() { return selectedIds.value.length >= 2 },
}

import { computed, ref } from 'vue'
import { restoreSelection, toggleSelection } from './compare-selection.js'

const selectedIds = ref([])
const notice = ref('')

export const comparison = {
  selectedIds,
  notice,
  count: computed(() => selectedIds.value.length),
  has(id) { return selectedIds.value.includes(String(id)) },
  toggle(id) {
    id = String(id)
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(item => item !== id)
      notice.value = ''
      return true
    }

    const next = toggleSelection(selectedIds.value, id)
    if (next === selectedIds.value) {
      notice.value = 'You can compare up to three spots. Remove one before adding another.'
      return false
    }

    selectedIds.value = next
    notice.value = ''
    return true
  },
  remove(id) {
    selectedIds.value = selectedIds.value.filter(item => item !== String(id))
    notice.value = ''
  },
  clear() {
    selectedIds.value = []
    notice.value = ''
  },
  restore(ids) {
    selectedIds.value = restoreSelection(ids)
    notice.value = ''
  },
  get canCompare() { return selectedIds.value.length >= 2 },
}

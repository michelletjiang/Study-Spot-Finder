// ACTIVE (comparison): the shortlist shared by every page. It lives only in the browser's memory and is cleared by NavBar.vue at logout and by a page reload.
// computed values recalculate when the list changes, and ref makes a value reactive.
import { computed, ref } from 'vue'
// The two rule functions from compare-selection.js.
import { restoreSelection, toggleSelection } from './compare-selection.js'

// Ids of the chosen spots, in the order they were chosen.
const selectedIds = ref([])
// A short message shown by CompareTray.vue, for example when the list is full.
const notice = ref('')

// The object that components import.
export const comparison = {
  selectedIds,
  notice,
  // How many spots are chosen.
  count: computed(() => selectedIds.value.length),
  // True if this spot is already on the shortlist.
  has(id) { return selectedIds.value.includes(String(id)) },
  // The Compare button calls this.
  toggle(id) {
    id = String(id)
    // Already chosen: remove it.
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(item => item !== id)
      notice.value = ''
      return true
    // Return true so the caller knows the list changed.
    }

    // Not chosen: ask the rules whether there is room.
    const next = toggleSelection(selectedIds.value, id)
    // The same array coming back means the list is full.
    if (next === selectedIds.value) {
      // Tell the student why nothing was added. No spot is added after three.
      notice.value = 'You can compare up to three spots. Remove one before adding another.'
      // false means nothing changed.
      return false
    }

    // Room left: save the new list.
    selectedIds.value = next
    notice.value = ''
    return true
  },
  // Remove one spot, for the tray's remove buttons and the compare page.
  remove(id) {
    selectedIds.value = selectedIds.value.filter(item => item !== String(id))
    notice.value = ''
  },
  // Empty the shortlist (used at logout and by Clear).
  clear() {
    selectedIds.value = []
    notice.value = ''
  },
  // Replace the list with ids from the URL (used by CompareView.vue), cleaned by restoreSelection.
  restore(ids) {
    selectedIds.value = restoreSelection(ids)
    notice.value = ''
  },
  // Comparing needs at least two spots.
  get canCompare() { return selectedIds.value.length >= 2 },
}

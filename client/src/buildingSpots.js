import { ref, watch } from 'vue'
import { api } from './api'
import { favourites } from './stores/favourites'
import { mapStore } from './stores/map'

// Loads a building and its study spots whenever the name changes, and points the minimap at it.
// Shared by the building page and the floor page. Usage: const { building, spots, loading, error } = useBuildingSpots(nameRef)
export function useBuildingSpots(buildingName) {
  const building = ref(null)
  const spots = ref([])
  const loading = ref(true)
  const error = ref('')

  // re-runs when the name changes too: clicking another building on the minimap reuses the page
  watch(buildingName, async name => {
    if (!name) return // leaving the page
    loading.value = true
    error.value = ''
    try {
      const data = await api(`/api/buildings/${encodeURIComponent(name)}/spots`)
      building.value = data.building
      spots.value = data.studySpots
      mapStore.showBuilding(data.building) // minimap zooms here and finds the fastest route
      await favourites.load()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  return { building, spots, loading, error }
}

import { reactive } from 'vue'
import { api } from '../api'

// The logged-in user's favourites, shared so every ☆ button on a page agrees.
// Favourites are stored by spot name + building name (same as the old pages), not by spot id.
export const favourites = reactive({
  list: [],

  async load() {
    this.list = await api('/api/favourites')
  },

  find(spot) {
    return this.list.find(f => f.spotName === spot.name && f.buildingName === spot.buildingName)
  },

  async toggle(spot) {
    const existing = this.find(spot)
    if (existing) {
      await api(`/api/favourites/${existing._id}`, { method: 'DELETE' })
      this.list = this.list.filter(f => f._id !== existing._id)
    } else {
      this.list.push(await api('/api/favourites', { method: 'POST', body: { spotId: spot._id } }))
    }
  },
})

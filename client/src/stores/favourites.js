// ACTIVE: shared favourites list, so every star button on a page agrees. Used by FavouriteButton.vue and FavouritesView.vue.
// reactive makes the object update the screen when its fields change.
import { reactive } from 'vue'
// api is the shared JSON fetch helper.
import { api } from '../api'

// Existing note: the list comes from the server.
// The logged-in user's favourites, shared so every ☆ button on a page agrees.
// Favourites are stored by spot name + building name (same as the old pages), not by spot id.
// One shared object for all components.
export const favourites = reactive({
  // The favourites loaded from the server.
  list: [],

  // Load the list (GET /api/favourites).
  async load() {
    this.list = await api('/api/favourites')
  },

  // Find the favourite that matches a spot by name and building, or undefined.
  find(spot) {
    return this.list.find(f => f.spotName === spot.name && f.buildingName === spot.buildingName)
  },

  // Add or remove a favourite.
  async toggle(spot) {
    const existing = this.find(spot)
    // Already saved: ask the server to delete it, then drop it from the local list.
    if (existing) {
      await api(`/api/favourites/${existing._id}`, { method: 'DELETE' })
      this.list = this.list.filter(f => f._id !== existing._id)
    // Not saved: ask the server to create it (it copies the spot's details) and add the reply to the list.
    } else {
      this.list.push(await api('/api/favourites', { method: 'POST', body: { spotId: spot._id } }))
    }
  },
})

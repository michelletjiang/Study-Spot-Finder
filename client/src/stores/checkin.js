import { reactive } from 'vue'
import { api } from '../api'

// Where the logged-in user is checked in, shared so every room panel agrees.
// current is { spot, spotName, buildingName, createdAt, endsAt } or null.
export const myCheckIn = reactive({
  current: null,
  loaded: false,
  noiseRatings: {}, // spot _id -> this user's latest noise answer there, or null

  // GET /api/checkins/me, once per page load (call again with force to refresh)
  async load(force = false) {
    if (this.loaded && !force) return
    const { checkIn } = await api('/api/checkins/me')
    this.current = checkIn
    this.loaded = true
  },

  // checked in to this spot, and the 3 hours aren't up yet
  isAt(spotId) {
    return !!this.current && String(this.current.spot) === String(spotId) && new Date(this.current.endsAt) > new Date()
  },

  // checked in somewhere (still within the 3 hours)
  get active() {
    return !!this.current && new Date(this.current.endsAt) > new Date()
  },
})

import { reactive } from 'vue'
import { api } from '../api'

let watchId = null // from navigator.geolocation.watchPosition

// State for the floating minimap (components/MiniMap.vue), shared so any page can point it somewhere.
// Usage: mapStore.showBuilding(building)  → zoom to the building and fetch routes from the user's location
//        mapStore.clearDestination()       → back to just showing the user's location
export const mapStore = reactive({
  expanded: false,
  dockEl: null,       // the home page's map box while it's showing; the minimap moves into it (see MiniMap.vue)

  userPos: null,      // [lat, lng] from the browser's geolocation
  locationError: '',

  destination: null,  // the building being routed to
  routes: [],         // from /api/directions, see services/onemap.js for the shape
  fastest: '',        // 'walk' | 'pt'
  activeMode: '',     // which route is drawn; starts as the fastest one
  loadingRoute: false,
  routeError: '',

  get activeRoute() {
    return this.routes.find(r => r.mode === this.activeMode) || null
  },

  // Start watching the user's location (MiniMap calls this when it mounts, stopLocating when it unmounts)
  locate() {
    if (!navigator.geolocation) {
      this.locationError = 'Your browser does not support location.'
      return
    }
    this.stopLocating()
    watchId = navigator.geolocation.watchPosition(
      pos => {
        const first = !this.userPos
        this.userPos = [pos.coords.latitude, pos.coords.longitude]
        this.locationError = ''
        // a building was picked before we knew where the user was
        if (first && this.destination) this.fetchRoutes()
      },
      err => {
        this.locationError = err.code === err.PERMISSION_DENIED
          ? 'Allow location access to see routes.'
          : 'Could not find your location.'
      },
      { enableHighAccuracy: true, maximumAge: 30000 },
    )
  },

  stopLocating() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    watchId = null
  },

  showBuilding(building) {
    if (building.lat == null || building.lng == null) {
      this.clearDestination()
      this.routeError = `${building.buildingname} has no coordinates yet.`
      return
    }
    // building page -> floor page is the same building: keep the route already shown
    if (this.destination?.postal === building.postal && (this.routes.length || this.loadingRoute)) return
    this.destination = building
    this.fetchRoutes()
  },

  clearDestination() {
    this.destination = null
    this.routes = []
    this.loadingRoute = false
    this.fastest = this.activeMode = this.routeError = ''
  },

  async fetchRoutes() {
    this.routes = []
    this.routeError = ''
    if (!this.userPos || !this.destination) return // locate() calls this again once the position arrives

    const target = this.destination
    this.loadingRoute = true
    try {
      const from = this.userPos.join(',')
      const data = await api(`/api/directions?from=${from}&to=${target.lat},${target.lng}`)
      if (this.destination !== target) return // user moved on to another building meanwhile
      this.routes = data.routes
      this.fastest = this.activeMode = data.fastest
    } catch (e) {
      if (this.destination === target) this.routeError = e.message
    } finally {
      if (this.destination === target) this.loadingRoute = false
    }
  },
})

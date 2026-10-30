// ACTIVE: shared state for the floating minimap (MiniMap.vue). In the demo no route is drawn, because the demo buildings have no coordinates and OneMap calls are blocked.
import { reactive } from 'vue'
import { api } from '../api'

// The id of the browser's location watcher, so it can be stopped.
let watchId = null // from navigator.geolocation.watchPosition

// State for the floating minimap (components/MiniMap.vue), shared so any page can point it somewhere.
// Usage: mapStore.showBuilding(building)  → zoom to the building and fetch routes from the user's location
//        mapStore.clearDestination()       → back to just showing the user's location
export const mapStore = reactive({
  // Whether the minimap panel is open.
  expanded: false,

  // The user's position from the browser, as [lat, lng].
  userPos: null,      // [lat, lng] from the browser's geolocation
  // A message shown when location cannot be found.
  locationError: '',

  // The building we are routing to.
  destination: null,  // the building being routed to
  // The routes returned by /api/directions.
  routes: [],         // from /api/directions, see services/onemap.js for the shape
  // Which mode is fastest.
  fastest: '',        // 'walk' | 'pt'
  // Which route is shown on the map.
  activeMode: '',     // which route is drawn; starts as the fastest one
  // True while a route request is running.
  loadingRoute: false,
  // An error message for the route.
  routeError: '',

  // The currently selected route object, or null.
  get activeRoute() {
    return this.routes.find(r => r.mode === this.activeMode) || null
  },

  // Start watching the user's location. MiniMap.vue calls this when it mounts.
  // Start watching the user's location (MiniMap calls this when it mounts, stopLocating when it unmounts)
  locate() {
    // Some browsers have no geolocation.
    if (!navigator.geolocation) {
      this.locationError = 'Your browser does not support location.'
      return
    }
    this.stopLocating()
    // watchPosition calls the first function every time the position changes.
    watchId = navigator.geolocation.watchPosition(
      pos => {
        // Remember whether this is the first position we have received.
        const first = !this.userPos
        this.userPos = [pos.coords.latitude, pos.coords.longitude]
        this.locationError = ''
        // Existing note: a building was chosen before we had a position, so fetch the routes now.
        // a building was picked before we knew where the user was
        if (first && this.destination) this.fetchRoutes()
      },
      // The second function runs when location fails.
      err => {
        this.locationError = err.code === err.PERMISSION_DENIED
          ? 'Allow location access to see routes.'
          : 'Could not find your location.'
      },
      // Options: ask for an accurate position, and allow a cached one up to 30 seconds old.
      { enableHighAccuracy: true, maximumAge: 30000 },
    )
  },

  // Stop watching, for example when the map unmounts.
  stopLocating() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    watchId = null
  },

  // Point the map at a building. Called from BuildingSpotsView.vue.
  showBuilding(building) {
    // No coordinates means no route can be drawn. Show a message instead.
    if (building.lat == null || building.lng == null) {
      this.clearDestination()
      this.routeError = `${building.buildingname} has no coordinates yet.`
      return
    }
    // Remember the destination, then fetch routes.
    this.destination = building
    this.fetchRoutes()
  },

  // Forget the destination and routes.
  clearDestination() {
    this.destination = null
    this.routes = []
    this.loadingRoute = false
    this.fastest = this.activeMode = this.routeError = ''
  },

  // Call /api/directions for walking and transit routes.
  async fetchRoutes() {
    this.routes = []
    this.routeError = ''
    // Existing note: nothing to do until both points are known.
    if (!this.userPos || !this.destination) return // locate() calls this again once the position arrives

    // Remember which building this request is for.
    const target = this.destination
    this.loadingRoute = true
    try {
      // The server expects "lat,lng" text.
      const from = this.userPos.join(',')
      // This call reaches the server's OneMap client, which the demo blocks.
      const data = await api(`/api/directions?from=${from}&to=${target.lat},${target.lng}`)
      // Existing note: ignore a late reply for a building the user has left.
      if (this.destination !== target) return // user moved on to another building meanwhile
      // Store the routes and select the fastest one.
      this.routes = data.routes
      this.fastest = this.activeMode = data.fastest
    // Show the error unless the user moved on.
    } catch (e) {
      if (this.destination === target) this.routeError = e.message
    // Always clear the loading flag in the end.
    } finally {
      if (this.destination === target) this.loadingRoute = false
    }
  },
})

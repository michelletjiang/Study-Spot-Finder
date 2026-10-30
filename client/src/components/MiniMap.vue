<script setup>
// ACTIVE: the floating Leaflet map. App.vue mounts it once for logged-in users. It is unrelated to the comparison feature except that it is lifted above the tray (class with-compare-tray, styled below).
// Vue helpers for state, derived values, watchers and start and stop hooks.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
// The route (to read meta.showMap) and the router (to open a building).
import { useRoute, useRouter } from 'vue-router'
// Leaflet is the map library.
import L from 'leaflet'
// Leaflet's own stylesheet.
import 'leaflet/dist/leaflet.css'
// The shared JSON helper.
import { api } from '../api'
// The shared minimap state (position, destination, routes).
import { mapStore } from '../stores/map'

// Floating map in the bottom-right corner (mounted once in App.vue).
// Shows the user's location and every building; on a building page it also draws the route there.
// Only visible on routes with meta.showMap, but kept mounted so the map isn't rebuilt on every page change.

// The current route and the router.
const route = useRoute()
const router = useRouter()
// The map shows only on routes whose meta.showMap is true.
const visible = computed(() => !!route.meta.showMap)

// The element Leaflet draws into.
const mapEl = ref(null)
// Buildings that have coordinates.
const buildings = ref([])

// Existing note: Leaflet objects are kept out of Vue's reactivity.
// Leaflet objects stay out of Vue's reactivity (its proxies break Leaflet internals)
let map, userMarker
// One layer for building markers and one for the route line.
const buildingLayer = L.layerGroup()
const routeLayer = L.layerGroup()

// The map centre when nothing else is known.
const SINGAPORE = [1.3521, 103.8198]
// Colours for the transport modes.
const MODE_COLOURS = { WALK: '#6b7280', BUS: '#16a34a', SUBWAY: '#dc2626', RAIL: '#dc2626', TRAM: '#0891b2' }
// Whether the browser prefers a dark colour scheme, to choose dark map tiles.
const dark = window.matchMedia('(prefers-color-scheme: dark)')

// Runs once when the map component appears.
onMounted(() => {
  // Create the map inside the element.
  map = L.map(mapEl.value, {
    center: SINGAPORE,
    zoom: 12,
    minZoom: 11,
    // Existing note: OneMap only has tiles for Singapore.
    maxBounds: [[1.144, 103.535], [1.494, 104.1]], // OneMap only has tiles for Singapore
    zoomControl: false,
  })
  // Map tiles come from OneMap in the browser. The demo blocks this request, so the map frame shows without tiles.
  L.tileLayer(`https://www.onemap.gov.sg/maps/tiles/${dark.matches ? 'Night' : 'Default'}/{z}/{x}/{y}.png`, {
    minZoom: 11,
    maxZoom: 19,
    attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:14px;width:14px;vertical-align:middle"> ' +
      '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors &#124; ' +
      '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>',
  }).addTo(map)
  // Add zoom buttons.
  L.control.zoom({ position: 'topleft' }).addTo(map)
  // Add the two layers.
  buildingLayer.addTo(map)
  routeLayer.addTo(map)

  // Start watching the browser's location.
  mapStore.locate()
  // Load the buildings that have coordinates.
  loadBuildings()
  // Draw the user's marker if the position is already known.
  if (mapStore.userPos) drawUser(true)
})

// Existing note: runs when the map is removed at logout.
// unmounted on logout, so forget everything about this user's map
// Stop watching the location and reset the shared state.
onUnmounted(() => {
  mapStore.stopLocating()
  mapStore.clearDestination()
  mapStore.userPos = null
  mapStore.expanded = false
  // Remove the Leaflet map.
  map.remove()
})

// ---------- buildings ----------

// Fetch the buildings (GET /api/buildings) and keep the ones with coordinates.
async function loadBuildings() {
  try {
    buildings.value = (await api('/api/buildings')).filter(b => b.lat != null && b.lng != null)
  } catch (e) {
    // Log an error to the console without breaking the page.
    console.error('Could not load buildings for the map:', e.message)
  }
}

// Redraw the building markers.
function drawBuildings() {
  // Remove the old markers first.
  buildingLayer.clearLayers()
  for (const b of buildings.value) {
    // The destination is drawn bigger and red.
    const isDestination = mapStore.destination?.postal === b.postal
    // A round marker at the building's coordinates.
    L.circleMarker([b.lat, b.lng], {
      radius: isDestination ? 9 : 6,
      color: '#fff',
      weight: 2,
      fillColor: isDestination ? '#dc2626' : '#aa3bff',
      fillOpacity: 1,
    })
      // Show the building name on hover (always for the destination).
      .bindTooltip(b.buildingname, { permanent: isDestination, direction: 'top', offset: [0, -8] })
      // Clicking a marker opens that building's spot page.
      .on('click', () => router.push('/building/' + encodeURIComponent(b.buildingname)))
      // Add it to the building layer.
      .addTo(buildingLayer)
  }
}

// Redraw whenever the list of buildings changes.
watch(buildings, drawBuildings)

// Existing note: refresh when the map comes back into view.
// refresh buildings each time the map comes back into view (an admin may have added one)
// Runs when the map becomes visible or hidden.
watch(visible, isVisible => {
  // Nothing to do when hidden.
  if (!isVisible) return
  // Reload the buildings.
  loadBuildings()
  // Existing note: tell Leaflet to re-measure its container.
  setTimeout(() => map.invalidateSize(), 0) // Leaflet measured a hidden (0×0) container
})

// ---------- user location ----------

// Draw or move the marker for the user's position.
function drawUser(centre) {
  const pos = mapStore.userPos
  // First time: create the marker.
  if (!userMarker) {
    userMarker = L.circleMarker(pos, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 })
      .bindTooltip('You are here')
      .addTo(map)
  // Later: move the existing marker.
  } else {
    userMarker.setLatLng(pos)
  }
  // Optionally centre the map on the user.
  if (centre) map.setView(pos, 16)
}

// Redraw when the user's position changes.
watch(() => mapStore.userPos, (pos, oldPos) => {
  // Skip if there is no position or no map yet.
  if (!pos || !map) return
  // Existing note: only jump to the user on the first fix.
  // only jump to the user the first time, so later GPS updates don't fight with panning
  drawUser(!oldPos && !mapStore.destination)
})

// Recentre the map on the route, the destination or the user, whichever is available.
function recentre() {
  if (mapStore.activeRoute) fitRoute()
  else if (mapStore.destination) map.setView([mapStore.destination.lat, mapStore.destination.lng], 17)
  else if (mapStore.userPos) map.setView(mapStore.userPos, 16)
}

// ---------- destination + route ----------

// When the destination changes, redraw the markers and fly to it (or back to the user).
watch(() => mapStore.destination, dest => {
  drawBuildings()
  if (dest) map.flyTo([dest.lat, dest.lng], 17, { duration: 0.8 })
  else if (mapStore.userPos) map.flyTo(mapStore.userPos, 16, { duration: 0.8 })
})

// Zoom the map to fit the whole route.
function fitRoute() {
  // Collect every point of every leg.
  const points = mapStore.activeRoute.legs.flatMap(leg => leg.points)
  // Fit the map to those points.
  map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 17 })
}

// When the active route changes, redraw it.
watch(() => mapStore.activeRoute, r => {
  // Remove the old line.
  routeLayer.clearLayers()
  if (!r) return
  // Draw each leg.
  for (const leg of r.legs) {
    // Walking legs are dotted.
    const walking = leg.mode === 'WALK'
    L.polyline(leg.points, {
      color: MODE_COLOURS[leg.mode] || '#aa3bff',
      weight: walking ? 4 : 6,
      dashArray: walking ? '2 8' : null,
      lineCap: 'round',
    }).addTo(routeLayer)
  }
  fitRoute()
})

// Existing note: re-measure after the CSS size transition ends.
// the panel resizes the map, so re-measure once the CSS transition finishes
// Runs when the box finishes resizing.
function onResized(e) {
  // Ignore transitions of child elements.
  if (e.target !== e.currentTarget) return
  // Tell Leaflet the box has a new size.
  map.invalidateSize()
  // Re-fit the view.
  recentre()
}

// ---------- panel text ----------

// Turn seconds into text such as "5 min".
function minutes(seconds) {
  const m = Math.max(1, Math.round(seconds / 60))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

// Turn metres into text such as "850 m" or "1.2 km".
function distance(metres) {
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`
}

// Names shown on the mode buttons.
const MODE_NAMES = { walk: 'Walk', pt: 'Transit' }

// Show the text panel when something needs saying.
const showPanel = computed(() =>
  !!(mapStore.locationError || !mapStore.userPos || mapStore.destination || mapStore.routeError))

// Build the text of one route step, such as "Bus 36 to ...".
function legText(leg) {
  const to = leg.to ? ` to ${leg.to}` : ` to ${mapStore.destination.buildingname}`
  if (leg.mode === 'WALK') return `Walk ${distance(leg.distance)}${to}`
  if (leg.mode === 'BUS') return `Bus ${leg.route}${to}`
  if (leg.mode === 'SUBWAY' || leg.mode === 'RAIL') return `MRT ${leg.route}${to}`
  if (leg.mode === 'TRAM') return `LRT ${leg.route}${to}`
  return `${leg.mode} ${leg.route}${to}`
}
</script>

<template>
  <!-- The root element. v-show hides it without removing it, so the map is not rebuilt. -->
  <div v-show="visible" class="minimap" :class="{ expanded: mapStore.expanded }" @transitionend="onResized">
    <!-- The element Leaflet draws into. -->
    <div ref="mapEl" class="map"></div>

    <!-- Recentre and expand buttons. -->
    <div class="controls">
      <button type="button" title="Recentre" @click="recentre">◎</button>
      <button type="button" :title="mapStore.expanded ? 'Shrink map' : 'Expand map'"
              @click="mapStore.expanded = !mapStore.expanded">
        {{ mapStore.expanded ? '✕' : '⤢' }}
      </button>
    </div>

    <!-- The text panel with messages and route choices. -->
    <div v-if="showPanel" class="panel">
      <!-- Messages about location. -->
      <p v-if="mapStore.locationError" class="note">{{ mapStore.locationError }}</p>
      <p v-else-if="!mapStore.userPos" class="note">Finding your location…</p>

      <!-- Route messages and the route options for the chosen building. -->
      <template v-if="mapStore.destination">
        <p v-if="mapStore.loadingRoute" class="note">Finding the fastest route…</p>
        <p v-else-if="mapStore.routeError" class="note">{{ mapStore.routeError }}</p>

        <template v-else-if="mapStore.activeRoute">
          <!-- Buttons to choose walking or transit, with the fastest marked. -->
          <div class="modes">
            <button v-for="r in mapStore.routes" :key="r.mode" type="button"
                    :class="{ active: r.mode === mapStore.activeMode }"
                    @click="mapStore.activeMode = r.mode">
              {{ MODE_NAMES[r.mode] }} {{ minutes(r.duration) }}
              <span v-if="r.mode === mapStore.fastest" class="badge">fastest</span>
            </button>
          </div>

          <!-- In the expanded map, step-by-step legs of the active route. -->
          <ol v-if="mapStore.expanded" class="legs">
            <li v-for="(leg, i) in mapStore.activeRoute.legs" :key="i">
              <span class="dot" :style="{ background: MODE_COLOURS[leg.mode] || '#aa3bff' }"></span>
              <span class="leg-text">{{ legText(leg) }}</span>
              <span class="leg-time">{{ minutes(leg.duration) }}</span>
            </li>
          </ol>
        </template>
      </template>
      <p v-else-if="mapStore.routeError" class="note">{{ mapStore.routeError }}</p>
    </div>
  </div>
</template>

/* Scoped CSS: these rules apply only to this component. */
<style scoped>
/* The box fixed to the bottom-right of the screen. */
.minimap {
  position: fixed;
  right: 16px;
  bottom: 16px;
  /* Existing note: above page content. */
  z-index: 1000; /* above page content; Leaflet's own panes go up to ~1000 inside this box */
  width: 300px;
  height: 220px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  text-align: left;
  font-size: 14px;
  transition: width 0.25s ease, height 0.25s ease;
}

/* The enlarged state. */
.minimap.expanded {
  width: min(720px, calc(100vw - 32px));
  height: min(600px, calc(100vh - 32px));
}

/* Existing note below: keeps the map clear of the comparison tray. */
/* Keep the map from covering the comparison actions at the bottom of the page. */
.minimap.with-compare-tray { bottom: 136px; }

/* On a narrow screen the map shrinks, and is hidden while the comparison tray is showing. */
@media (max-width: 480px) {
  .minimap { width: calc(100vw - 32px); height: 200px; }
  .minimap.with-compare-tray { display: none !important; }
}

/* The map area fills the box. */
.map {
  flex: 1;
  min-height: 0;
}

/* The control buttons float over the top-right of the map. */
.controls {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1001;
  display: flex;
  gap: 6px;
}

.controls button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 16px;
  cursor: pointer;
  box-shadow: var(--shadow);
}

/* The text panel under the map. */
.panel {
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  max-height: 45%;
  overflow-y: auto;
}

/* Plain message text. */
.note { color: var(--text); }

/* The mode button row. */
.modes {
  display: flex;
  gap: 6px;
}

.modes button {
  flex: 1;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

/* The chosen mode. */
.modes button.active {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

/* The small "fastest" label. */
.badge {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #16a34a;
  color: #fff;
  font-size: 11px;
}

/* The list of route steps. */
.legs {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.legs li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.legs li:last-child { border-bottom: none; }

/* The coloured dot for the mode. */
.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* Text and time of one step. */
.leg-text {
  flex: 1;
  color: var(--text-h);
}

.leg-time {
  flex: none;
  color: var(--text);
}
</style>

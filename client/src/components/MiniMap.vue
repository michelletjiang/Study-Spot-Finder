<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api'
import { mapStore } from '../stores/map'

// Floating map in the bottom-right corner (mounted once in App.vue).
// Shows the user's location and every building; on a building page it also draws the route there.
// Only visible on routes with meta.showMap, but kept mounted so the map isn't rebuilt on every page change.

const route = useRoute()
const router = useRouter()
const visible = computed(() => !!route.meta.showMap)

const mapEl = ref(null)
const buildings = ref([])

// Leaflet objects stay out of Vue's reactivity (its proxies break Leaflet internals)
let map, userMarker
const buildingLayer = L.layerGroup()
const routeLayer = L.layerGroup()

const SINGAPORE = [1.3521, 103.8198]
const MODE_COLOURS = { WALK: '#6b7280', BUS: '#16a34a', SUBWAY: '#dc2626', RAIL: '#dc2626', TRAM: '#0891b2' }
const dark = window.matchMedia('(prefers-color-scheme: dark)')

onMounted(() => {
  map = L.map(mapEl.value, {
    center: SINGAPORE,
    zoom: 12,
    minZoom: 11,
    maxBounds: [[1.144, 103.535], [1.494, 104.1]], // OneMap only has tiles for Singapore
    zoomControl: false,
  })
  L.tileLayer(`https://www.onemap.gov.sg/maps/tiles/${dark.matches ? 'Night' : 'Default'}/{z}/{x}/{y}.png`, {
    minZoom: 11,
    maxZoom: 19,
    attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:14px;width:14px;vertical-align:middle"> ' +
      '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors &#124; ' +
      '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>',
  }).addTo(map)
  L.control.zoom({ position: 'topleft' }).addTo(map)
  buildingLayer.addTo(map)
  routeLayer.addTo(map)

  mapStore.locate()
  loadBuildings()
  if (mapStore.userPos) drawUser(true)
})

// unmounted on logout, so forget everything about this user's map
onUnmounted(() => {
  mapStore.stopLocating()
  mapStore.clearDestination()
  mapStore.userPos = null
  mapStore.expanded = false
  map.remove()
})

// ---------- buildings ----------

async function loadBuildings() {
  try {
    buildings.value = (await api('/api/buildings')).filter(b => b.lat != null && b.lng != null)
  } catch (e) {
    console.error('Could not load buildings for the map:', e.message)
  }
}

function drawBuildings() {
  buildingLayer.clearLayers()
  for (const b of buildings.value) {
    const isDestination = mapStore.destination?.postal === b.postal
    L.circleMarker([b.lat, b.lng], {
      radius: isDestination ? 9 : 6,
      color: '#fff',
      weight: 2,
      fillColor: isDestination ? '#dc2626' : '#aa3bff',
      fillOpacity: 1,
    })
      .bindTooltip(b.buildingname, { permanent: isDestination, direction: 'top', offset: [0, -8] })
      .on('click', () => router.push('/building/' + encodeURIComponent(b.buildingname)))
      .addTo(buildingLayer)
  }
}

watch(buildings, drawBuildings)

// refresh buildings each time the map comes back into view (an admin may have added one)
watch(visible, isVisible => {
  if (!isVisible) return
  loadBuildings()
  setTimeout(() => map.invalidateSize(), 0) // Leaflet measured a hidden (0×0) container
})

// ---------- user location ----------

function drawUser(centre) {
  const pos = mapStore.userPos
  if (!userMarker) {
    userMarker = L.circleMarker(pos, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 })
      .bindTooltip('You are here')
      .addTo(map)
  } else {
    userMarker.setLatLng(pos)
  }
  if (centre) map.setView(pos, 16)
}

watch(() => mapStore.userPos, (pos, oldPos) => {
  if (!pos || !map) return
  // only jump to the user the first time, so later GPS updates don't fight with panning
  drawUser(!oldPos && !mapStore.destination)
})

function recentre() {
  if (mapStore.activeRoute) fitRoute()
  else if (mapStore.destination) map.setView([mapStore.destination.lat, mapStore.destination.lng], 17)
  else if (mapStore.userPos) map.setView(mapStore.userPos, 16)
}

// ---------- destination + route ----------

watch(() => mapStore.destination, dest => {
  drawBuildings()
  if (dest) map.flyTo([dest.lat, dest.lng], 17, { duration: 0.8 })
  else if (mapStore.userPos) map.flyTo(mapStore.userPos, 16, { duration: 0.8 })
})

function fitRoute() {
  const points = mapStore.activeRoute.legs.flatMap(leg => leg.points)
  map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 17 })
}

watch(() => mapStore.activeRoute, r => {
  routeLayer.clearLayers()
  if (!r) return
  for (const leg of r.legs) {
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

// the panel resizes the map, so re-measure once the CSS transition finishes
function onResized(e) {
  if (e.target !== e.currentTarget) return
  map.invalidateSize()
  recentre()
}

// ---------- panel text ----------

function minutes(seconds) {
  const m = Math.max(1, Math.round(seconds / 60))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

function distance(metres) {
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`
}

const MODE_NAMES = { walk: 'Walk', pt: 'Transit' }

const showPanel = computed(() =>
  !!(mapStore.locationError || !mapStore.userPos || mapStore.destination || mapStore.routeError))

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
  <div v-show="visible" class="minimap" :class="{ expanded: mapStore.expanded }" @transitionend="onResized">
    <div ref="mapEl" class="map"></div>

    <div class="controls">
      <button type="button" title="Recentre" @click="recentre">◎</button>
      <button type="button" :title="mapStore.expanded ? 'Shrink map' : 'Expand map'"
              @click="mapStore.expanded = !mapStore.expanded">
        {{ mapStore.expanded ? '✕' : '⤢' }}
      </button>
    </div>

    <div v-if="showPanel" class="panel">
      <p v-if="mapStore.locationError" class="note">{{ mapStore.locationError }}</p>
      <p v-else-if="!mapStore.userPos" class="note">Finding your location…</p>

      <template v-if="mapStore.destination">
        <p v-if="mapStore.loadingRoute" class="note">Finding the fastest route…</p>
        <p v-else-if="mapStore.routeError" class="note">{{ mapStore.routeError }}</p>

        <template v-else-if="mapStore.activeRoute">
          <div class="modes">
            <button v-for="r in mapStore.routes" :key="r.mode" type="button"
                    :class="{ active: r.mode === mapStore.activeMode }"
                    @click="mapStore.activeMode = r.mode">
              {{ MODE_NAMES[r.mode] }} {{ minutes(r.duration) }}
              <span v-if="r.mode === mapStore.fastest" class="badge">fastest</span>
            </button>
          </div>

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

<style scoped>
.minimap {
  position: fixed;
  right: 16px;
  bottom: 16px;
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

.minimap.expanded {
  width: min(720px, calc(100vw - 32px));
  height: min(600px, calc(100vh - 32px));
}

/* Keep the map from covering the comparison actions at the bottom of the page. */
.minimap.with-compare-tray { bottom: 136px; }

@media (max-width: 480px) {
  .minimap { width: calc(100vw - 32px); height: 200px; }
  .minimap.with-compare-tray { display: none !important; }
}

.map {
  flex: 1;
  min-height: 0;
}

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

.panel {
  padding: 8px 10px;
  border-top: 1px solid var(--border);
  max-height: 45%;
  overflow-y: auto;
}

.note { color: var(--text); }

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

.modes button.active {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.badge {
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #16a34a;
  color: #fff;
  font-size: 11px;
}

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

.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.leg-text {
  flex: 1;
  color: var(--text-h);
}

.leg-time {
  flex: none;
  color: var(--text);
}
</style>

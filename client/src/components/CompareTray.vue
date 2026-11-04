<script setup>
// ACTIVE (comparison): the manila tray that lists the shortlist and links to the comparison page. It shows on every page except /compare.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { comparison } from '../stores/compare'
import { MAX_COMPARISON_SPOTS } from '../stores/compare-selection.js'
import { levelLabel } from '../floors'

const route = useRoute()
const router = useRouter()
const ids = computed(() => comparison.selectedIds.value)
// A message from the store, such as the full-list warning.
const notice = computed(() => comparison.notice.value)
// The store only keeps ids, so the name and place of each picked spot are fetched once and kept here.
const info = ref({})

watch(ids, list => {
  for (const id of list) {
    if (info.value[id]) continue
    info.value = { ...info.value, [id]: { loading: true } }
    // GET /api/spots/:id
    api(`/api/spots/${id}`)
      .then(spot => { info.value = { ...info.value, [id]: spot } })
      .catch(() => { info.value = { ...info.value, [id]: { name: 'Study spot' } } })
  }
}, { immediate: true })

const picked = computed(() => ids.value.map(id => ({ id, ...info.value[id] })))
const where = spot => (spot.buildingName ? `${spot.buildingName} · ${levelLabel(spot.floor)}` : '')
// Empty slots after the picked ones: the 2nd is needed, the 3rd is optional.
const emptySlots = computed(() => Array.from({ length: MAX_COMPARISON_SPOTS - ids.value.length }, (_, i) => ids.value.length + i + 1))
const hint = computed(() => {
  if (ids.value.length < 2) return 'Pick one more spot to compare.'
  if (ids.value.length < MAX_COMPARISON_SPOTS) return 'Add one more, or compare now.'
  return 'All set. Compare them side by side.'
})

// Go to /compare?ids=a,b[,c] but only when at least two spots are chosen.
function compare() { if (comparison.canCompare) router.push({ path: '/compare', query: { ids: ids.value.join(',') } }) }
</script>

<template>
  <aside v-if="ids.length && route.path !== '/compare'" class="compare-tray" aria-label="Selected spots for comparison">
    <span class="tab" aria-hidden="true"><span class="tab-icon">▯▯</span> Compare</span>
    <div class="tray card">
      <div class="summary">
        <!-- Bootstrap's card layout gives the tray a clear summary before its slots. -->
        <h2 aria-live="polite">{{ ids.length }} of {{ MAX_COMPARISON_SPOTS }} picked</h2>
        <!-- The store's notice, for example when a fourth spot is refused. -->
        <p v-if="notice" class="limit" role="status">{{ notice }}</p>
        <p v-else>{{ hint }}</p>
      </div>

      <!-- Vue transitions make adding and removing a shortlist slot feel immediate without changing store behavior. -->
      <TransitionGroup tag="ul" name="tray-slot" class="slots">
        <li v-for="spot in picked" :key="spot.id" class="slot">
          <div class="slot-text">
            <strong :title="spot.name">{{ spot.loading ? 'Loading…' : spot.name }}</strong>
            <small>{{ where(spot) }}</small>
          </div>
          <button type="button" class="nb-icon-btn remove" :aria-label="`Remove ${spot.name || 'this spot'} from the comparison`" @click="comparison.remove(spot.id)">✕</button>
        </li>
        <li v-for="n in emptySlots" :key="`empty-${n}`" class="slot slot--empty">
          + {{ n === 2 ? 'Pick a 2nd spot' : 'Optional 3rd spot' }}
        </li>
      </TransitionGroup>

      <div class="actions">
        <button type="button" class="btn nb-link clear" @click="comparison.clear">Clear</button>
        <button type="button" class="btn nb-btn nb-btn--primary" :disabled="!comparison.canCompare" @click="compare">
          Compare {{ ids.length >= 2 ? `${ids.length} spots` : '' }} →
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.compare-tray {
  position: sticky;
  bottom: 12px;
  z-index: 20;
  width: min(100% - 32px, 1040px);
  margin: 16px auto 0;
  color: #28263f;
  text-align: left;
}

/* The folder tab anchors a Bootstrap card so the comparison tray feels like a notebook pull-out. */
.tab {
  position: relative;
  bottom: -2px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 16px 4px 14px;
  border: 2px solid #28263f;
  border-bottom: none;
  border-radius: 8px 14px 0 0;
  background: var(--nb-manila-dark);
  font-size: 0.82rem;
  font-weight: 700;
}
.tab-icon { font-size: 0.7rem; letter-spacing: -2px; }

.tray {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 18px;
  padding: 14px 16px 14px 18px;
  border: 2px solid #28263f;
  border-radius: 0 10px 10px 10px;
  background: var(--nb-manila-dark);
  box-shadow: 6px 6px 0 var(--nb-shadow);
}

.summary { flex: none; width: 185px; }
.summary h2 { margin: 0; font: 700 1.6rem/1.05 var(--nb-heading); color: #28263f; letter-spacing: 0; white-space: nowrap; }
.summary p { margin: 4px 0 0; font-size: 0.85rem; line-height: 1.35; }
.summary .limit { font-weight: 700; color: var(--nb-error); }

.slots { display: flex; flex: 1 1 460px; gap: 10px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.slot {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 50px;
  padding: 6px 8px 6px 12px;
  border: 2px solid #28263f;
  border-radius: 6px;
  background: #fffef9;
}
.slot-text { display: grid; flex: 1; min-width: 0; }
.slot-text small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* long names wrap to two lines, then end in "…" */
.slot-text strong { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 0.9rem; line-height: 1.2; }
.slot-text small { color: var(--nb-muted); font-size: 0.75rem; }
.slot--empty {
  justify-content: center;
  border: 1.5px dashed #28263f;
  background: rgba(255, 254, 249, 0.35);
  color: var(--nb-muted);
  font-size: 0.85rem;
  font-weight: 700;
}
.remove { width: 30px; height: 30px; border-radius: 7px; font-size: 0.8rem; }
.tray-slot-enter-active, .tray-slot-leave-active { transition: opacity .2s ease, transform .2s ease; }
.tray-slot-enter-from, .tray-slot-leave-to { opacity: 0; transform: scale(.96); }

.actions { display: flex; align-items: center; gap: 14px; margin-left: auto; }
.clear { font-size: 0.9rem; }
.actions .nb-btn { padding: 10px 16px; white-space: nowrap; }

/* On phones the slots stack and the tray sits in the page flow, which keeps 320px screens free of sideways scrolling. */
@media (prefers-reduced-motion: reduce) { .tray-slot-enter-active, .tray-slot-leave-active { transition: none; } }
@media (max-width: 650px) {
  .compare-tray { position: relative; bottom: 0; width: calc(100% - 24px); }
  .slots { flex-direction: column; flex-basis: 100%; }
  .actions { width: 100%; justify-content: space-between; }
}
</style>

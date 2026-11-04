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
const expanded = ref(false)

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
    <!-- The compact bar keeps browsing clear; the selected spot cards appear only on request. -->
    <div class="tray card">
      <div class="summary">
        <span class="tab" aria-hidden="true"><svg class="tab-icon" viewBox="0 0 16 14" focusable="false"><rect x="1" y="2" width="9" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="1" width="9" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg> Compare</span>
        <!-- Bootstrap's card layout keeps the count and primary action available in the compact state. -->
        <h2 aria-live="polite">{{ ids.length }} of {{ MAX_COMPARISON_SPOTS }} picked</h2>
        <p v-if="notice" class="limit" role="status">{{ notice }}</p>
        <p v-else class="hint">{{ hint }}</p>
      </div>
      <div class="compact-actions">
        <button type="button" class="btn nb-link clear" @click="comparison.clear">Clear</button>
        <button type="button" class="btn nb-btn tray-toggle" :aria-expanded="expanded" aria-controls="compare-tray-details" @click="expanded = !expanded">
          {{ expanded ? 'Hide picked' : 'Show picked' }}
        </button>
        <button type="button" class="btn nb-btn nb-btn--primary" :disabled="!comparison.canCompare" @click="compare">Compare {{ ids.length >= 2 ? `${ids.length} spots` : '' }} →</button>
      </div>

      <!-- Vue transitions make the optional shortlist details feel immediate without changing store behavior. -->
      <Transition name="tray-details">
        <div v-if="expanded" id="compare-tray-details" class="tray-details">
          <TransitionGroup tag="ul" name="tray-slot" class="slots">
            <li v-for="spot in picked" :key="spot.id" class="slot">
              <div class="slot-text">
                <strong :title="spot.name">{{ spot.loading ? 'Loading…' : spot.name }}</strong>
                <small>{{ where(spot) }}</small>
              </div>
              <button type="button" class="nb-icon-btn remove" :aria-label="`Remove ${spot.name || 'this spot'} from the comparison`" @click="comparison.remove(spot.id)">✕</button>
            </li>
          </TransitionGroup>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<style scoped>
.compare-tray {
  position: fixed;
  bottom: 12px;
  z-index: 20;
  width: min(100% - 32px, 760px);
  margin: 16px auto 0;
  color: #28263f;
  text-align: left;
}

/* The compact bar keeps the folder treatment but does not cover the page while browsing. */
.tray {
  color: #28263f;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 8px 12px;
  border: 2px solid #28263f;
  border-radius: 10px;
  background: var(--nb-manila-dark);
  box-shadow: 4px 4px 0 var(--nb-shadow);
}
.tab { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 700; }
.tab-icon { width: 16px; height: 14px; flex: none; vertical-align: middle; }
.summary { display: flex; flex: 1 1 auto; align-items: baseline; gap: 8px; min-width: 0; }
.summary h2 { margin: 0; font: 700 1.35rem/1.05 var(--nb-heading); color: #28263f; letter-spacing: 0; white-space: nowrap; }
.summary p { margin: 0; font-size: 0.78rem; line-height: 1.2; }
.summary .limit { font-weight: 700; color: var(--nb-error); }
.compact-actions { display: flex; align-items: center; gap: 8px; }
.clear { padding: 4px 6px; font-size: 0.82rem; }
.tray-toggle { padding: 6px 10px; font-size: 0.82rem; }
.compact-actions .nb-btn--primary { padding: 6px 11px; white-space: nowrap; }
.tray-details { flex-basis: 100%; }
.slots { display: flex; gap: 8px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.slot { color: #28263f; display: flex; flex: 1 1 0; align-items: center; gap: 8px; min-width: 0; min-height: 42px; padding: 5px 7px 5px 10px; border: 2px solid #28263f; border-radius: 6px; background: #fffef9; }
.slot-text { display: grid; flex: 1; min-width: 0; }
.slot-text small { overflow: hidden; color: var(--nb-muted); text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem; }
/* long names wrap to two lines, then end in "…" */
.slot-text strong { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 0.84rem; line-height: 1.15; }
.remove { width: 28px; height: 28px; border-radius: 7px; font-size: 0.75rem; }
.tray-slot-enter-active, .tray-slot-leave-active, .tray-details-enter-active, .tray-details-leave-active { transition: opacity .2s ease, transform .2s ease; }
.tray-slot-enter-from, .tray-slot-leave-to, .tray-details-enter-from, .tray-details-leave-to { opacity: 0; transform: translateY(-4px); }

/* On phones the compact bar stays in flow and the expanded spots stack without sideways scrolling. */
@media (prefers-reduced-motion: reduce) { .tray-slot-enter-active, .tray-slot-leave-active, .tray-details-enter-active, .tray-details-leave-active { transition: none; } }
@media (max-width: 650px) {
  .compare-tray { position: relative; bottom: 0; width: calc(100% - 24px); }
  .summary { flex-basis: 100%; }
  .compact-actions { width: 100%; justify-content: flex-end; }
  .slots { flex-direction: column; }
}
</style>

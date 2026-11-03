<script setup>
// ACTIVE: the reviews the student has reported, newest first, with what an admin decided.
// Each report sits on a sheet with a folder tab naming the reviewed room; waiting ones can still be edited.
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { loadSpotIndex } from '../spotIndex'
import { REPORT_STATUS, reportStatusLabel } from '../reports'
import StarRating from '../components/StarRating.vue'

const reports = ref([])
const error = ref('')
const loading = ref(true)
const filter = ref('') // '' = all, or a status
// finds a review's spot (for the link to its room); null until loaded, or if loading the spots failed
const findSpot = ref(null)

onMounted(async () => {
  try {
    // GET /api/reports/mine, newest first, each with its review (null once an admin removed it).
    reports.value = await api('/api/reports/mine')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
  loadSpotIndex().then(find => (findSpot.value = find)).catch(e => console.error('Could not load spots:', e.message))
})

// one chip per status that has reports, with its count
const chips = computed(() => Object.entries(REPORT_STATUS)
  .map(([status, s]) => ({ status, label: s.short, count: reports.value.filter(r => r.status === status).length }))
  .filter(chip => chip.count))
const shown = computed(() => (filter.value ? reports.value.filter(r => r.status === filter.value) : reports.value))

const spotOf = review => review && findSpot.value?.(review.buildingName, review.roomId)
const sentOn = report => new Date(report.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<template>
  <div class="nb-page">
    <div class="list">
      <RouterLink to="/profile" class="nb-back">‹ Profile</RouterLink>
      <h1 class="nb-title">My reports</h1>
      <p class="nb-subtitle">
        <template v-if="!loading">{{ reports.length }} review{{ reports.length === 1 ? '' : 's' }} reported</template>
        <template v-if="reports.length"> · only you and the admins can see these</template>
      </p>

      <div v-if="chips.length > 1" class="chips" role="group" aria-label="Filter by outcome">
        <button type="button" class="nb-chip" :aria-pressed="!filter" @click="filter = ''">All · {{ reports.length }}</button>
        <button v-for="chip in chips" :key="chip.status" type="button" class="nb-chip" :aria-pressed="filter === chip.status" @click="filter = chip.status">
          {{ chip.label }} · {{ chip.count }}
        </button>
      </div>

      <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
      <p v-if="loading" class="nb-state">Loading your reports…</p>
      <p v-else-if="!reports.length && !error" class="nb-state">
        You haven’t reported any reviews. If a review is wrong, rude or spam, tap <strong>Report</strong> under it on the room’s page.
      </p>

      <article v-for="report in shown" :key="report._id" class="entry">
        <RouterLink v-if="spotOf(report.reviewId)" :to="`/spots/${spotOf(report.reviewId)._id}`" class="nb-folder-tab">
          {{ report.reviewId.buildingName }} · {{ report.reviewId.roomId }} <span aria-hidden="true">›</span>
        </RouterLink>
        <span v-else-if="report.reviewId" class="nb-folder-tab">{{ report.reviewId.buildingName }} · {{ report.reviewId.roomId }}</span>
        <span v-else class="nb-folder-tab">Review removed</span>

        <div class="nb-sheet sheet">
          <p class="head">
            <span class="status" :class="`status--${report.status.toLowerCase()}`">{{ reportStatusLabel(report.status) }}</span>
            <span class="nb-tag nb-tag--loud">{{ report.reason }}</span>
            <span class="date">sent {{ sentOn(report) }}</span>
          </p>

          <blockquote v-if="report.reviewId" class="quoted">
            <p class="quoted-title">{{ report.reviewId.title }} <StarRating :rating="Number(report.reviewId.rating)" /></p>
            <p>{{ report.reviewId.content }}</p>
            <footer>by {{ report.reviewId.userId }}</footer>
          </blockquote>
          <p v-else class="gone">
            {{ report.status === 'Approved' ? 'An admin agreed and removed this review.' : 'This review has since been deleted.' }}
          </p>

          <p class="details"><strong>Your note:</strong> {{ report.description }}</p>

          <div v-if="report.status === 'Pending'" class="actions">
            <RouterLink :to="{ path: `/reports/${report._id}/edit`, query: { back: '/my-reports' } }" class="nb-btn">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
              Edit
            </RouterLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.list { max-width: 760px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: -12px 0 26px; }

.entry { margin-bottom: 30px; }
.nb-folder-tab { font-size: 0.92rem; }
.sheet { padding: 16px 22px 18px; border-radius: 0 8px 8px 8px; }

.head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin: 0 0 12px; }
.date { margin-left: auto; color: var(--nb-muted); font-size: 0.88rem; }
/* the outcome: yellow while waiting, green once removed, plain once kept */
.status { padding: 2px 12px; border: 2px solid #28263f; border-radius: 999px; color: #28263f; font-size: 0.88rem; font-weight: 700; }
.status--pending { background: var(--nb-highlight); }
.status--approved { background: #def3d6; }
.status--declined { border-style: dashed; background: transparent; color: var(--nb-ink); }

.quoted { margin: 0 0 12px; padding: 10px 14px; border-left: 4px solid var(--nb-rule); background: var(--nb-paper); }
.quoted p { margin: 0 0 6px; overflow-wrap: anywhere; white-space: pre-line; }
.quoted-title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font: 700 1.5rem/1.15 var(--nb-heading); }
.quoted-title .stars { font: 1rem/1 system-ui, sans-serif; }
.quoted footer { color: var(--nb-muted); font-size: 0.85rem; }
.gone { margin: 0 0 12px; color: var(--nb-muted); font-style: italic; }
.details { margin: 0; overflow-wrap: anywhere; white-space: pre-line; }

.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--nb-rule-light); }
.actions .nb-btn { padding: 5px 16px; font-size: 0.92rem; }

@media (max-width: 520px) {
  .date { margin-left: 0; width: 100%; }
}
</style>

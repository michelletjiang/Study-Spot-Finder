<script setup>
// ACTIVE (admin only): the moderation queue of reported reviews.
import { ref, onMounted } from 'vue'
import { api } from '../api'
import AdminTabs from '../components/AdminTabs.vue'

// The pending reports, each with its review filled in.
const reports = ref([])
const error = ref('')
const loading = ref(true)

async function load() {
  try {
    // GET /api/reports/pending (admin only).
    reports.value = await api('/api/reports/pending')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Approve or decline one report.
async function resolve(report, action) {
  // Approving deletes the reported review, so ask first.
  if (action === 'approve' && !confirm('Approve this report? The review will be deleted.')) return
  try {
    // POST /api/reports/:id/approve or /decline.
    await api(`/api/reports/${report._id}/${action}`, { method: 'POST' })
    await load() // other reports on the same review are closed too, so refetch
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="nb-page">
    <AdminTabs />

    <h1 class="nb-title">Reports</h1>
    <p class="nb-subtitle">
      <template v-if="!loading">{{ reports.length }} review{{ reports.length === 1 ? '' : 's' }} waiting for a decision</template>
    </p>

    <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="loading" class="nb-state">Loading reports…</p>
    <p v-else-if="!reports.length && !error" class="nb-state">Nothing to check. No one has reported a review.</p>

    <template v-else>
      <div class="nb-table-wrap">
        <table class="nb-table report-table">
          <thead>
            <tr><th>Review</th><th>Reason</th><th>Details</th><th>Reported by</th><th><span class="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            <!-- A review that was deleted in the meantime shows a placeholder. -->
            <tr v-for="report in reports" :key="report._id">
              <td class="review" data-label="Review">
                <template v-if="report.reviewId">
                  <q>{{ report.reviewId.content }}</q>
                  <small>by {{ report.reviewId.userId }}</small>
                </template>
                <em v-else class="muted">(review deleted)</em>
              </td>
              <td data-label="Reason"><span class="nb-tag nb-tag--loud">{{ report.reason }}</span></td>
              <td class="details" data-label="Details">{{ report.description || '–' }}</td>
              <td data-label="Reported by">{{ report.reportedBy }}</td>
              <td data-label="Actions">
                <div class="nb-actions">
                  <button type="button" class="nb-btn nb-btn--danger" @click="resolve(report, 'approve')">Delete review</button>
                  <button type="button" class="nb-btn" @click="resolve(report, 'decline')">Keep review</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note"><strong>Delete review</strong> agrees with the report and removes the review. <strong>Keep review</strong> closes the report and leaves the review up.</p>
    </template>
  </div>
</template>

<style scoped>
.nb-table-wrap { max-width: 1140px; }
.review { min-width: 240px; max-width: 380px; }
.review q { display: block; }
.review small, .muted { color: var(--nb-muted); }
.details { max-width: 280px; }
.note { max-width: 1140px; margin: 16px 0 0; color: var(--nb-muted); font-size: 0.92rem; }
/* Phones: one card per report, each value labelled, so nothing runs off the screen. */
@media (max-width: 650px) {
  .report-table thead {
    display: none;
  }
  .report-table,
  .report-table tbody,
  .report-table tr,
  .report-table td {
    min-width: 0;
    max-width: none;
    display: block;
    width: 100%;
  }
  .report-table tr {
    margin-bottom: 12px;
    border: 1px solid var(--accent-border);
    border-radius: 8px;
    padding: 6px 0;
  }
  .report-table td {
    border-bottom: none;
    padding: 4px 12px;
  }
  .report-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 0.8em;
    font-weight: 600;
    opacity: 0.75;
  }
}

</style>

<script setup>
// ACTIVE (admin only): the moderation queue of reported reviews.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// The shared JSON helper.
import { api } from '../api'

// Existing note: lists pending reports.
// Pending review reports (replaces admin-reports.ejs)
// The pending reports.
const reports = ref([])
// A message to show on failure.
const error = ref('')
// True while loading.
const loading = ref(true)

// Fetch the pending reports.
async function load() {
  try {
    // GET /api/reports/pending (admin only), each with its review filled in.
    reports.value = await api('/api/reports/pending')
  } catch (e) {
    error.value = e.message
  // Always stop the loading state.
  } finally {
    loading.value = false
  }
}

// Load when the page appears.
onMounted(load)

// Approve or decline one report.
async function resolve(report, action) {
  // Approving deletes the reported review, so ask first.
  if (action === 'approve' && !confirm('Approve this report? The review will be deleted.')) return
  try {
    // POST /api/reports/:id/approve or /decline.
    await api(`/api/reports/${report._id}/${action}`, { method: 'POST' })
    // Existing note: refetch because other reports on the same review are closed too.
    await load() // other reports on the same review are closed too, so refetch
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <!-- Page title. -->
  <h2>Pending Reports</h2>
  <!-- Error message. -->
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="loading">Loading...</p>
  <p v-else-if="reports.length === 0">No pending reports</p>
  <!-- The wrapper scrolls sideways on wide tables; on phones each row becomes a card (see the styles below). -->
  <div v-else class="report-table-wrap">
    <table class="report-table">
      <!-- The table header row. -->
      <thead>
        <tr>
          <th>Review</th><th>Review By</th><th>Report Reason</th><th>Report Description</th><th>Reported By</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <!-- One row per report. A review that was deleted shows a placeholder. data-label names the column on phones. -->
        <tr v-for="report in reports" :key="report._id">
          <td data-label="Review">{{ report.reviewId ? report.reviewId.content : '(review deleted)' }}</td>
          <td data-label="Review by">{{ report.reviewId ? report.reviewId.userId : '(review deleted)' }}</td>
          <td data-label="Reason">{{ report.reason }}</td>
          <td data-label="Description">{{ report.description }}</td>
          <td data-label="Reported by">{{ report.reportedBy }}</td>
          <!-- The two action buttons for the row. -->
          <td data-label="Actions">
            <div class="report-actions">
              <button @click="resolve(report, 'approve')">Approve (delete review)</button>
              <button class="secondary" @click="resolve(report, 'decline')">Decline</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Wide screens: a normal table that can scroll sideways inside its box instead of widening the page. */
.report-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}
.report-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.report-table th,
.report-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--accent-border);
  vertical-align: top;
  overflow-wrap: anywhere;
}
.report-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Phones: one card per report, each value labelled, so nothing runs off the screen. */
@media (max-width: 650px) {
  .report-table thead {
    display: none;
  }
  .report-table,
  .report-table tbody,
  .report-table tr,
  .report-table td {
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

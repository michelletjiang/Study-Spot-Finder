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
  <table v-else border="1" cellpadding="5">
    <!-- The table header row. -->
    <tr>
      <th>Review</th><th>Review By</th><th>Report Reason</th><th>Report Description</th><th>Reported By</th><th></th>
    </tr>
    <!-- One row per report. A review that was deleted shows a placeholder. -->
    <tr v-for="report in reports" :key="report._id">
      <td>{{ report.reviewId ? report.reviewId.content : '(review deleted)' }}</td>
      <td>{{ report.reviewId ? report.reviewId.userId : '(review deleted)' }}</td>
      <td>{{ report.reason }}</td>
      <td>{{ report.description }}</td>
      <td>{{ report.reportedBy }}</td>
      <!-- The two action buttons for the row. -->
      <td>
        <button @click="resolve(report, 'approve')">Approve (delete review)</button>
        <button @click="resolve(report, 'decline')">Decline</button>
      </td>
    </tr>
  </table>
</template>

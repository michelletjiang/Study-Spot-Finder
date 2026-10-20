<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'

// Pending review reports (replaces admin-reports.ejs)
const reports = ref([])
const error = ref('')
const loading = ref(true)

async function load() {
  try {
    reports.value = await api('/api/reports/pending')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function resolve(report, action) {
  if (action === 'approve' && !confirm('Approve this report? The review will be deleted.')) return
  try {
    await api(`/api/reports/${report._id}/${action}`, { method: 'POST' })
    await load() // other reports on the same review are closed too, so refetch
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <h2>Pending Reports</h2>
  <p v-if="error" style="color: red">{{ error }}</p>
  <p v-if="loading">Loading...</p>
  <p v-else-if="reports.length === 0">No pending reports</p>
  <table v-else border="1" cellpadding="5">
    <tr>
      <th>Review</th><th>Review By</th><th>Report Reason</th><th>Report Description</th><th>Reported By</th><th></th>
    </tr>
    <tr v-for="report in reports" :key="report._id">
      <td>{{ report.reviewId ? report.reviewId.content : '(review deleted)' }}</td>
      <td>{{ report.reviewId ? report.reviewId.userId : '(review deleted)' }}</td>
      <td>{{ report.reason }}</td>
      <td>{{ report.description }}</td>
      <td>{{ report.reportedBy }}</td>
      <td>
        <button @click="resolve(report, 'approve')">Approve (delete review)</button>
        <button @click="resolve(report, 'decline')">Decline</button>
      </td>
    </tr>
  </table>
</template>

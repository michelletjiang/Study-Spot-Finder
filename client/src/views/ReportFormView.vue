<script setup>
// ACTIVE: form to report a review, or to edit your own report.
// ref makes a changing value, computed derives one, onMounted runs when the page appears.
import { ref, computed, onMounted } from 'vue'
// useRoute reads the URL, useRouter navigates.
import { useRoute, useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'

// Existing note: two routes share this one form.
// New: /reviews/:reviewId/report   Edit: /reports/:id/edit
// (replaces new-report.ejs, report-outcome.ejs and edit-report.ejs)
// The current route.
const route = useRoute()
// The router.
const router = useRouter()
// True when the URL has a report id, meaning we are editing.
const isEdit = computed(() => !!route.params.id)

// The reasons a student can pick. The server accepts the same list.
const REASONS = ['Inaccurate', 'Offensive', 'Spam', 'Other']
// The review being reported.
const review = ref(null)
// The form fields.
const form = ref({ reason: 'Inaccurate', description: '' })
// Existing note: the saved report, shown after sending.
const sent = ref(null) // the saved report, shown as the "outcome" after submitting
// A message to show on failure.
const error = ref('')
// True while sending.
const saving = ref(false)

// Run once when the page appears.
onMounted(async () => {
  try {
    // Editing: load the report (with its review).
    if (isEdit.value) {
      // GET /api/reports/:id.
      const report = await api(`/api/reports/${route.params.id}`)
      review.value = report.reviewId // populated by the server
      form.value = { reason: report.reason, description: report.description }
    } else {
      // Reporting: load the review (GET /api/reviews/:id).
      review.value = await api(`/api/reviews/${route.params.reviewId}`)
    }
  } catch (e) {
    error.value = e.message
  }
})

// Called when the form is submitted.
async function submit() {
  error.value = ''
  saving.value = true
  try {
    // Editing sends PUT /api/reports/:id, reporting sends POST /api/reports with the review id.
    sent.value = isEdit.value
      ? await api(`/api/reports/${route.params.id}`, { method: 'PUT', body: form.value })
      : await api('/api/reports', { method: 'POST', body: { ...form.value, reviewId: route.params.reviewId } })
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Error message. -->
  <p v-if="error" style="color: red">{{ error }}</p>

  <!-- after submitting -->
  <!-- Shown after sending. -->
  <template v-if="sent">
    <h2>Report {{ isEdit ? 'updated' : 'sent' }} successfully!</h2>
    Review: {{ review?.content || '(review deleted)' }}<br>
    Reason for report: {{ sent.reason }}<br>
    Description: {{ sent.description }}<br>
    <template v-if="!isEdit"><RouterLink :to="`/reports/${sent._id}/edit`">Edit</RouterLink> | </template>
    <RouterLink to="/">Back to Home</RouterLink>
  </template>

  <!-- the form -->
  <!-- Shown before sending. -->
  <template v-else>
    <h1>{{ isEdit ? 'Edit Report' : 'Report Review' }}</h1>
    <p>Review: {{ review ? review.content : '(review deleted)' }}</p>
    <!-- prevent stops the normal form post and calls submit() instead. -->
    <form @submit.prevent="submit">
      <label>Reason
        <!-- Reason drop-down. -->
        <select v-model="form.reason">
          <option v-for="r in REASONS" :key="r">{{ r }}</option>
        </select>
      </label><br><br>
      <label>Description<br><textarea v-model="form.description" required></textarea></label><br><br>
      <button :disabled="saving">Submit Report</button>
      <button type="button" @click="router.back()">Cancel</button>
    </form>
  </template>
</template>

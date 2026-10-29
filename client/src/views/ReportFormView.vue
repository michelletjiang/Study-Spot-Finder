<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

// New: /reviews/:reviewId/report   Edit: /reports/:id/edit
// (replaces new-report.ejs, report-outcome.ejs and edit-report.ejs)
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const REASONS = ['Inaccurate', 'Offensive', 'Spam', 'Other']
const review = ref(null)
const form = ref({ reason: 'Inaccurate', description: '' })
const sent = ref(null) // the saved report, shown as the "outcome" after submitting
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    if (isEdit.value) {
      const report = await api(`/api/reports/${route.params.id}`)
      review.value = report.reviewId // populated by the server
      form.value = { reason: report.reason, description: report.description }
    } else {
      review.value = await api(`/api/reviews/${route.params.reviewId}`)
    }
  } catch (e) {
    error.value = e.message
  }
})

async function submit() {
  error.value = ''
  saving.value = true
  try {
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
  <p v-if="error" style="color: red">{{ error }}</p>

  <!-- after submitting -->
  <template v-if="sent">
    <h2>Report {{ isEdit ? 'updated' : 'sent' }} successfully!</h2>
    Review: {{ review?.content || '(review deleted)' }}<br>
    Reason for report: {{ sent.reason }}<br>
    Description: {{ sent.description }}<br>
    <template v-if="!isEdit"><RouterLink :to="`/reports/${sent._id}/edit`">Edit</RouterLink> | </template>
    <RouterLink to="/">Back to Home</RouterLink>
  </template>

  <!-- the form -->
  <template v-else>
    <h1>{{ isEdit ? 'Edit Report' : 'Report Review' }}</h1>
    <p>Review: {{ review ? review.content : '(review deleted)' }}</p>
    <form @submit.prevent="submit">
      <label>Reason
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

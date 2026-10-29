<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

// Add:  /spots/:spotId/reviews/new   Edit: /reviews/:id/edit   (replaces add-review.ejs and update-review.ejs)
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const spotLabel = ref('')
const form = ref({ title: '', content: '', rating: 3 })
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    if (isEdit.value) {
      const review = await api(`/api/reviews/${route.params.id}`)
      form.value = { title: review.title, content: review.content, rating: review.rating }
      spotLabel.value = `${review.buildingName}, ${review.roomId}`
    } else {
      const spot = await api(`/api/spots/${route.params.spotId}`)
      spotLabel.value = `${spot.buildingName}, ${spot.name}`
    }
  } catch (e) {
    error.value = e.message
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit.value) {
      await api(`/api/reviews/${route.params.id}`, { method: 'PUT', body: form.value })
      router.push(route.query.back || '/my-reviews')
    } else {
      await api('/api/reviews', { method: 'POST', body: { ...form.value, spotId: route.params.spotId } })
      router.push(`/spots/${route.params.spotId}`)
    }
  } catch (e) {
    error.value = e.message // e.g. 403 "You can only edit your own reviews"
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <h3>{{ isEdit ? 'Update Review' : 'Add a Review' }}</h3>
  <p v-if="spotLabel">For: {{ spotLabel }}</p>
  <form @submit.prevent="save">
    <label>Title <input v-model="form.title" required></label><br>
    <label>Content <textarea v-model="form.content" required></textarea></label><br>
    <label>Rating <input v-model.number="form.rating" type="number" min="1" max="5" required></label><br>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="saving">{{ isEdit ? 'Update' : 'Add' }} Review</button>
    <button type="button" @click="router.back()">Cancel</button>
  </form>
</template>

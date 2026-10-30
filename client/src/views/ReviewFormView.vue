<script setup>
// ACTIVE: form to write a review or edit your own.
// ref makes a changing value, computed derives one, onMounted runs when the page appears.
import { ref, computed, onMounted } from 'vue'
// useRoute reads the URL, useRouter navigates.
import { useRoute, useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'

// Existing note: two routes share this one form.
// Add:  /spots/:spotId/reviews/new   Edit: /reviews/:id/edit   (replaces add-review.ejs and update-review.ejs)
// The current route.
const route = useRoute()
// The router.
const router = useRouter()
// True when the URL has a review id, meaning we are editing.
const isEdit = computed(() => !!route.params.id)

// Text such as "Building, Room" showing which spot this review is for.
const spotLabel = ref('')
// The form fields. The rating starts at 3.
const form = ref({ title: '', content: '', rating: 3 })
// A message to show on failure.
const error = ref('')
// True while saving.
const saving = ref(false)

// Run once when the page appears.
onMounted(async () => {
  try {
    // Editing: load the existing review (GET /api/reviews/:id).
    if (isEdit.value) {
      const review = await api(`/api/reviews/${route.params.id}`)
      form.value = { title: review.title, content: review.content, rating: review.rating }
      spotLabel.value = `${review.buildingName}, ${review.roomId}`
    } else {
      // Adding: load the spot to show its name (GET /api/spots/:id).
      const spot = await api(`/api/spots/${route.params.spotId}`)
      spotLabel.value = `${spot.buildingName}, ${spot.name}`
    }
  } catch (e) {
    error.value = e.message
  }
})

// Called when the form is submitted.
async function save() {
  error.value = ''
  saving.value = true
  try {
    if (isEdit.value) {
      // PUT /api/reviews/:id. Only the author may edit.
      await api(`/api/reviews/${route.params.id}`, { method: 'PUT', body: form.value })
      // Go back to where the student came from.
      router.push(route.query.back || '/my-reviews')
    } else {
      // POST /api/reviews with the spot id.
      await api('/api/reviews', { method: 'POST', body: { ...form.value, spotId: route.params.spotId } })
      // Go to the spot's detail page.
      router.push(`/spots/${route.params.spotId}`)
    }
  } catch (e) {
    // Existing note: for example a 403 for someone else's review.
    error.value = e.message // e.g. 403 "You can only edit your own reviews"
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Heading changes between add and edit. -->
  <h3>{{ isEdit ? 'Update Review' : 'Add a Review' }}</h3>
  <p v-if="spotLabel">For: {{ spotLabel }}</p>
  <!-- prevent stops the normal form post and calls save() instead. -->
  <form @submit.prevent="save">
    <label>Title <input v-model="form.title" required></label><br>
    <label>Content <textarea v-model="form.content" required></textarea></label><br>
    <!-- Rating from 1 to 5, as a number. -->
    <label>Rating <input v-model.number="form.rating" type="number" min="1" max="5" required></label><br>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="saving">{{ isEdit ? 'Update' : 'Add' }} Review</button>
    <button type="button" @click="router.back()">Cancel</button>
  </form>
</template>

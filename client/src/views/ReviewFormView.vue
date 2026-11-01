<script setup>
// ACTIVE: form to write a review or edit your own, on a taped sheet with a star picker.
// Add:  /spots/:spotId/reviews/new   Edit: /reviews/:id/edit   (replaces add-review.ejs and update-review.ejs)
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

const route = useRoute()
const router = useRouter()
// True when the URL has a review id, meaning we are editing.
const isEdit = computed(() => !!route.params.id)

const MAX_LENGTH = 500
const RATING_WORDS = ['', 'Not good', 'Okay', 'Good', 'Really good', 'Excellent']

// "Building · Room", showing which spot this review is for.
const spotLabel = ref('')
// The form fields. The rating starts at 3.
const form = ref({ title: '', content: '', rating: 3 })
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    if (isEdit.value) {
      // Editing: load the existing review (GET /api/reviews/:id).
      const review = await api(`/api/reviews/${route.params.id}`)
      form.value = { title: review.title, content: review.content, rating: review.rating }
      spotLabel.value = `${review.buildingName} · ${review.roomId}`
    } else {
      // Adding: load the spot to show its name (GET /api/spots/:id).
      const spot = await api(`/api/spots/${route.params.spotId}`)
      spotLabel.value = `${spot.buildingName} · ${spot.name}`
    }
  } catch (e) {
    error.value = e.message
  }
})

// where Back and Cancel go: the page that sent us here, else My reviews (editing) or the room (adding)
const backTo = computed(() => route.query.back || (isEdit.value ? '/my-reviews' : `/spots/${route.params.spotId}`))
const backLabel = computed(() => (backTo.value === '/my-reviews' ? 'My reviews' : 'Back to the room'))

async function save() {
  error.value = ''
  if (!form.value.title.trim() || !form.value.content.trim()) {
    error.value = 'Please give your review a title and say something about the room.'
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      // PUT /api/reviews/:id. Only the author may edit.
      await api(`/api/reviews/${route.params.id}`, { method: 'PUT', body: form.value })
      router.push(backTo.value)
    } else {
      // POST /api/reviews with the spot id, then show the room with the new review.
      await api('/api/reviews', { method: 'POST', body: { ...form.value, spotId: route.params.spotId } })
      router.push(`/spots/${route.params.spotId}`)
    }
  } catch (e) {
    // e.g. 403 "You can only edit your own reviews"
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="nb-page">
    <RouterLink :to="backTo" class="nb-back">‹ {{ backLabel }}</RouterLink>
    <h1 class="nb-title">{{ isEdit ? 'Edit your review' : 'Write a review' }}</h1>
    <p v-if="spotLabel" class="for">for <span class="nb-folder-tab">{{ spotLabel }}</span></p>

    <form class="nb-sheet nb-form-sheet sheet" novalidate @submit.prevent="save">
      <div class="nb-tape" aria-hidden="true"></div>

      <fieldset class="rating">
        <legend class="nb-label">Your rating</legend>
        <div class="stars">
          <!-- five radio buttons drawn as stars: arrow keys move between them -->
          <label v-for="n in 5" :key="n" class="star" :class="{ on: n <= form.rating }">
            <input v-model.number="form.rating" type="radio" name="rating" :value="n">
            <svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
              <path d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.1l-5.7 3 1.2-6.3-4.6-4.4 6.3-.8Z" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
            <span class="visually-hidden">{{ n }} star{{ n === 1 ? '' : 's' }}</span>
          </label>
          <span class="rating-word" aria-hidden="true">{{ form.rating }}/5 · {{ RATING_WORDS[form.rating] }}</span>
        </div>
      </fieldset>

      <div class="nb-field">
        <label for="title">Title</label>
        <input id="title" v-model="form.title" class="nb-input" maxlength="80" required>
      </div>

      <div class="nb-field">
        <label for="content">Your review</label>
        <textarea id="content" v-model="form.content" class="nb-input lined" rows="6" :maxlength="MAX_LENGTH" required
                  aria-describedby="content-hint"></textarea>
        <div class="hint-row">
          <small id="content-hint" class="nb-hint">Tip: mention noise, sockets, wifi or how busy it gets.</small>
          <small class="nb-hint" aria-live="polite">{{ form.content.length }} / {{ MAX_LENGTH }}</small>
        </div>
      </div>

      <p v-if="error" class="nb-errors single" role="alert">{{ error }}</p>

      <div class="nb-form-actions">
        <button type="submit" class="nb-btn nb-btn--primary" :disabled="saving">
          {{ saving ? 'Saving…' : isEdit ? 'Save review' : 'Post review' }}
        </button>
        <RouterLink :to="backTo" class="nb-cancel">Cancel</RouterLink>
      </div>
    </form>
  </div>
</template>

<style scoped>
.for { display: flex; align-items: flex-end; gap: 10px; margin: 6px 0 0 0; color: var(--nb-ink); }

.sheet { max-width: 680px; transform: rotate(-0.3deg); }

.rating { margin: 0 0 18px; padding: 0; border: none; }
.rating legend { float: none; margin-bottom: 6px; font-size: 1rem; }
.stars { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.star { position: relative; cursor: pointer; }
.star input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.star svg { display: block; fill: transparent; stroke: var(--nb-ink); transition: transform 0.1s; }
.star.on svg { fill: #f5b82e; }
.star:hover svg { transform: scale(1.1); }
.star:has(input:focus-visible) { outline: 3px solid var(--nb-focus); outline-offset: 2px; border-radius: 6px; }
.rating-word { margin-left: 14px; font: 700 1.7rem/1 var(--nb-heading); }

/* notebook lines inside the review box, lined up with the text */
.lined {
  resize: vertical;
  line-height: 1.9rem;
  padding-top: 6px;
  background-image: repeating-linear-gradient(transparent 0 calc(1.9rem - 1px), var(--nb-rule-light) calc(1.9rem - 1px) 1.9rem);
  background-position: 0 6px;
  background-attachment: local;
}
.hint-row { display: flex; justify-content: space-between; gap: 12px; }


@media (max-width: 600px) {
  .sheet { transform: none; }
  .rating-word { flex-basis: 100%; margin-left: 0; }
}
</style>

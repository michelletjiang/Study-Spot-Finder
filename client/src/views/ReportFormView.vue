<script setup>
// ACTIVE: report a review (/reviews/:reviewId/report), or edit your own report (/reports/:id/edit).
// The reported review is shown beside the form; after sending, the page shows what was sent and links back to the room.
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { loadSpotIndex } from '../spotIndex'
import StarRating from '../components/StarRating.vue'

const route = useRoute()
const isEdit = computed(() => !!route.params.id)

// The reasons a student can pick. The server accepts the same keys (controllers/report-controller.js).
const REASONS = [
  { key: 'Inaccurate', hint: 'Wrong facts about the room, like sockets that aren’t there.', placeholder: 'What does the review get wrong?' },
  { key: 'Offensive', hint: 'Rude, hateful or a personal attack.', placeholder: 'What makes it offensive?' },
  { key: 'Spam', hint: 'Ads, nonsense or the same review posted again.', placeholder: 'Why does it look like spam?' },
  { key: 'Other', hint: 'Something else. Tell us below.', placeholder: 'What’s the problem with this review?' },
]
const MAX_LENGTH = 300

const review = ref(null)   // the review being reported, or null if it was deleted
const status = ref('Pending') // an edited report that an admin has decided on can't be changed
const form = ref({ reason: 'Inaccurate', description: '' })
const sent = ref(null)     // the saved report, shown after sending
const loaded = ref(false)
const loadError = ref('') // the review or report couldn't be loaded
const error = ref('')      // the report couldn't be sent
const saving = ref(false)
const roomLink = ref('/')  // the reported review's room, once found
// where Back and Cancel go: My reports when the student came from there, otherwise the review's room
const fromMyReports = computed(() => route.query.back === '/my-reports')
const backTo = computed(() => (fromMyReports.value ? '/my-reports' : roomLink.value))

const placeholder = computed(() => REASONS.find(r => r.key === form.value.reason)?.placeholder)
const locked = computed(() => isEdit.value && status.value !== 'Pending')
const reviewDate = computed(() => review.value &&
  new Date(review.value.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }))

// Both routes use this page, so going from "Report sent" to "Edit report" keeps the same page open:
// start over whenever the address changes, not only when the page first appears.
watch(() => route.fullPath, load, { immediate: true })

async function load() {
  sent.value = null
  review.value = null
  status.value = 'Pending'
  form.value = { reason: 'Inaccurate', description: '' }
  loaded.value = false
  loadError.value = error.value = ''
  try {
    if (isEdit.value) {
      // GET /api/reports/:id (with its review filled in)
      const report = await api(`/api/reports/${route.params.id}`)
      review.value = report.reviewId
      status.value = report.status
      form.value = { reason: report.reason, description: report.description }
    } else {
      // GET /api/reviews/:id
      review.value = await api(`/api/reviews/${route.params.reviewId}`)
    }
  } catch (e) {
    loadError.value = e.message
  } finally {
    loaded.value = true
  }
  // Reviews point at their room by building + name, so look the room up for the back link.
  if (review.value) {
    roomLink.value = `/building/${review.value.buildingName}`
    loadSpotIndex()
      .then(find => {
        const spot = find(review.value.buildingName, review.value.roomId)
        if (spot) roomLink.value = `/spots/${spot._id}`
      })
      .catch(e => console.error('Could not load spots:', e.message))
  }
}

async function submit() {
  error.value = ''
  if (!form.value.description.trim()) {
    error.value = 'Please say a little about what’s wrong, so an admin can check it.'
    return
  }
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
  <div class="nb-page">
    <RouterLink :to="backTo" class="nb-back">‹ {{ fromMyReports ? 'My reports' : 'Back to the room' }}</RouterLink>

    <!-- after sending -->
    <template v-if="sent">
      <h1 class="nb-title">Report {{ isEdit ? 'updated' : 'sent' }}</h1>
      <p class="nb-subtitle">Thanks for keeping the reviews useful. An admin will take a look.</p>

      <section class="nb-sheet sent" aria-labelledby="sent-title">
        <div class="nb-tape" aria-hidden="true"></div>
        <p class="tick" aria-hidden="true">✓</p>
        <h2 id="sent-title">What you sent</h2>
        <dl>
          <div><dt>Review</dt><dd>{{ review ? `“${review.title || review.content}”` : '(review deleted)' }}</dd></div>
          <div><dt>Reason</dt><dd><span class="nb-tag nb-tag--loud">{{ sent.reason }}</span></dd></div>
          <div><dt>Details</dt><dd class="details">{{ sent.description }}</dd></div>
          <div><dt>Status</dt><dd>Waiting for an admin</dd></div>
        </dl>
        <div class="nb-form-actions">
          <RouterLink :to="backTo" class="nb-btn nb-btn--primary">{{ fromMyReports ? 'Back to my reports' : 'Back to the room' }}</RouterLink>
          <RouterLink v-if="!fromMyReports" to="/my-reports" class="nb-cancel">See all my reports</RouterLink>
          <RouterLink v-if="!isEdit" :to="`/reports/${sent._id}/edit`" class="nb-cancel">Edit report</RouterLink>
        </div>
      </section>
    </template>

    <!-- the form -->
    <template v-else>
      <h1 class="nb-title">{{ isEdit ? 'Edit your report' : 'Report a review' }}</h1>
      <p class="nb-subtitle">Reports are private. The reviewer won’t see who sent it.</p>

      <p v-if="!loaded" class="nb-state">Loading the review…</p>
      <p v-else-if="loadError" class="nb-state nb-state--error" role="alert">{{ loadError }}</p>

      <div v-else class="layout">
        <form class="nb-sheet nb-form-sheet sheet" novalidate @submit.prevent="submit">
          <div class="nb-tape" aria-hidden="true"></div>

          <p v-if="locked" class="nb-state locked">
            An admin has already {{ status === 'Approved' ? 'agreed with this report and removed the review' : 'looked at this report and kept the review' }},
            so it can’t be changed.
          </p>

          <fieldset class="reasons" :disabled="locked">
            <legend class="nb-label">What’s wrong with it?</legend>
            <label v-for="r in REASONS" :key="r.key" class="reason">
              <input v-model="form.reason" type="radio" name="reason" :value="r.key">
              <span class="reason-text">
                <strong>{{ r.key }}</strong>
                <small>{{ r.hint }}</small>
              </span>
            </label>
          </fieldset>

          <div class="nb-field">
            <label for="description">Details</label>
            <textarea id="description" v-model="form.description" class="nb-input" rows="4" :maxlength="MAX_LENGTH"
                      :placeholder="placeholder" :disabled="locked" required aria-describedby="description-count"></textarea>
            <small id="description-count" class="nb-hint count" aria-live="polite">{{ form.description.length }} / {{ MAX_LENGTH }}</small>
          </div>

          <p v-if="error" class="nb-errors single" role="alert">{{ error }}</p>

          <div class="nb-form-actions">
            <button v-if="!locked" type="submit" class="nb-btn nb-btn--primary" :disabled="saving">
              {{ saving ? 'Sending…' : isEdit ? 'Save report' : 'Send report' }}
            </button>
            <RouterLink :to="backTo" class="nb-cancel">{{ locked ? 'Back' : 'Cancel' }}</RouterLink>
          </div>
        </form>

        <aside class="reported-wrap">
          <p class="nb-preview-label">The review you’re reporting</p>
          <article v-if="review" class="nb-sheet nb-review reported">
            <h2 class="nb-review-title">{{ review.title }} <StarRating :rating="Number(review.rating)" /></h2>
            <p>{{ review.content }}</p>
            <p class="byline">by {{ review.userId }} · {{ reviewDate }}<br>{{ review.buildingName }} · {{ review.roomId }}</p>
          </article>
          <p v-else class="nb-state">This review has been deleted.</p>
        </aside>

        <section class="nb-note nb-note--blue next" aria-labelledby="next-title">
            <span class="nb-pin" aria-hidden="true"></span>
            <h2 id="next-title">What happens next</h2>
            <p>An admin reads your report. If they agree, the review is removed. If not, it stays up.</p>
            <p>You can edit your report until an admin has looked at it.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* the form on the left; the reported review and the "what happens next" note stacked on the right */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 620px) minmax(260px, 380px);
  grid-template-areas: 'form review' 'form next';
  grid-template-rows: auto 1fr;
  gap: 28px 40px;
  align-items: start;
}
.sheet { grid-area: form; }
.reported-wrap { grid-area: review; display: grid; gap: 10px; }
.next { grid-area: next; }
.sheet { transform: rotate(-0.3deg); }
.locked { max-width: none; margin-bottom: 18px; }

/* the reasons: radio buttons drawn as cards, picked one goes yellow */
.reasons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0 0 20px; padding: 0; border: none; }
.reasons legend { float: none; grid-column: 1 / -1; margin-bottom: 8px; font-size: 1rem; }
.reason {
  position: relative;
  display: block;
  padding: 10px 14px;
  border: 2px solid var(--nb-ink);
  border-radius: 10px;
  background: var(--nb-input);
  cursor: pointer;
}
.reason:has(input:checked) { background: var(--nb-highlight); box-shadow: 3px 3px 0 var(--nb-ink); }
.reason:has(input:focus-visible) { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
.reasons:disabled .reason { opacity: 0.6; cursor: default; }
.reason input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.reason-text { display: grid; gap: 2px; color: #28263f; }
.reason-text small { color: #4a4660; font-size: 0.82rem; line-height: 1.35; }
.count { justify-self: end; }

.reported { transform: rotate(0.6deg); }
.reported > p { overflow-wrap: anywhere; }
.reported .byline { margin: 0; color: var(--nb-muted); font-size: 0.85rem; }
.next p { font-size: 0.95rem; }

/* after sending */
.sent { max-width: 620px; padding: 28px 30px 26px; transform: rotate(-0.3deg); }
.tick {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: 0 0 10px;
  border: 2px solid var(--nb-ink);
  border-radius: 50%;
  background: var(--nb-seats-plenty);
  color: #28263f;
  font-size: 1.5rem;
  font-weight: 700;
}
.sent h2 { margin: 0 0 10px; font: 700 2rem/1.1 var(--nb-heading); color: var(--nb-ink); }
.sent dl { margin: 0 0 22px; }
.sent dl > div { display: grid; grid-template-columns: 90px 1fr; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--nb-rule-light); }
.sent dt { font-weight: 700; }
.sent dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.sent .details { white-space: pre-line; }

/* narrow screens: the review first, then the form, then the note */
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; grid-template-areas: 'review' 'form' 'next'; grid-template-rows: none; }
}
@media (max-width: 520px) {
  .reasons { grid-template-columns: 1fr; }
}
</style>

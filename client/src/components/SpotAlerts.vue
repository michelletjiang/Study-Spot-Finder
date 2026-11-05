<script setup>
import { ref, watch } from 'vue'
import { api } from '../api'
import { auth } from '../stores/auth'
import { ALERT_TYPES, alertLabel, alertIcon } from '../alerts'
import { timeAgo } from '../reviews'

// Crowd-sourced issues for one room, shown in the floor plan's room panel.
// Anyone can confirm ("still happening") or dispute ("not anymore"); the reporter or an admin can mark it fixed.
// Emits 'change' with the room's active alerts whenever they load or change, so the floor plan can update its markers.
const props = defineProps({ spot: { type: Object, required: true } })
const emit = defineEmits(['change'])

const alerts = ref([])
const loading = ref(true)
const loadError = ref('')
const message = ref('')
const busy = ref(false)

// the "Report an issue" form
const formOpen = ref(false)
const formTypes = ref([]) // several issues can be reported at once
const formText = ref('')

function setAlerts(list) {
  alerts.value = list
  emit('change', list)
}

// reload when another room is picked; ignore answers for a room that's no longer shown
watch(() => props.spot._id, id => {
  alerts.value = []
  loading.value = true
  loadError.value = message.value = ''
  closeForm()
  api(`/api/alerts/spot/${id}`)
    .then(data => { if (props.spot._id === id) setAlerts(data) })
    .catch(e => { if (props.spot._id === id) loadError.value = e.message })
    .finally(() => { if (props.spot._id === id) loading.value = false })
}, { immediate: true })

function closeForm() {
  formOpen.value = false
  formTypes.value = []
  formText.value = ''
}

// runs one request for the current room, showing its error (e.g. the 30 min cooldown) in the message line
async function run(request) {
  busy.value = true
  message.value = ''
  const id = props.spot._id
  try {
    const data = await request()
    if (props.spot._id === id) return data
  } catch (e) {
    if (props.spot._id === id) message.value = e.message
  } finally {
    busy.value = false
  }
}

async function submit() {
  if (!formTypes.value.length) {
    message.value = 'Pick at least one issue.'
    return
  }
  const data = await run(() => api(`/api/alerts/spot/${props.spot._id}`, {
    method: 'POST',
    body: { types: formTypes.value, description: formText.value },
  }))
  if (!data) return
  // merged: someone already reported that issue, so the server counted it as a confirm instead
  const updated = new Map(data.results.filter(r => r.merged).map(r => [r.alert._id, r.alert]))
  const created = data.results.filter(r => !r.merged).map(r => r.alert)
  setAlerts([...created, ...alerts.value.map(a => updated.get(a._id) || a)])
  message.value = [
    created.length ? `Thanks! Others in this room will see your alert${created.length === 1 ? '' : 's'}.` : '',
    data.message || '',
  ].filter(Boolean).join(' ')
  closeForm()
}

// sending the same vote again removes it (the server toggles)
async function vote(alert, choice) {
  const data = await run(() => api(`/api/alerts/${alert._id}/vote`, { method: 'POST', body: { vote: choice } }))
  if (!data) return
  setAlerts(data.stillActive
    ? alerts.value.map(a => (a._id === alert._id ? data.alert : a))
    : alerts.value.filter(a => a._id !== alert._id)) // enough people said it's over, so it's hidden
}

async function resolve(alert) {
  const data = await run(() => api(`/api/alerts/${alert._id}/resolve`, { method: 'PATCH' }))
  if (data) setAlerts(alerts.value.filter(a => a._id !== alert._id))
}
</script>

<template>
  <section class="alerts" aria-live="polite" :aria-label="`Reported issues for ${spot.name}`">
    <p v-if="loading" class="muted">Checking for reported issues…</p>
    <p v-else-if="loadError" class="muted">Couldn't load reported issues.</p>

    <article v-for="alert in alerts" :key="alert._id" class="alert">
      <p class="alert-head">
        <span aria-hidden="true">{{ alertIcon(alert.type) }}</span>
        <strong>{{ alertLabel(alert.type) }}</strong>
        <span class="muted">· {{ timeAgo(alert.createdAt) }}</span>
      </p>
      <p v-if="alert.description" class="desc">{{ alert.description }}</p>
      <div class="votes">
        <button type="button" :aria-pressed="alert.myVote === 'confirm'" :disabled="busy" @click="vote(alert, 'confirm')">
          Still happening · {{ alert.confirmCount }}
        </button>
        <button type="button" :aria-pressed="alert.myVote === 'dispute'" :disabled="busy" @click="vote(alert, 'dispute')">
          Not anymore · {{ alert.disputeCount }}
        </button>
        <button v-if="alert.isMine || auth.isAdmin" type="button" class="fixed" :disabled="busy" @click="resolve(alert)">
          Mark fixed
        </button>
      </div>
    </article>

    <form v-if="formOpen" class="report-form" @submit.prevent="submit">
      <fieldset>
        <legend>What's wrong? <span class="muted">(pick all that apply)</span></legend>
        <label v-for="t in ALERT_TYPES" :key="t.key" class="type" :class="{ chosen: formTypes.includes(t.key) }">
          <input v-model="formTypes" type="checkbox" :value="t.key">
          <span aria-hidden="true">{{ t.icon }}</span> {{ t.label }}
        </label>
      </fieldset>
      <label class="details">
        Details <span class="muted">(optional)</span>
        <textarea v-model="formText" rows="2" maxlength="300" placeholder="e.g. Door's locked for a CCA event until 6pm"></textarea>
      </label>
      <div class="form-actions">
        <button type="submit" class="nb-btn nb-btn--primary" :disabled="busy">Post alert</button>
        <button type="button" class="nb-btn" @click="closeForm">Cancel</button>
      </div>
    </form>
    <div v-else-if="!loading" class="report-row">
      <span v-if="!alerts.length" class="muted all-clear"><span class="ok" aria-hidden="true">✓</span> Nothing reported</span>
      <button type="button" class="report" @click="formOpen = true; message = ''">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3 2.5 20h19ZM12 10v4.5M12 17.2v.3" /></svg>
        Report an issue
      </button>
    </div>

    <p v-if="message" class="note">{{ message }}</p>
  </section>
</template>

<style scoped>
.alerts { display: grid; gap: 8px; font-size: 0.88rem; }
.alerts p { margin: 0; }

.alert {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 2px solid var(--nb-error);
  border-radius: 6px;
  background: var(--nb-note-pink);
  color: #28263f;
}
.alert-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; }
.alert .muted { color: #4a4660; }
.desc { overflow-wrap: anywhere; }

.votes { display: flex; flex-wrap: wrap; gap: 5px; }
.votes button, .report {
  padding: 1px 9px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-card);
  color: var(--nb-ink);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.votes button:hover, .votes button[aria-pressed='true'] { background: var(--nb-highlight); color: #28263f; }
.votes .fixed { border-style: dashed; }
button:disabled { opacity: 0.6; cursor: default; }

.report-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; }
/* a real button: red ink, solid outline and a hard shadow, unlike the plain noise line above it */
.report {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 2px solid var(--nb-error);
  border-radius: 8px;
  background: var(--nb-sheet);
  color: var(--nb-error);
  font-size: 0.88rem;
  font-weight: 700;
  box-shadow: 2px 2px 0 var(--nb-error);
  transition: transform 0.1s, box-shadow 0.1s;
}
.report svg { fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.report:hover { background: var(--nb-note-pink); color: #8a2430; transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--nb-error); }
.all-clear { display: inline-flex; align-items: center; gap: 6px; }
.ok { display: grid; place-items: center; width: 18px; height: 18px; border: 1.5px solid #28263f; border-radius: 50%; background: var(--nb-seats-plenty); color: #28263f; font-size: 0.7rem; font-weight: 700; }

.report-form {
  display: grid;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px dashed var(--nb-ink);
  border-radius: 6px;
  background: var(--nb-paper);
}
fieldset { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; padding: 0; border: none; }
legend { margin-bottom: 6px; font-weight: 700; }
.type {
  padding: 1px 9px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-card);
  font-size: 0.8rem;
  cursor: pointer;
}
.type.chosen { background: var(--nb-highlight); color: #28263f; }
.type:focus-within { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
.type input { position: absolute; opacity: 0; pointer-events: none; } /* the pill itself is the checkbox */
legend .muted { font-weight: 400; }
.details { display: grid; gap: 4px; font-weight: 700; }
.details .muted { font-weight: 400; }
textarea {
  padding: 6px 8px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 6px;
  background: var(--nb-input);
  color: var(--nb-ink);
  font: inherit;
  font-weight: 400;
  resize: vertical;
}
.form-actions { display: flex; gap: 8px; }
.form-actions .nb-btn { padding: 5px 12px; border-radius: 8px; font-size: 0.88rem; }

.muted { color: var(--nb-muted); }
.note { color: var(--nb-muted); font-size: 0.82rem; }

button:focus-visible, textarea:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

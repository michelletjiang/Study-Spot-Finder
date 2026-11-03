<script setup>
// ACTIVE: the profile page for students and admins, drawn as a notebook page:
// a "student card" with the account details, a sticky note for admin requests,
// three folders (favourites, reviews, reports) with a peek at what's inside, and the study preferences with
// the top picks they give.
// Admins see the pending admin requests on the sticky note instead.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'
import { reportStatusLabel } from '../reports'
import StudyPreferences from '../components/StudyPreferences.vue'
import TopPicks from '../components/TopPicks.vue'

const router = useRouter()

// The profile from the server.
const user = ref(null)
// The user's latest admin request, if any.
const adminRequest = ref(null)
// For admins: the requests waiting for a decision.
const pendingRequests = ref([])
// The user's reviews, newest first (only used for the folder's count and peek).
const reviews = ref(null)
// The reviews the user has reported, newest first (only used for the folder's count and peek).
const reports = ref(null)
// The saved study preferences, shared by the preferences sheet and the top picks.
const prefs = ref(null)
const error = ref('')
const requesting = ref(false)

async function load() {
  try {
    // GET /api/profile returns the user and their latest admin request.
    const data = await api('/api/profile')
    user.value = data.user
    adminRequest.value = data.adminRequest
    // The role may have changed since login (an admin approved the request).
    auth.user = data.user
    if (auth.isAdmin) pendingRequests.value = await api('/api/admin-requests')
  } catch (e) {
    error.value = e.message
  }
}

// The folders are extras: if these fail, the folder just leaves out its count.
async function loadFolders() {
  favourites.load().catch(e => console.error('Could not load favourites:', e.message))
  try {
    reviews.value = await api('/api/reviews/mine')
  } catch (e) {
    console.error('Could not load reviews:', e.message)
  }
  try {
    reports.value = await api('/api/reports/mine')
  } catch (e) {
    console.error('Could not load reports:', e.message)
  }
}

async function loadPreferences() {
  try {
    prefs.value = await api('/api/profile/preferences')
  } catch (e) {
    console.error('Could not load preferences:', e.message)
  }
}

onMounted(() => {
  load()
  loadFolders()
  loadPreferences()
})

const initial = computed(() => user.value?.username?.[0]?.toLowerCase() || '?')
const memberSince = computed(() => user.value &&
  new Date(user.value.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }))
const schools = computed(() => [].concat(user.value?.school || []))

// what's written on the paper peeking out of each folder
const favouritesPeek = computed(() => favourites.list.slice(0, 2).map(f => f.spotName).join(' · '))
const reviewsPeek = computed(() => {
  const latest = reviews.value?.[0]
  if (!latest) return ''
  const stars = '★'.repeat(Math.round(latest.rating)) + '☆'.repeat(5 - Math.round(latest.rating))
  return `${stars} “${latest.title || latest.content}”`
})

const reportsPeek = computed(() => {
  const latest = reports.value?.[0]
  return latest ? `${latest.reason} · ${reportStatusLabel(latest.status)}` : ''
})
const waitingReports = computed(() => reports.value?.filter(r => r.status === 'Pending').length ?? 0)

// A student asks to become an admin.
async function requestAdmin() {
  requesting.value = true
  try {
    adminRequest.value = await api('/api/admin-requests', { method: 'POST' })
  } catch (e) {
    error.value = e.message
  } finally {
    requesting.value = false
  }
}

// An admin approves or denies a request.
async function processRequest(req, action) {
  try {
    await api(`/api/admin-requests/${req._id}/${action}`, { method: 'POST' })
    pendingRequests.value = pendingRequests.value.filter(r => r._id !== req._id)
  } catch (e) {
    error.value = e.message
  }
}

async function deleteAccount() {
  if (!confirm('Delete your account? This cannot be undone.')) return
  try {
    await api('/api/profile', { method: 'DELETE' })
    auth.user = null
    router.push('/login')
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="nb-page">
    <p v-if="error" class="nb-state nb-state--error" role="alert">{{ error }}</p>
    <p v-if="!user && !error" class="nb-state">Loading your profile…</p>

    <template v-if="user">
      <h1 class="nb-title">Hi, {{ user.username }}</h1>
      <p class="nb-subtitle intro">Your account, your favourite spots, and the reviews you’ve written and reported.</p>

      <div class="layout">
        <!-- the account details, as an ID card taped to the page -->
        <section class="id-card" aria-labelledby="card-title">
          <div class="nb-tape" aria-hidden="true"></div>
          <header>
            <span class="nb-avatar" aria-hidden="true">{{ initial }}</span>
            <h2 id="card-title">{{ auth.isAdmin ? 'Admin card' : 'Student card' }}</h2>
          </header>
          <dl>
            <div><dt>Username</dt><dd>{{ user.username }}</dd></div>
            <div><dt>Email</dt><dd class="email">{{ user.email }}</dd></div>
            <div>
              <dt>School</dt>
              <dd class="schools">
                <span v-for="sch in schools" :key="sch" class="pill">{{ sch }}</span>
                <span v-if="!schools.length" class="muted">Not set</span>
              </dd>
            </div>
            <div><dt>Account</dt><dd>{{ user.role }}</dd></div>
            <div><dt>Member since</dt><dd>{{ memberSince }}</dd></div>
          </dl>
          <RouterLink to="/profile/edit" class="nb-btn nb-btn--primary">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
            </svg>
            Edit profile
          </RouterLink>
        </section>

        <div class="side">
          <!-- sticky note: the student's admin request, or the requests an admin has to decide on -->
          <section v-if="auth.isAdmin" class="nb-note note" aria-labelledby="note-title">
            <span class="nb-pin" aria-hidden="true"></span>
            <h2 id="note-title">Admin requests</h2>
            <p v-if="!pendingRequests.length">No one is waiting for a decision.</p>
            <ul v-else class="requests">
              <li v-for="req in pendingRequests" :key="req._id">
                <span><strong>{{ req.username }}</strong> · {{ new Date(req.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) }}</span>
                <span class="request-actions">
                  <button type="button" class="nb-btn nb-btn--small" @click="processRequest(req, 'approve')">Approve</button>
                  <button type="button" class="nb-btn nb-btn--small" @click="processRequest(req, 'deny')">Deny</button>
                </span>
              </li>
            </ul>
          </section>
          <section v-else class="nb-note note" aria-labelledby="note-title">
            <span class="nb-pin" aria-hidden="true"></span>
            <template v-if="adminRequest?.status === 'Pending'">
              <h2 id="note-title">Admin request: pending</h2>
              <p>An admin will review it soon. You can keep using Study Spots as a student in the meantime.</p>
            </template>
            <template v-else>
              <h2 id="note-title">{{ adminRequest?.status === 'Denied' ? 'Admin request: denied' : 'Help run Study Spots?' }}</h2>
              <p v-if="adminRequest?.status === 'Denied'">Your last request wasn’t approved. You can ask again.</p>
              <p v-else>Admins can add buildings and spots and handle reports.</p>
              <button type="button" class="nb-btn nb-btn--small" :disabled="requesting" @click="requestAdmin">Request admin access</button>
            </template>
          </section>

          <div class="folders">
            <RouterLink to="/favourites" class="nb-folder folder">
              <span class="nb-folder-paper" aria-hidden="true">{{ favouritesPeek }}</span>
              <span class="nb-folder-front">
                <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="#f5a0a6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                </svg>
                <span class="folder-title">Favourite spots</span>
                <span class="count">{{ favourites.list.length }} saved</span>
                <span class="open">Open folder →</span>
              </span>
            </RouterLink>
            <RouterLink to="/my-reviews" class="nb-folder folder">
              <span class="nb-folder-paper" aria-hidden="true">{{ reviewsPeek }}</span>
              <span class="nb-folder-front">
                <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" fill="#ffe58a" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                </svg>
                <span class="folder-title">My reviews</span>
                <span class="count">{{ reviews ? `${reviews.length} written` : '…' }}</span>
                <span class="open">Open folder →</span>
              </span>
            </RouterLink>
            <RouterLink to="/my-reports" class="nb-folder folder">
              <span class="nb-folder-paper" aria-hidden="true">{{ reportsPeek }}</span>
              <span class="nb-folder-front">
                <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="#f5a0a6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
                </svg>
                <span class="folder-title">My reports</span>
                <span class="count">
                  <template v-if="!reports">…</template>
                  <template v-else>{{ reports.length }} sent<template v-if="waitingReports"> · {{ waitingReports }} waiting</template></template>
                </span>
                <span class="open">Open folder →</span>
              </span>
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-if="prefs" class="layout lower">
        <StudyPreferences v-model="prefs" />
        <TopPicks :prefs="prefs" />
      </div>

      <section class="danger" aria-labelledby="delete-title">
        <div>
          <h2 id="delete-title">Delete account</h2>
          <p>Removes your profile, favourites and reviews for good. You’ll be asked to confirm.</p>
        </div>
        <button type="button" class="nb-btn nb-btn--danger" @click="deleteAccount">Delete my account</button>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* colours, buttons, the sticky note, tape and the initial circle come from the notebook section of style.css */
.intro { margin-bottom: 32px; }

.id-card h2 { margin: 0; font: 700 2rem/1.1 var(--nb-heading); color: inherit; }

.layout {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  gap: 48px;
  align-items: start;
}

/* preferences on the left, top picks on the right */
.lower { grid-template-columns: minmax(300px, 460px) 1fr; margin-top: 48px; }

/* ---------- student card ---------- */
.id-card {
  position: relative;
  padding: 20px 22px 24px;
  background: var(--nb-sheet);
  border: 2px solid var(--nb-ink);
  border-radius: 3px;
  box-shadow: 6px 6px 0 var(--nb-ink);
  transform: rotate(-0.8deg);
}
.id-card header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 -22px 14px;
  padding: 0 22px 12px;
  border-bottom: 2px solid var(--nb-pink);
}

dl { margin: 0 0 22px; }
dl > div {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 10px;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid var(--nb-rule-light); /* ruled lines, like the notebook */
}
dt { font-weight: 700; }
dd { margin: 0; min-width: 0; }
.email { overflow-wrap: anywhere; }
.schools { display: flex; flex-wrap: wrap; gap: 4px; }
.pill {
  padding: 0 10px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  background: var(--nb-highlight);
  color: #28263f;
  font-size: 0.82rem;
  font-weight: 700;
}
.muted { color: var(--nb-muted); }

/* ---------- sticky note ---------- */
.side { display: grid; gap: 36px; min-width: 0; }
.note { max-width: 420px; }
.note .nb-btn { margin-top: 12px; }
.requests { display: grid; gap: 8px; margin: 10px 0 0; padding: 0; list-style: none; }
.requests li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1.5px dashed rgba(40, 38, 63, 0.35);
}
.request-actions { display: flex; gap: 6px; }
.request-actions .nb-btn { margin-top: 0; }

/* ---------- folders ---------- */
/* three folders side by side; they wrap on narrower screens */
.folders {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
}
/* the folder look comes from style.css (nb-folder) */
.folder { min-height: 230px; }
.folder:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 3px; }
.folder-title { margin-top: 8px; font: 700 1.8rem/1.05 var(--nb-heading); }
.count { color: #5e5a73; }
.open { margin-top: auto; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }

/* ---------- delete account ---------- */
.danger {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 2px dashed var(--nb-rule-light);
}
.danger h2 { margin: 0; color: inherit; font: inherit; font-size: 1.05rem; font-weight: 700; }
.danger p { margin: 4px 0 0; color: var(--nb-muted); font-size: 0.92rem; }

@media (max-width: 820px) {
  .layout { grid-template-columns: 1fr; gap: 36px; }
  .id-card { transform: none; }
  dl > div { grid-template-columns: 110px 1fr; }
}
</style>

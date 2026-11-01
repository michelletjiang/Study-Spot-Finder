<script setup>
// ACTIVE: form to change username, email and optionally password, drawn like the profile page:
// a "Your details" card, plus sticky notes about logging in and the user's admin request.
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'

const router = useRouter()

// The form fields. The passwords start blank (blank keeps the current password).
const form = ref({ username: '', email: '', password: '', confirm: '' })
const adminRequest = ref(null)
const loaded = ref(false)
const showPassword = ref(false)
// A list of error messages.
const errors = ref([])
const saving = ref(false)

onMounted(async () => {
  try {
    // GET /api/profile to fill the form.
    const data = await api('/api/profile')
    form.value = { username: data.user.username, email: data.user.email, password: '', confirm: '' }
    adminRequest.value = data.adminRequest
    loaded.value = true
  } catch (e) {
    errors.value = [e.message]
  }
})

const initial = computed(() => form.value.username?.[0]?.toLowerCase() || auth.user?.username?.[0]?.toLowerCase() || '?')

// the same rules the server checks, so mistakes show before saving
function check() {
  const problems = []
  if (form.value.username.trim().length < 5) problems.push('Username must be at least 5 characters.')
  if (form.value.password && form.value.password.length < 8) problems.push('Password must be at least 8 characters.')
  if (form.value.password !== form.value.confirm) problems.push('The new passwords don’t match.')
  return problems
}

async function save() {
  errors.value = check()
  if (errors.value.length) return
  saving.value = true
  try {
    // PUT /api/profile. A blank password keeps the old one.
    const { username, email, password } = form.value
    const { user } = await api('/api/profile', { method: 'PUT', body: { username, email, password } })
    auth.user = user // NavBar shows the new username straight away
    router.push('/profile')
  } catch (e) {
    // Show the list of errors from the server, or the single message.
    errors.value = e.data?.errors || [e.message]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="edit-page">
    <RouterLink to="/profile" class="back">‹ Back to profile</RouterLink>
    <h1>Edit profile</h1>

    <div class="layout">
      <form class="details" novalidate @submit.prevent="save">
        <div class="nb-tape" aria-hidden="true"></div>
        <header>
          <span class="nb-avatar" aria-hidden="true">{{ initial }}</span>
          <h2>Your details</h2>
        </header>

        <p v-if="!loaded && !errors.length" class="muted">Loading your details…</p>
        <template v-else>
          <div class="field">
            <label for="username">Username</label>
            <input id="username" v-model="form.username" autocomplete="username" aria-describedby="username-hint">
            <small id="username-hint">Shown on your reviews. At least 5 characters.</small>
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="form.email" type="email" autocomplete="email" aria-describedby="email-hint">
            <small id="email-hint">You’ll log in with this email.</small>
          </div>

          <fieldset>
            <legend>Change password <span class="muted">(optional)</span></legend>
            <p class="muted">Leave these blank to keep your current password.</p>
            <div class="field">
              <label for="password">New password</label>
              <div class="with-button">
                <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                       autocomplete="new-password" aria-describedby="password-hint">
                <button type="button" class="nb-btn" :aria-pressed="showPassword" @click="showPassword = !showPassword">
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <small id="password-hint">At least 8 characters.</small>
            </div>
            <div class="field">
              <label for="confirm">Confirm new password</label>
              <input id="confirm" v-model="form.confirm" :type="showPassword ? 'text' : 'password'" autocomplete="new-password">
            </div>
          </fieldset>
        </template>

        <ul v-if="errors.length" class="errors" role="alert">
          <li v-for="err in errors" :key="err">{{ err }}</li>
        </ul>

        <div class="actions">
          <button type="submit" class="nb-btn nb-btn--primary" :disabled="saving || !loaded">{{ saving ? 'Saving…' : 'Save changes' }}</button>
          <RouterLink to="/profile" class="cancel">Cancel</RouterLink>
        </div>
      </form>

      <aside class="notes">
        <section class="nb-note">
          <span class="nb-pin" aria-hidden="true"></span>
          <h2>Heads up</h2>
          <p>Changing your email changes how you log in. Your favourites and reviews stay with your account.</p>
        </section>
        <!-- only for students who have asked to become an admin -->
        <section v-if="!auth.isAdmin && adminRequest" class="nb-note nb-note--pink">
          <span class="nb-pin nb-pin--right" aria-hidden="true"></span>
          <h2>Admin request</h2>
          <p v-if="adminRequest.status === 'Pending'">Still pending. Editing your profile won’t affect it.</p>
          <p v-else-if="adminRequest.status === 'Denied'">Your last request wasn’t approved. You can ask again from your profile.</p>
          <p v-else>Approved.</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* colours, buttons, sticky notes, tape and the initial circle come from the notebook section of style.css */
.edit-page {
  max-width: 1240px;
  padding: 18px 24px 140px 48px; /* left clears the pink margin line, bottom clears the minimap */
  color: var(--nb-ink);
  text-align: left;
}

.back { color: var(--nb-ink); font-weight: 700; text-decoration: none; }
.back:hover { text-decoration: underline; }

h1 {
  margin: 20px 0 28px;
  font: 700 clamp(2.6rem, 6vw, 3.6rem)/1.05 var(--nb-heading);
  color: var(--nb-ink);
}
.details h2 { margin: 0; font: 700 2rem/1.1 var(--nb-heading); color: inherit; }

.layout {
  display: grid;
  grid-template-columns: minmax(300px, 620px) minmax(240px, 360px);
  gap: 48px;
  align-items: start;
}

/* ---------- the form card ---------- */
.details {
  position: relative;
  padding: 20px 26px 26px;
  background: var(--nb-sheet);
  border: 2px solid var(--nb-ink);
  border-radius: 3px;
  box-shadow: 6px 6px 0 var(--nb-ink);
  transform: rotate(-0.4deg);
}
.details header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 -26px 18px;
  padding: 0 26px 12px;
  border-bottom: 2px solid var(--nb-pink);
}

.field { display: grid; gap: 6px; margin-bottom: 18px; }
label { font-weight: 700; }
input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 2px solid var(--nb-ink);
  border-radius: 10px;
  background: var(--nb-input);
  color: var(--nb-ink);
  font: inherit;
}
input:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
small { color: var(--nb-muted); font-size: 0.85rem; }
.muted { color: var(--nb-muted); font-weight: 400; }

fieldset {
  margin: 6px 0 22px;
  padding: 10px 18px 2px;
  border: 1.5px dashed var(--nb-ink);
  border-radius: 8px;
}
legend { float: none; width: auto; margin: 0; padding: 0 6px; font-size: 1rem; font-weight: 700; }
fieldset > p { margin: 0 0 14px; font-size: 0.92rem; }
.with-button { display: flex; gap: 10px; }
.with-button input { flex: 1; min-width: 0; }
.with-button .nb-btn { flex: none; }

.back:focus-visible, .cancel:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 3px; }
.actions { display: flex; align-items: center; gap: 22px; }
.cancel { color: var(--nb-ink); font-weight: 700; text-underline-offset: 3px; }

.errors {
  margin: 0 0 18px;
  padding: 10px 14px 10px 32px;
  border: 2px solid var(--nb-error);
  border-radius: 8px;
  color: var(--nb-error);
}

.notes { display: grid; gap: 36px; }

@media (max-width: 820px) {
  .edit-page { padding-left: 16px; padding-right: 16px; }
  .layout { grid-template-columns: 1fr; gap: 36px; }
  .details { transform: none; padding: 18px 18px 22px; }
  .details header { margin: 0 -18px 18px; padding: 0 18px 12px; }
}
</style>

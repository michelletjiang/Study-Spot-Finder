<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import AuthPage from '../components/AuthPage.vue'

const router = useRouter()

const SCHOOLS = [
  { code: 'LKCSB', name: 'Lee Kong Chian School of Business' },
  { code: 'SCIS', name: 'School of Computing and Information Systems' },
  { code: 'SOSS', name: 'School of Social Sciences' },
  { code: 'SOA', name: 'School of Accountancy' },
  { code: 'SOE', name: 'School of Economics' },
  { code: 'YPHSL', name: 'Yong Pung How School of Law' },
  { code: 'CIS', name: 'College of Integrative Studies' },
]
const MAX_SCHOOLS = 2

const form = ref({ username: '', email: '', password: '', school: [] })
const showPassword = ref(false)
const errors = ref([])
const saving = ref(false)

// once two schools are picked, the others can't be ticked until one is unticked
const schoolsFull = computed(() => form.value.school.length >= MAX_SCHOOLS)

async function register() {
  // Clear old validation feedback before checking the next submission.
  errors.value = []
  // Disable the form to prevent duplicate account requests.
  saving.value = true
  try {
    // Send the exact fields and school codes expected by the Express API.
    await api('/api/register', { method: 'POST', body: form.value })
    // Registration does not log in automatically, so continue to the public login page.
    await router.push({ name: 'login', query: { registered: '1' } })
  } catch (e) {
    // Render structured validation and duplicate-account errors as readable list items.
    errors.value = e.data?.errors || [e.message]
  } finally {
    // Allow a correction or retry after the request has settled.
    saving.value = false
  }
}
</script>

<template>
  <AuthPage title="Create an account">
    <template #hero>
      <p class="auth-headline">Start your <mark class="nb-mark">study spot</mark> notebook.</p>
      <ol class="auth-notes" aria-label="How it works">
        <li class="nb-note"><span class="num">1</span>Pick a building</li>
        <li class="nb-note nb-note--pink"><span class="num">2</span>Flip to a floor</li>
        <li class="nb-note nb-note--blue"><span class="num">3</span>Find your room</li>
      </ol>
    </template>

    <form novalidate @submit.prevent="register">
      <div class="nb-field">
        <label for="username">Username</label>
        <input id="username" v-model="form.username" class="nb-input" autocomplete="username" aria-describedby="username-hint">
        <small id="username-hint" class="nb-hint">Shown on your reviews. At least 5 characters.</small>
      </div>
      <div class="nb-field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" class="nb-input" type="email" autocomplete="email" aria-describedby="email-hint">
        <small id="email-hint" class="nb-hint">You’ll log in with this email.</small>
      </div>
      <div class="nb-field">
        <label for="password">Password</label>
        <div class="nb-with-button">
          <input id="password" v-model="form.password" class="nb-input" :type="showPassword ? 'text' : 'password'"
                 autocomplete="new-password" aria-describedby="password-hint">
          <button type="button" class="nb-btn" :aria-pressed="showPassword" @click="showPassword = !showPassword">
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <small id="password-hint" class="nb-hint">At least 8 characters.</small>
      </div>

      <fieldset class="schools">
        <legend>
          <span><strong>Your school</strong> <span class="muted">(pick up to {{ MAX_SCHOOLS }})</span></span>
          <span class="count" aria-live="polite">{{ form.school.length }} of {{ MAX_SCHOOLS }}</span>
        </legend>
        <div class="chips">
          <!-- each pill is a real checkbox, so keyboards and screen readers work as usual -->
          <label v-for="s in SCHOOLS" :key="s.code" class="chip"
                 :class="{ on: form.school.includes(s.code), off: schoolsFull && !form.school.includes(s.code) }">
            <input v-model="form.school" type="checkbox" :value="s.code"
                   :disabled="schoolsFull && !form.school.includes(s.code)">
            <span class="tick" aria-hidden="true">✓</span>{{ s.name }}
          </label>
        </div>
      </fieldset>

      <ul v-if="errors.length" class="nb-errors" :class="{ single: errors.length === 1 }" role="alert">
        <li v-for="err in errors" :key="err">{{ err }}</li>
      </ul>
      <button type="submit" class="nb-btn nb-btn--primary wide" :disabled="saving">
        {{ saving ? 'Creating your account…' : 'Create account' }}
      </button>
    </form>

    <template #footer>Already have an account? <RouterLink to="/login">Log in</RouterLink></template>
  </AuthPage>
</template>

<style scoped>
.auth-notes { margin: 0; padding: 0; list-style: none; }
.muted { color: var(--nb-muted); font-weight: 400; }
.wide { width: 100%; margin-top: 4px; padding-top: 10px; padding-bottom: 10px; }

.schools { margin: 4px 0 18px; padding: 0; border: none; min-width: 0; }
legend {
  float: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  margin: 0 0 10px;
  padding: 0;
  font-size: 1rem;
}
.count {
  flex: none;
  padding: 0 9px;
  border: 1.5px solid var(--nb-ink);
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border: 1.5px dashed var(--nb-ink);
  border-radius: 999px;
  font-size: 0.9rem;
  cursor: pointer;
}
/* the checkbox itself is hidden; the pill shows its state */
.chip input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.chip .tick { display: none; }
.chip.on { border: 2px solid #28263f; background: var(--nb-highlight); color: #28263f; font-weight: 700; box-shadow: 3px 3px 0 var(--nb-ink); }
.chip.on .tick { display: inline; }
.chip.off { opacity: 0.45; cursor: default; }
.chip:has(input:focus-visible) { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

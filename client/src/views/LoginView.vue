<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'
import AuthPage from '../components/AuthPage.vue'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

async function login() {
  // Remove the previous message before validating this submission.
  error.value = ''
  // Disable the submit control while the server processes the credentials.
  loading.value = true
  try {
    // The API helper sends the existing Express session cookie protocol.
    const { user } = await api('/api/login', { method: 'POST', body: { email: email.value, password: password.value } })
    // Store only the safe session user returned by the server.
    auth.user = user
    // Return to the requested deep link, or take a new user to the home page.
    await router.push(route.query.redirect || '/')
  } catch (e) {
    // Show a safe API message without exposing a raw response or secret.
    error.value = e.message
  } finally {
    // Re-enable the form after both success and failure.
    loading.value = false
  }
}
</script>

<template>
  <AuthPage title="Welcome back">
    <template #hero>
      <p class="auth-headline">Find a quiet spot <mark class="nb-mark">before</mark> you walk over.</p>
      
      <!-- a small picture of what's inside: a building folder and a room's card (decoration only) -->
      <div class="preview" aria-hidden="true">
        <div class="mini-folder">
          <div class="mini-paper"><span>L2</span><span>L3</span><span>L4</span></div>
          <div class="mini-front">
            <strong>Li Ka Shing Library</strong>
            <small>4 floors · 51 study spots</small>
          </div>
        </div>
        <div class="mini-card">
          <div class="nb-tape"></div>
          <strong>Quiet Area (North)</strong>
          <small>Quiet zone · Level 2</small>
          <div class="mini-tags"><span class="top">★ 4.7</span><span>40 seats</span><span>Sockets</span></div>
          <em>“My go-to before finals.”</em>
        </div>
      </div>

      <div class="auth-notes" aria-hidden="true">
        <div class="nb-note">Every floor, room by room</div>
        <div class="nb-note nb-note--pink">Power sockets marked</div>
        <div class="nb-note nb-note--blue">Reviews from real students</div>
      </div>
    </template>

    <p v-if="route.query.registered" class="notice" role="status">Account created. Log in with your new email.</p>
    <p v-else-if="route.query.redirect" class="notice" role="status">Log in to see that page.</p>

    <form novalidate @submit.prevent="login">
      <div class="nb-field">
        <label for="email">Email</label>
        <input id="email" v-model="email" class="nb-input" type="email" required autocomplete="email">
      </div>
      <div class="nb-field">
        <label for="password">Password</label>
        <div class="nb-with-button">
          <input id="password" v-model="password" class="nb-input" :type="showPassword ? 'text' : 'password'"
                 required autocomplete="current-password">
          <button type="button" class="nb-btn" :aria-pressed="showPassword" @click="showPassword = !showPassword">
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <p v-if="error" class="nb-errors single" role="alert">{{ error }}</p>
      <button type="submit" class="nb-btn nb-btn--primary wide" :disabled="loading">
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>
    </form>

    <template #footer>New here? <RouterLink to="/register">Create an account</RouterLink></template>
  </AuthPage>
</template>

<style scoped>
.notice {
  margin: 0 0 16px;
  padding: 8px 12px;
  border: 1.5px dashed var(--nb-ink);
  border-radius: 8px;
  background: var(--nb-highlight);
  color: #28263f;
}
.wide { width: 100%; margin-top: 4px; padding-top: 10px; padding-bottom: 10px; }

/* ---------- the little preview ---------- */
.preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  max-width: 480px;
  margin-bottom: 26px;
  color: var(--nb-ink);
}
/* the folder stretches to the room card's height: its front grows to fill it */
.mini-folder { position: relative; display: flex; flex-direction: column; padding-top: 26px; }
.mini-folder::before {
  content: '';
  position: absolute;
  inset: 12px 0 0;
  background: var(--nb-manila-dark);
  border: 2px solid #28263f;
  border-radius: 4px 10px 10px 10px;
  box-shadow: 5px 5px 0 var(--nb-shadow);
}
.mini-paper {
  position: absolute;
  top: 0;
  left: 10px;
  right: 10px;
  height: 40px;
  display: flex;
  justify-content: flex-end;
  gap: 3px;
  padding: 5px 8px;
  background: #fffef9;
  border: 2px solid #28263f;
  transform: rotate(-0.8deg);
}
.mini-paper span {
  height: 18px;
  padding: 0 4px;
  border: 1.5px solid #28263f;
  border-radius: 4px;
  background: var(--nb-highlight);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 15px;
}
.mini-front {
  position: relative;
  flex: 1;
  display: grid;
  align-content: start;
  gap: 2px;
  min-height: 92px;
  padding: 18px 14px 12px;
  background: var(--nb-manila);
  border: 2px solid #28263f;
  border-radius: 4px 4px 10px 10px;
  box-shadow: 5px 5px 0 var(--nb-shadow);
  color: #28263f; /* light paper, so dark text in the night theme too */
}
.mini-front strong { font: 700 1.4rem/1.1 var(--nb-heading); }
.mini-front small { color: #5e5a73; }

.mini-card {
  position: relative;
  display: grid;
  gap: 4px;
  align-content: start;
  padding: 12px 14px;
  background: #fffef9;
  border: 2px solid #28263f;
  box-shadow: 5px 5px 0 var(--nb-shadow);
  transform: rotate(1.5deg);
  color: #28263f; /* light paper, so dark text in the night theme too */
}
.mini-card .nb-tape { width: 46px; height: 14px; margin-left: 0; left: auto; right: 22px; top: -8px; }
.mini-card strong { font: 700 1.35rem/1.1 var(--nb-heading); padding-bottom: 4px; border-bottom: 1.5px solid var(--nb-pink); }
.mini-card small { color: #5e5a73; font-size: 0.78rem; }
.mini-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.mini-tags span { padding: 0 8px; border: 1.5px solid #28263f; border-radius: 999px; font-size: 0.74rem; font-weight: 700; background: #fffdf3; }
.mini-tags .top { background: #5cb068; } /* the same green as a 4.5+ room on the building page */
.mini-card em { font-size: 0.78rem; }

@media (max-width: 520px) {
  .preview { grid-template-columns: 1fr; }
}
</style>

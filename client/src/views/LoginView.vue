<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
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
  <h2>Login</h2>
  <p v-if="route.query.registered">Account created. Please log in.</p>
  <form @submit.prevent="login">
    <label>Email <input v-model="email" type="email" required autocomplete="email"></label><br>
    <label>Password <input v-model="password" type="password" required autocomplete="current-password"></label><br>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button :disabled="loading">{{ loading ? 'Logging in...' : 'Login' }}</button>
  </form>
  <p>No account yet? <RouterLink to="/register">Register here</RouterLink></p>
</template>

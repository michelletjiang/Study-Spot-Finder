<script setup>
// ACTIVE: the login page. router.js sends logged-out visitors here.
// ref makes a changing value.
import { ref } from 'vue'
// useRouter navigates, useRoute reads ?redirect=.
import { useRouter, useRoute } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'
// The shared login state.
import { auth } from '../stores/auth'

// The router.
const router = useRouter()
// The current route.
const route = useRoute()

// The email field value.
const email = ref('')
// The password field value.
const password = ref('')
// An error message.
const error = ref('')
// True while the request runs.
const loading = ref(false)

// Called when the form is submitted.
async function login() {
  // Clear the old error.
  error.value = ''
  // Disable the button.
  loading.value = true
  try {
    // POST /api/login. On success the server starts a session and returns the safe user.
    const { user } = await api('/api/login', { method: 'POST', body: { email: email.value, password: password.value } })
    // Remember the user in the shared state.
    auth.user = user
    // go back to the page they were trying to reach, or home
    // Go to the page they wanted, or home.
    router.push(route.query.redirect || '/')
  } catch (e) {
    // Show the server's message, for example the generic Invalid email or password.
    error.value = e.message
  } finally {
    // Re-enable the button.
    loading.value = false
  }
}
</script>

<template>
  <h2>Login</h2>
  <!-- Shown after registering. -->
  <p v-if="route.query.registered">Account created. Please log in.</p>
  <!-- prevent stops the browser doing a normal form post and calls login() instead. -->
  <form @submit.prevent="login">
    <!-- Email field bound to the email value. -->
    <label>Email <input v-model="email" type="email" required autocomplete="email"></label><br>
    <!-- Password field bound to the password value. -->
    <label>Password <input v-model="password" type="password" required autocomplete="current-password"></label><br>
    <!-- Error message in red. -->
    <p v-if="error" style="color: red">{{ error }}</p>
    <!-- Submit button, disabled while logging in. -->
    <button :disabled="loading">{{ loading ? 'Logging in...' : 'Login' }}</button>
  </form>
  <!-- Link to the register page. -->
  <p>No account yet? <RouterLink to="/register">Register here</RouterLink></p>
</template>

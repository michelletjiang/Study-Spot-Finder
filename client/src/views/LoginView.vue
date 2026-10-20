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
  error.value = ''
  loading.value = true
  try {
    const { user } = await api('/api/login', { method: 'POST', body: { email: email.value, password: password.value } })
    auth.user = user
    // go back to the page they were trying to reach, or home
    router.push(route.query.redirect || '/')
  } catch (e) {
    error.value = e.message
  } finally {
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

<script setup>
// ACTIVE: the sign-up page.
// ref makes a changing value.
import { ref } from 'vue'
// useRouter navigates.
import { useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'

// The router.
const router = useRouter()

// The schools a student can pick. The server accepts the same codes.
const SCHOOLS = [
  { code: 'LKCSB', name: 'Lee Kong Chian School of Business' },
  { code: 'SCIS', name: 'School of Computing and Information Systems' },
  { code: 'SOSS', name: 'School of Social Sciences' },
  { code: 'SOA', name: 'School of Accountancy' },
  { code: 'SOE', name: 'School of Economics' },
  { code: 'YPHSL', name: 'Yong Pung How School of Law' },
  { code: 'CIS', name: 'College of Integrative Studies' },
]

// The form fields.
const form = ref({ username: '', email: '', password: '', school: [] })
// A list of error messages.
const errors = ref([])
// True while saving.
const saving = ref(false)

// Called when the form is submitted.
async function register() {
  errors.value = []
  saving.value = true
  try {
    // POST /api/register. The server hashes the password before saving.
    await api('/api/register', { method: 'POST', body: form.value })
    // Go to the login page with a notice that the account was created.
    router.push({ name: 'login', query: { registered: '1' } })
  } catch (e) {
    // Show the list of errors from the server, or the single message.
    errors.value = e.data?.errors || [e.message]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Page heading. -->
  <h1>Create an Account</h1>
  <!-- prevent stops the normal form post and calls register() instead. -->
  <form @submit.prevent="register">
    <label>Username <input v-model="form.username" autocomplete="username"></label><br>
    <label>Email <input v-model="form.email" type="email" autocomplete="email"></label><br>
    <label>Password <input v-model="form.password" type="password" autocomplete="new-password"></label><br>
    <!-- School choices, up to two. The server enforces the limit too. -->
    <p>School (up to 2):</p>
    <label v-for="s in SCHOOLS" :key="s.code" style="display: block">
      <!-- v-model on checkboxes with the same array collects every ticked value -->
      <input type="checkbox" :value="s.code" v-model="form.school"> {{ s.name }}
    </label>
    <br>
    <!-- The error list in red. -->
    <ul v-if="errors.length" style="color: red">
      <li v-for="err in errors" :key="err">{{ err }}</li>
    </ul>
    <button :disabled="saving">Register</button>
  </form>
  <p>Already have an account? <RouterLink to="/login">Login here</RouterLink></p>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

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

const form = ref({ username: '', email: '', password: '', school: [] })
const errors = ref([])
const saving = ref(false)

async function register() {
  errors.value = []
  saving.value = true
  try {
    await api('/api/register', { method: 'POST', body: form.value })
    router.push({ name: 'login', query: { registered: '1' } })
  } catch (e) {
    errors.value = e.data?.errors || [e.message]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <h1>Create an Account</h1>
  <form @submit.prevent="register">
    <label>Username <input v-model="form.username" autocomplete="username"></label><br>
    <label>Email <input v-model="form.email" type="email" autocomplete="email"></label><br>
    <label>Password <input v-model="form.password" type="password" autocomplete="new-password"></label><br>
    <p>School (up to 2):</p>
    <label v-for="s in SCHOOLS" :key="s.code" style="display: block">
      <!-- v-model on checkboxes with the same array collects every ticked value -->
      <input type="checkbox" :value="s.code" v-model="form.school"> {{ s.name }}
    </label>
    <br>
    <ul v-if="errors.length" style="color: red">
      <li v-for="err in errors" :key="err">{{ err }}</li>
    </ul>
    <button :disabled="saving">Register</button>
  </form>
  <p>Already have an account? <RouterLink to="/login">Login here</RouterLink></p>
</template>

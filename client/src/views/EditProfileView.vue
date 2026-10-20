<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'

const router = useRouter()

const form = ref({ username: '', email: '', password: '' })
const errors = ref([])
const saving = ref(false)

onMounted(async () => {
  try {
    const { user } = await api('/api/profile')
    form.value = { username: user.username, email: user.email, password: '' }
  } catch (e) {
    errors.value = [e.message]
  }
})

async function save() {
  errors.value = []
  saving.value = true
  try {
    const { user } = await api('/api/profile', { method: 'PUT', body: form.value })
    auth.user = user // NavBar shows the new username straight away
    router.push('/profile')
  } catch (e) {
    errors.value = e.data?.errors || [e.message]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <h1>Edit Profile</h1>
  <form @submit.prevent="save">
    <label>Username <input v-model="form.username" autocomplete="username"></label><br>
    <label>Email <input v-model="form.email" type="email" autocomplete="email"></label><br>
    <label>Password <input v-model="form.password" type="password" placeholder="Leave blank to keep current" autocomplete="new-password"></label><br>
    <ul v-if="errors.length" style="color: red">
      <li v-for="err in errors" :key="err">{{ err }}</li>
    </ul>
    <button :disabled="saving">Update</button>
  </form>
  <RouterLink to="/profile">Back</RouterLink>
</template>

<script setup>
// ACTIVE: form to change username, email and optionally password.
// ref makes a changing value, onMounted runs code when the page appears.
import { ref, onMounted } from 'vue'
// useRouter navigates.
import { useRouter } from 'vue-router'
// The shared JSON helper.
import { api } from '../api'
// The shared login state.
import { auth } from '../stores/auth'

// The router.
const router = useRouter()

// The form fields. The password starts blank.
const form = ref({ username: '', email: '', password: '' })
// A list of error messages.
const errors = ref([])
// True while saving.
const saving = ref(false)

// Run once when the page appears.
onMounted(async () => {
  try {
    // GET /api/profile to fill the form.
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
    // PUT /api/profile with the form. A blank password keeps the old one.
    const { user } = await api('/api/profile', { method: 'PUT', body: form.value })
    // Existing note: the nav bar shows the new username straight away.
    auth.user = user // NavBar shows the new username straight away
    // Go back to the profile page.
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
  <!-- Page heading. -->
  <h1>Edit Profile</h1>
  <!-- prevent stops the normal form post and calls save() instead. -->
  <form @submit.prevent="save">
    <label>Username <input v-model="form.username" autocomplete="username"></label><br>
    <label>Email <input v-model="form.email" type="email" autocomplete="email"></label><br>
    <label>Password <input v-model="form.password" type="password" placeholder="Leave blank to keep current" autocomplete="new-password"></label><br>
    <!-- The error list in red. -->
    <ul v-if="errors.length" style="color: red">
      <li v-for="err in errors" :key="err">{{ err }}</li>
    </ul>
    <button :disabled="saving">Update</button>
  </form>
  <RouterLink to="/profile">Back</RouterLink>
</template>

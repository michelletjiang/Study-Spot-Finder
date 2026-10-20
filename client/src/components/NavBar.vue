<script setup>
import { useRouter } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'

const router = useRouter()

async function logout() {
  await api('/api/logout', { method: 'POST' })
  auth.user = null
  router.push('/login')
}
</script>

<template>
  <nav>
    <RouterLink to="/"><h2>Study Spots📚</h2></RouterLink>
    <template v-if="auth.user">
      <span>Logged in as {{ auth.user.username }}</span> |
      <button @click="logout">Logout</button>
    </template>
    <RouterLink v-else to="/login">Login</RouterLink>
  </nav>
</template>

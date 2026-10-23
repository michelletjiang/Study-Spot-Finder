<script setup>
import { useRouter } from 'vue-router'
import { api } from '../api'
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'
import { comparison } from '../stores/compare'

const router = useRouter()

async function logout() {
  await api('/api/logout', { method: 'POST' })
  auth.user = null
  favourites.list = [] // don't leave this user's favourites around for the next login
  comparison.clear() // comparison choices are session-local too
  router.push('/login')
}
</script>

<template>
  <nav>
    <RouterLink to="/"><h2>Study Spots📚</h2></RouterLink>
    <template v-if="auth.user">
      <RouterLink to="/profile">Your Profile</RouterLink> |
      <template v-if="auth.isAdmin">
        <RouterLink to="/admin/buildings">Edit Buildings</RouterLink> |
        <RouterLink to="/admin/buildings/new">Add Building</RouterLink> |
        <RouterLink to="/admin/spots">Edit Study Spots</RouterLink> |
        <RouterLink to="/admin/spots/new">Add Study Spot</RouterLink> |
        <RouterLink to="/admin/reports">Pending Reports</RouterLink> |
      </template>
      <RouterLink to="/favourites">Favourites</RouterLink> |
      <RouterLink to="/my-reviews">Your Reviews</RouterLink> |
      <span>Logged in as {{ auth.user.username }}</span> |
      <button @click="logout">Logout</button>
    </template>
    <template v-else>
      <RouterLink to="/login">Login</RouterLink> |
      <RouterLink to="/register">Register</RouterLink>
    </template>
  </nav>
</template>

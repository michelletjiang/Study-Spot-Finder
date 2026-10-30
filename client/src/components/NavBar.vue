<script setup>
// ACTIVE: the top menu. It shows login or register links to guests, and profile, favourites and reviews links to students. Admins also get management links.
// useRouter is used to go to the login page after logout.
import { useRouter } from 'vue-router'
// api calls the server, auth holds the user.
import { api } from '../api'
import { auth } from '../stores/auth'
// favourites is cleared at logout.
import { favourites } from '../stores/favourites'
// comparison is the shortlist, cleared at logout.
import { comparison } from '../stores/compare'

// The router for navigation.
const router = useRouter()

// Called by the Logout button.
async function logout() {
  // Ask the server to end the session. Without this the cookie would still log the user in.
  await api('/api/logout', { method: 'POST' })
  // Forget the user in the browser.
  auth.user = null
  // Existing note below: also clear the favourites.
  favourites.list = [] // don't leave this user's favourites around for the next login
  // The shortlist is cleared too, so the next person on this browser does not inherit it.
  comparison.clear() // comparison choices are session-local too
  // Go to the login page.
  router.push('/login')
}
</script>

<template>
  <nav>
    <RouterLink to="/"><h2>Study Spots📚</h2></RouterLink>
    <!-- Links for a logged-in user. -->
    <template v-if="auth.user">
      <RouterLink to="/profile">Your Profile</RouterLink> |
      <!-- Admin links appear only for admins. -->
      <template v-if="auth.isAdmin">
        <RouterLink to="/admin/buildings">Edit Buildings</RouterLink> |
        <RouterLink to="/admin/buildings/new">Add Building</RouterLink> |
        <RouterLink to="/admin/spots">Edit Study Spots</RouterLink> |
        <RouterLink to="/admin/spots/new">Add Study Spot</RouterLink> |
        <RouterLink to="/admin/reports">Pending Reports</RouterLink> |
      </template>
      <!-- Links every student sees. -->
      <RouterLink to="/favourites">Favourites</RouterLink> |
      <RouterLink to="/my-reviews">Your Reviews</RouterLink> |
      <span>Logged in as {{ auth.user.username }}</span> |
      <button @click="logout">Logout</button>
    </template>
    <!-- Links shown when nobody is logged in. -->
    <template v-else>
      <RouterLink to="/login">Login</RouterLink> |
      <RouterLink to="/register">Register</RouterLink>
    </template>
  </nav>
</template>

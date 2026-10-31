<script setup>
import { useRouter } from 'vue-router'
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'

const router = useRouter()

async function logout() {
  // Destroy the server session before changing the visible navigation state.
  try {
    await auth.logout()
  } finally {
    // Clear user-owned cached data even if the network request was already expired.
    favourites.list = []
    // Send the browser to a public route and replace back-navigation with the guard boundary.
    await router.replace('/login')
  }
}
</script>

<template>
  <!-- The shell keeps public and authenticated navigation in one keyboard-friendly landmark. -->
  <nav class="app-nav" aria-label="Main navigation">
    <!-- The brand is always available as a safe home link. -->
    <RouterLink class="brand" to="/">Study Spots📚</RouterLink>
    <!-- Authenticated links are rendered from the server-backed user state. -->
    <div v-if="auth.user" class="nav-links">
      <RouterLink to="/profile">Your Profile</RouterLink>
      <RouterLink to="/favourites">Favourites</RouterLink>
      <RouterLink to="/my-reviews">Your Reviews</RouterLink>
      <!-- Admin links remain invisible to students, while API middleware stays authoritative. -->
      <template v-if="auth.isAdmin">
        <RouterLink to="/admin/buildings">Edit Buildings</RouterLink>
        <RouterLink to="/admin/buildings/new">Add Building</RouterLink>
        <RouterLink to="/admin/spots">Edit Study Spots</RouterLink>
        <RouterLink to="/admin/spots/new">Add Study Spot</RouterLink>
        <RouterLink to="/admin/reports">Pending Reports</RouterLink>
      </template>
      <!-- The button exposes the current account and performs a session logout. -->
      <span class="account">Logged in as {{ auth.user.username }}</span>
      <button type="button" @click="logout">Logout</button>
    </div>
    <!-- Public users receive only the two routes that do not require a session. -->
    <div v-else class="nav-links">
      <RouterLink to="/login">Login</RouterLink>
      <RouterLink to="/register">Register</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
/* Keep the shell readable on the notebook background and usable at narrow widths. */
.app-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--paper); border-bottom: 2px solid var(--line); text-align: left; }
/* Give the brand a stable visual anchor without relying on emoji color. */
.brand { color: var(--ink); font-weight: 700; text-decoration: none; white-space: nowrap; }
/* Flex wrapping prevents clipped links instead of introducing horizontal scrolling. */
.nav-links { display: flex; flex: 1; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .65rem 1rem; }
/* Keep focus visible for keyboard users against both native color schemes. */
.nav-links a:focus-visible, .nav-links button:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
/* Buttons and links share the theme's readable contrast. */
.nav-links a, .nav-links button { color: var(--ink); font: inherit; }
/* The account label may shrink before navigation controls do. */
.account { color: var(--text); font-size: .9rem; }
/* Stack the shell at phone widths so every control remains tappable. */
@media (max-width: 640px) { .app-nav { align-items: flex-start; } .nav-links { justify-content: flex-start; } .account { flex-basis: 100%; } }
</style>

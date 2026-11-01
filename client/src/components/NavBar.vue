<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Collapse } from 'bootstrap'
import { api } from '../api'
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'

const route = useRoute()
const router = useRouter()
const menu = ref(null) // the collapsible part of the navbar (shown by the toggler on small screens)

// on a phone the menu stays open after tapping a link, so close it whenever the page changes
watch(() => route.fullPath, () => {
  if (menu.value?.classList.contains('show')) Collapse.getOrCreateInstance(menu.value).hide()
})

async function logout() {
  await api('/api/logout', { method: 'POST' })
  auth.user = null
  favourites.list = [] // don't leave this user's favourites around for the next login
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg">
    <div class="container">
      <RouterLink class="navbar-brand" to="/"><h2>Study Spots📚</h2></RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#main-nav"
        aria-controls="main-nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="main-nav" ref="menu" class="collapse navbar-collapse">
        <ul v-if="auth.user" class="navbar-nav me-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/profile">Your Profile</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/favourites">Favourites</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/my-reviews">Your Reviews</RouterLink></li>
          <li v-if="auth.isAdmin" class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Admin</a>
            <ul class="dropdown-menu">
              <li><RouterLink class="dropdown-item" to="/admin/buildings">Edit Buildings</RouterLink></li>
              <li><RouterLink class="dropdown-item" to="/admin/buildings/new">Add Building</RouterLink></li>
              <li><hr class="dropdown-divider"></li>
              <li><RouterLink class="dropdown-item" to="/admin/spots">Edit Study Spots</RouterLink></li>
              <li><RouterLink class="dropdown-item" to="/admin/spots/new">Add Study Spot</RouterLink></li>
              <li><hr class="dropdown-divider"></li>
              <li><RouterLink class="dropdown-item" to="/admin/reports">Pending Reports</RouterLink></li>
            </ul>
          </li>
        </ul>
        <ul v-else class="navbar-nav me-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/login">Login</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/register">Register</RouterLink></li>
        </ul>

        <div v-if="auth.user" class="d-flex align-items-center gap-2">
          <span class="navbar-text">Logged in as {{ auth.user.username }}</span>
          <button class="btn btn-outline-secondary btn-sm" @click="logout">Logout</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* the brand keeps the handwritten heading font from style.css */
.navbar-brand h2 {
  margin: 0;
}

/* show which page you're on (vue-router adds this class to the current link) */
.nav-link.router-link-exact-active {
  color: var(--accent);
  font-weight: 600;
}
</style>

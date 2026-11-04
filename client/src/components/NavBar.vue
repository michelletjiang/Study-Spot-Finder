<script setup>
// Bootstrap supplies the responsive collapse behavior for the shared shell.
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Collapse } from 'bootstrap'
import { auth } from '../stores/auth'
import { favourites } from '../stores/favourites'
import { daynight } from '../stores/daynight'

// The current route lets the shell close its mobile menu after navigation.
const route = useRoute()
// The router performs safe public navigation after logout.
const router = useRouter()
// Bootstrap needs the collapse element to close it programmatically.
const menu = ref(null)

// Close the menu after a link changes the page on narrow screens.
watch(() => route.fullPath, () => {
  if (menu.value?.classList.contains('show')) Collapse.getOrCreateInstance(menu.value).hide()
})

// the theme button: what it shows now, and what a click switches to (Auto -> Day -> Night -> Auto)
const THEME_LABELS = { auto: 'Auto', day: 'Day', night: 'Night' }
const NEXT_THEME = { auto: 'day', day: 'night', night: 'auto' }

async function logout() {
  // Destroy the server session and clear the local account copy.
  try {
    await auth.logout()
  } finally {
    // Clear user-owned caches even when the server session already expired.
    favourites.list = []
    // Replace history so browser back cannot reopen the authenticated shell.
    await router.replace('/login')
  }
}
</script>

<template>
  <!-- The Bootstrap container keeps the front desk aligned at every screen width. -->
  <nav class="navbar navbar-expand-lg">
    <div class="container">
      <!-- The brand is always available as a safe home link. -->
      <RouterLink class="navbar-brand" to="/"><img src="/logo.png" alt="" class="brand-logo"><h2>Study Spots</h2></RouterLink>
      <!-- The keyboard-labelled toggler exposes links on narrow screens. -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav" aria-controls="main-nav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <!-- The menu changes links according to the server-backed session state. -->
      <div id="main-nav" ref="menu" class="collapse navbar-collapse">
        <ul v-if="auth.user" class="navbar-nav me-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/profile">Your Profile</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/favourites">Favourites</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/my-reviews">Your Reviews</RouterLink></li>
          <!-- Client visibility is a UX boundary; server middleware still authorizes admin APIs. -->
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
        <!-- Logged-out visitors receive only public auth links. -->
        <ul v-else class="navbar-nav me-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/login">Login</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/register">Register</RouterLink></li>
        </ul>
        <!-- The theme button, then the account label and logout button, beside the menu. -->
        <div class="d-flex align-items-center gap-2">
          <!-- Auto follows the time in Singapore: day 7am-7pm, night after (stores/daynight.js) -->
          <button type="button" class="btn btn-sm theme-btn" :title="`Theme: ${THEME_LABELS[daynight.mode.value]}. Click for ${THEME_LABELS[NEXT_THEME[daynight.mode.value]]}.`"
                  :aria-label="`Theme: ${THEME_LABELS[daynight.mode.value]}${daynight.mode.value === 'auto' ? ', follows Singapore time' : ''}. Switch to ${THEME_LABELS[NEXT_THEME[daynight.mode.value]]}`"
                  @click="daynight.cycle()">
            <span aria-hidden="true">{{ daynight.isNight.value ? '☾' : '☀' }}</span> {{ THEME_LABELS[daynight.mode.value] }}
          </button>
          <template v-if="auth.user">
            <span class="navbar-text">Logged in as {{ auth.user.username }}</span>
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="logout">Logout</button>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* The logo sits beside the handwritten brand name, which keeps the app theme's font. */
.navbar-brand { display: flex; align-items: center; gap: 4px; }
.navbar-brand h2 { margin: 0; }
.brand-logo { width: 52px; height: auto; }
/* the navy logo needs a thin light outline on the night theme's dark paper */
:root[data-theme='night'] .brand-logo { filter: drop-shadow(0 0 1px #fffef9) drop-shadow(0 0 1px #fffef9); }
/* the Auto / Day / Night theme button: a small dashed pill */
.theme-btn { border: 1.5px dashed currentColor; border-radius: 999px; color: var(--nb-ink); white-space: nowrap; }
.theme-btn:hover { border-style: solid; color: var(--nb-ink); }
/* Highlight the current route for keyboard and visual orientation. */
/* a yellow highlighter stroke behind the link (yellow text would be too faint on the cream page) */
.nav-link.router-link-active {
  color: #28263f;
  font-weight: 600;
  background: linear-gradient(transparent 48%, #ffe58a 48%, #ffe58a 78%, transparent 78%) no-repeat;
  background-size: calc(100% - 2 * var(--bs-navbar-nav-link-padding-x, 0.5rem)) 100%;
  background-position: center;
}
/* at night dark text can't sit half on the dark navbar, so the current page gets a whole yellow pill */
:root[data-theme='night'] .nav-link.router-link-active { border-radius: 999px; background: var(--nb-highlight); color: #28263f; }
</style>

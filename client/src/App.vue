<script setup>
// ACTIVE: the root component. main.js mounts it, and it holds everything that stays on screen while pages change.
// NavBar is the top menu with the login and logout links.
import NavBar from './components/NavBar.vue'
// MiniMap occupies its own page section. It is not rendered with route views, so it survives page changes.
import MiniMap from './components/MiniMap.vue'
// CompareTray is the bar at the bottom of the screen that shows the comparison shortlist.
import CompareTray from './components/CompareTray.vue'
// Doodles are the crayon drawings in the empty paper either side of the page.
import Doodles from './components/Doodles.vue'
// auth says who is logged in.
import { auth } from './stores/auth'
</script>

<template>
  <Doodles />
  <!-- NavBar shows different links for guests, students and admins. -->
  <NavBar />
  <!-- RouterView is where router.js puts the current page. -->
  <RouterView />
  <!-- Existing note: placed outside RouterView so the map survives page changes. -->
  <!-- outside RouterView so the map survives page changes; it hides itself on pages without meta.showMap -->
  <MiniMap v-if="auth.user" />
  <!-- Only logged-in users get the comparison tray, because the compare API needs a login. -->
  <CompareTray v-if="auth.user" />
</template>

<script setup>
import NavBar from './components/NavBar.vue'
import MiniMap from './components/MiniMap.vue'
import { auth } from './stores/auth'
</script>

<template>
  <NavBar />
  <RouterView />
  <!-- outside RouterView so the map survives page changes; it hides itself on pages without meta.showMap -->
  <MiniMap v-if="auth.user" />
</template>

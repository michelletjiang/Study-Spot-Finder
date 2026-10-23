<script setup>
import { computed } from 'vue'
import NavBar from './components/NavBar.vue'
import MiniMap from './components/MiniMap.vue'
import CompareTray from './components/CompareTray.vue'
import { auth } from './stores/auth'
import { comparison } from './stores/compare'

const hasComparison = computed(() => comparison.count.value > 0)
</script>

<template>
  <NavBar />
  <RouterView />
  <!-- outside RouterView so the map survives page changes; it hides itself on pages without meta.showMap -->
  <MiniMap v-if="auth.user" :class="{ 'with-compare-tray': hasComparison }" />
  <CompareTray v-if="auth.user" />
</template>

<script setup>
// ACTIVE: the root component. main.js mounts it, and it holds everything that stays on screen while pages change.
// computed makes a value that updates when what it reads changes.
import { computed } from 'vue'
// NavBar is the top menu with the login and logout links.
import NavBar from './components/NavBar.vue'
// MiniMap is the floating map. It is not rendered with route views, so it survives page changes.
import MiniMap from './components/MiniMap.vue'
// CompareTray is the bar at the bottom of the screen that shows the comparison shortlist.
import CompareTray from './components/CompareTray.vue'
// auth says who is logged in.
import { auth } from './stores/auth'
// comparison is the shortlist store.
import { comparison } from './stores/compare'

// True when at least one spot is on the shortlist. Used to lift the minimap above the tray.
const hasComparison = computed(() => comparison.count.value > 0)
</script>

<template>
  <!-- NavBar shows different links for guests, students and admins. -->
  <NavBar />
  <!-- RouterView is where router.js puts the current page. -->
  <!-- Keep the shell mounted while only the active page receives the transition. -->
  <RouterView v-slot="{ Component, route }">
    <!-- Key by the route record, not the full URL, so query/filter changes do not remount pages. -->
    <Transition name="page" mode="out-in">
      <!-- The wrapper gives every view, including multi-root templates, one animated element. -->
      <div class="page-transition-page" :key="route.matched[route.matched.length - 1]?.path">
        <component :is="Component" />
      </div>
    </Transition>
  </RouterView>
  <!-- Existing note: placed outside RouterView so the map survives page changes. -->
  <!-- outside RouterView so the map survives page changes; it hides itself on pages without meta.showMap -->
  <!-- Only logged-in users get the map. The with-compare-tray class makes room for the tray. -->
  <MiniMap v-if="auth.user" :class="{ 'with-compare-tray': hasComparison }" />
  <!-- Only logged-in users get the comparison tray, because the compare API needs a login. -->
  <CompareTray v-if="auth.user" />
</template>

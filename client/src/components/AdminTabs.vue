<script setup>
// Folder tabs across the top of the admin list pages. The tab for the current page is yellow.
const TABS = [
  { to: '/admin/buildings', label: 'Buildings' },
  { to: '/admin/spots', label: 'Study spots' },
  { to: '/admin/reports', label: 'Reports' },
]
</script>

<template>
  <nav class="admin-tabs" aria-label="Admin sections">
    <RouterLink v-for="tab in TABS" :key="tab.to" :to="tab.to" class="tab" active-class="active">{{ tab.label }}</RouterLink>
  </nav>
</template>

<style scoped>
.admin-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-left: 12px; border-bottom: 2px solid var(--nb-ink); }
.tab {
  position: relative;
  bottom: -2px;
  padding: 8px 24px;
  border: 2px solid var(--nb-ink);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: var(--nb-sheet);
  color: var(--nb-ink);
  font-weight: 700;
  text-decoration: none;
}
.tab:hover { color: var(--nb-ink); background: var(--nb-paper); }
.tab.active { padding-top: 11px; background: var(--nb-highlight); color: #28263f; }
.tab:focus-visible { outline: 3px solid var(--nb-focus); outline-offset: 2px; }
</style>

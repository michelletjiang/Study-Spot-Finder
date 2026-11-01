<script setup>
// The layout shared by the log in and register pages: a big handwritten headline and sticky notes
// on the left (the "hero" slot), and the form on a taped sheet of paper on the right.
defineProps({ title: { type: String, required: true } })
</script>

<template>
  <div class="auth-page">
    <section class="auth-hero">
      <slot name="hero" />
    </section>

    <section class="sheet" :aria-labelledby="'auth-title'">
      <div class="nb-tape" aria-hidden="true"></div>
      <h1 id="auth-title">{{ title }}</h1>
      <slot />
      <footer>
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 500px);
  gap: 56px;
  align-items: start;
  max-width: 1180px;
  padding: 36px 24px 80px 48px; /* left clears the pink margin line */
  color: var(--nb-ink);
  text-align: left;
}

.auth-hero { min-width: 0; padding-top: 12px; }

.sheet {
  position: relative;
  padding: 18px 28px 22px;
  background: var(--nb-sheet);
  border: 2px solid var(--nb-ink);
  border-radius: 3px;
  box-shadow: 7px 7px 0 var(--nb-ink);
  transform: rotate(-0.5deg);
}
h1 {
  margin: 0 -28px 18px;
  padding: 6px 28px 8px;
  border-bottom: 2px solid var(--nb-pink);
  font: 700 2.3rem/1.1 var(--nb-heading);
  color: var(--nb-ink);
}

footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1.5px dashed var(--nb-rule);
  text-align: center;
}
footer :slotted(a) { color: var(--nb-ink); font-weight: 700; text-underline-offset: 3px; }

@media (max-width: 860px) {
  .auth-page { grid-template-columns: 1fr; gap: 36px; padding-left: 16px; padding-right: 16px; }
  /* on phones the form comes first; the headline and notes follow underneath */
  .sheet { order: -1; transform: none; padding: 16px 18px 20px; }
  h1 { margin: 0 -18px 16px; padding: 6px 18px 8px; }
}
</style>

<!-- not scoped: the headline, intro and sticky notes are written by the pages (in the hero slot) -->
<style>
.auth-headline {
  max-width: 13ch;
  margin: 0 0 18px;
  font: 700 clamp(2.6rem, 5.5vw, 4rem)/1.12 var(--nb-heading);
  color: var(--nb-ink);
}
.auth-intro { max-width: 34em; margin: 0 0 28px; color: var(--nb-muted); font-size: 1.08rem; line-height: 1.6; }

.auth-notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; max-width: 560px; }
.auth-notes .nb-note {
  min-height: 116px;
  padding: 16px 16px 14px;
  font: 700 1.45rem/1.2 var(--nb-heading);
}
.auth-notes .nb-note:nth-child(2) { transform: rotate(1.2deg); }
.auth-notes .nb-note:nth-child(3) { transform: rotate(-0.6deg); }
.auth-notes .num { display: block; font-size: 2.1rem; line-height: 1; }

@media (max-width: 520px) {
  .auth-notes { grid-template-columns: 1fr; }
  .auth-notes .nb-note { min-height: 0; }
}
</style>

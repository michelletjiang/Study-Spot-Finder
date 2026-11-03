<script setup>
import { computed } from 'vue'
import { floorplans } from '../floorplans'
import { floorOrder, levelsText } from '../floors'
import { openStatus } from '../buildingHours'

// One building on the home page, drawn as a manila folder.
// The floorplan "paper" inside slides up on hover/focus to show a tab for each floor that has a plan.
// Clicking the folder emits 'select' (the home page then shows the route on its map); selected highlights it.
const props = defineProps({
  building: { type: Object, required: true },
  spotCount: { type: Number, default: null }, // null while unknown
  now: { type: Date, required: true },         // passed in so every card ticks over together
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const path = computed(() => '/building/' + props.building.buildingname)
const planFloors = computed(() =>
  Object.keys(floorplans[props.building.buildingname] || {}).sort((a, b) => floorOrder(a) - floorOrder(b)))
const status = computed(() => openStatus(props.building.buildingname, props.now))
</script>

<template>
  <article class="folder" :class="{ 'has-plans': planFloors.length, selected }" @click="emit('select')">
    <div class="back" aria-hidden="true"></div>

    <div v-if="planFloors.length" class="paper">
      <span class="paper-title">Floors</span>
      <nav class="tabs" :aria-label="`Floor plans in ${building.buildingname}`">
        <RouterLink
          v-for="floor in planFloors"
          :key="floor"
          :to="{ path, query: { floor } }"
          :aria-label="`${building.buildingname}, ${floor.startsWith('B') ? floor : 'level ' + floor}`"
        >{{ floor.startsWith('B') ? floor : 'L' + floor }}</RouterLink>
      </nav>
    </div>

    <div class="front">
      <!-- the name is the keyboard way to pick the folder (a click anywhere on it works too) -->
      <h3><button type="button" class="name" :aria-pressed="selected">{{ building.buildingname }}</button></h3>
      <span v-if="status" class="status" :class="status.state">
        <span class="dot" aria-hidden="true"></span>{{ status.text }}
      </span>
      <p class="meta">
        <span>{{ levelsText(building) }}</span>
        <template v-if="spotCount !== null">
          <span aria-hidden="true">·</span>
          <span>{{ spotCount }} study spot{{ spotCount === 1 ? '' : 's' }}</span>
        </template>
      </p>
      <span v-if="selected" class="on-map">Route shown on the map</span>
      <RouterLink :to="path" class="open">{{ planFloors.length ? 'Open floor plans' : 'View study spots' }} →</RouterLink>
    </div>
  </article>
</template>

<style scoped>
.folder {
  --ink: #28263f;
  --manila: #fbe9bd;
  --manila-dark: #f4da98;
  --sheet: #fffdf7;
  --highlight: #ffe58a;
  position: relative;
  display: flex;
  flex-direction: column;
  padding-top: 54px; /* room for the folder tab and the paper peeking out */
  text-align: left;
  color: var(--ink);
}

/* back of the folder, with its tab on the top left */
.back {
  position: absolute;
  inset: 22px 0 0 0;
  background: var(--manila-dark);
  border: 2px solid var(--ink);
  border-radius: 4px 14px 14px 14px;
  box-shadow: 6px 6px 0 var(--ink);
}
.back::before {
  content: '';
  position: absolute;
  left: -2px;
  top: -24px;
  width: 42%;
  height: 26px;
  background: var(--manila-dark);
  border: 2px solid var(--ink);
  border-bottom: none;
  border-radius: 14px 14px 0 0;
}

/* the sheet tucked inside; only its top edge shows until the folder is opened */
.paper {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 29px;
  height: 80px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  background: var(--sheet);
  border: 2px solid var(--ink);
  border-radius: 2px;
  transform: rotate(-0.6deg);
  transition: transform 0.25s ease;
}

.paper-title {
  font: 700 0.95rem/1.7 Georgia, 'Times New Roman', serif;
  white-space: nowrap;
}

.tabs {
  display: flex;
  justify-content: flex-end;
  gap: 3px;
}

.tabs a {
  min-width: 25px;
  padding: 1px 3px;
  box-sizing: border-box;
  text-align: center;
  font: 700 0.74rem/1.4 Arial, sans-serif;
  color: var(--ink);
  text-decoration: none;
  background: var(--highlight);
  border: 1.5px solid var(--ink);
  border-radius: 6px;
}
.tabs a:hover { background: #fff; }

/* front of the folder: it tips towards you when opened */
.front {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 18px 18px;
  background: var(--manila);
  border: 2px solid var(--ink);
  border-radius: 4px 4px 14px 14px;
  box-shadow: 6px 6px 0 var(--ink);
  transform-origin: bottom center;
  transition: transform 0.25s ease;
}

h3 {
  margin: 0 0 4px;
  font: 700 clamp(1.25rem, 2vw, 1.5rem)/1.15 Georgia, 'Times New Roman', serif;
  text-wrap: balance;
}

h3 .name {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.folder { cursor: pointer; }

/* picked: the front turns highlighter yellow, with a note pointing at the map */
.folder.selected .front { background: var(--highlight); }
.on-map {
  font: 700 0.8rem Arial, sans-serif;
  color: #4b3fb5;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 2px 9px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--sheet);
  font: 700 0.76rem/1.3 Arial, sans-serif;
  white-space: nowrap;
}
.status .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--ink);
}
.status.open .dot { background: #5fb36b; }
.status.closing { background: var(--highlight); }
.status.closing .dot { background: #f0a23a; }
.status.closed { border-style: dashed; background: transparent; color: #5e5a73; }
.status.closed .dot { background: #f5a0a6; }

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  font-size: 0.9rem;
  color: #6b6880;
}

.open {
  margin-top: auto;
  padding-top: 6px;
  font: 700 0.92rem Arial, sans-serif;
  color: var(--ink);
}

.tabs a:focus-visible,
.open:focus-visible,
h3 .name:focus-visible {
  outline: 3px solid #4b3fb5;
  outline-offset: 2px;
}

/* opened: the paper rises out and the front tips forward */
.folder.has-plans:hover .paper,
.folder.has-plans:focus-within .paper {
  transform: translateY(-26px) rotate(-1.5deg);
}
.folder.has-plans:hover .front,
.folder.has-plans:focus-within .front {
  transform: perspective(900px) rotateX(-9deg);
}

/* touch screens can't hover, so keep the paper out */
@media (hover: none) {
  .folder.has-plans .paper { transform: translateY(-26px) rotate(-1.5deg); }
}

@media (prefers-reduced-motion: reduce) {
  .paper, .front { transition: none; }
}
</style>

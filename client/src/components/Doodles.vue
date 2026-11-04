<script setup>
// ACTIVE: crayon doodles behind the page: clouds, sparkles, a rocket, and a sun or moon that follows the time in Singapore.
// On wide screens they sit in the empty paper either side of the page; on narrower ones a smaller set peeks from the corners.
// The sun rises in the east (the right, as on a map) at 7am, is highest at 1pm and sets in the west (the left) at 7pm;
// then the moon and stars take the same path through the night (stores/daynight.js).
// When the student goes to another page, the rocket takes off: a shudder on the pad, a puff of smoke, then it curves up
// and away past the top-right corner, speeding up as it goes; a moment later it rises back up from below and settles.
// Switching tabs within a page (like a building's floors, which only change the address's ?floor=) leaves it alone.
// Decoration only: hidden from screen readers, can't be clicked, and still for anyone who has asked for less motion.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { daynight } from '../stores/daynight'

const isNight = daynight.isNight
// how far across the sky the sun or moon is (0 rising, 1 setting), and how high (0 on the horizon, 1 at the top)
const sky = computed(() => ({ '--sky-p': daynight.skyProgress.value, '--sky-lift': Math.sin(Math.PI * daynight.skyProgress.value) }))

// While the sun or moon crosses the page (not the empty margins) it fades, so it never fights with the text on top.
// These match the CSS below: the 1126px page, and a 140px sun on screens wider than 1440px.
const PAGE_WIDTH = 1126
const WIDE = 1440
const screenWidth = ref(window.innerWidth)
const onResize = () => (screenWidth.value = window.innerWidth)
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const overPage = computed(() => {
  const w = screenWidth.value
  if (w <= WIDE) return false // narrow screens fade all the doodles anyway
  const size = isNight.value ? 110 : 140
  const centre = (1 - daynight.skyProgress.value) * (w - size) + size / 2
  return Math.abs(centre - w / 2) < PAGE_WIDTH / 2
})

// ---------- the rocket's flight ----------
const route = useRoute()
const parkedEl = ref(null) // the rocket in its corner
const flierEl = ref(null)  // its twin that flies above the page, starting exactly where the parked one is
const flying = ref(false)
const landing = ref(false) // the parked rocket's bobbing is paused while it lands, so the landing can't end in a jump
const puffs = ref(null)    // where the smoke billows (the launch pad), or null
let running = []           // the animations in progress, so a quick second page change can cut them short

function stopFlight() {
  running.forEach(animation => animation.cancel())
  running = []
  flying.value = false
  landing.value = false
  puffs.value = null
}

// A point on the curve from the launch pad (0, 0) to past the top-right corner, and the way the nose points there.
// A quadratic Bezier: it starts out nearly straight up (towards the control point) and bends to the right.
function onCurve(t, control, end) {
  const x = 2 * (1 - t) * t * control.x + t * t * end.x
  const y = 2 * (1 - t) * t * control.y + t * t * end.y
  const dx = 2 * (1 - t) * control.x + 2 * t * (end.x - control.x)
  const dy = 2 * (1 - t) * control.y + 2 * t * (end.y - control.y)
  return { x, y, angle: (Math.atan2(dx, -dy) * 180) / Math.PI } // 0deg = nose up
}

async function launch() {
  stopFlight()
  const parked = parkedEl.value
  if (!parked || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const pad = parked.getBoundingClientRect()
  if (!pad.width) return // the rocket isn't showing

  Object.assign(flierEl.value.style, { left: `${pad.left}px`, top: `${pad.top}px`, width: `${pad.width}px` })
  flying.value = true
  puffs.value = { left: `${pad.left + pad.width / 2}px`, top: `${pad.bottom - pad.width * 0.35}px`, '--puff': `${pad.width * 0.55}px` }

  // countdown: a little shudder on the pad...
  const frames = [
    { offset: 0, transform: 'translate(0, 0) rotate(0deg)' },
    { offset: 0.05, transform: 'translate(-1.5px, 2px) rotate(-1.5deg)' },
    { offset: 0.1, transform: 'translate(1.5px, 3px) rotate(1.5deg)' },
    { offset: 0.15, transform: 'translate(-1px, 3px) rotate(-1deg)' },
    { offset: 0.2, transform: 'translate(0, 2px) rotate(0deg)' },
  ]
  // ...then lift-off along the curve. Equal steps in time but growing steps along the curve, so it keeps speeding up.
  const end = { x: window.innerWidth - pad.left + pad.width, y: -(pad.bottom + pad.height) }
  const control = { x: end.x * 0.08, y: end.y * 0.8 }
  const STEPS = 30
  for (let i = 1; i <= STEPS; i++) {
    const { x, y, angle } = onCurve((i / STEPS) ** 2, control, end)
    frames.push({ offset: 0.2 + (0.8 * i) / STEPS, transform: `translate(${x}px, ${y}px) rotate(${angle}deg)` })
  }
  const flight = flierEl.value.animate(frames, { duration: 2000, easing: 'linear', fill: 'forwards' })
  running.push(flight)
  try {
    await flight.finished
  } catch {
    return // cut short by another page change
  }
  flying.value = false
  puffs.value = null

  // The return: it rises back up from below the screen into its corner, nose up, along a gentle curve, slowing
  // smoothly as it arrives (ease-out), overshooting its spot a touch and settling back. It ends exactly where the
  // bobbing starts (upright at 5deg, see @keyframes hover), so when the bobbing restarts there's no jump.
  landing.value = true
  const BOB_START = 5 // degrees: the hover keyframes' first tilt
  const from = { x: -Math.min(120, pad.left + pad.width), y: window.innerHeight - pad.top + 40 } // below the screen, a little to the left
  const bend = { x: from.x * 0.15, y: from.y * 0.45 }
  const descent = []
  const STEPS_UP = 28
  for (let i = 0; i <= STEPS_UP; i++) {
    const t = i / STEPS_UP
    const u = Math.sin((t * Math.PI) / 2) // ease-out: steady at first, slowing smoothly as it reaches the corner
    // a Bezier from below the screen, bending towards the corner, up to (0, 0); it leans less as it slows
    const x = (1 - u) ** 2 * from.x + 2 * (1 - u) * u * bend.x
    const y = (1 - u) ** 2 * from.y + 2 * (1 - u) * u * bend.y
    const lean = 14 * (1 - u) + BOB_START * u
    descent.push({
      offset: 0.85 * t,
      opacity: Math.min(1, t / 0.12),
      transform: `translate(${x}px, ${y}px) rotate(${lean}deg)`,
    })
  }
  descent.push(
    { offset: 0.92, opacity: 1, transform: `translate(0, -6px) rotate(${BOB_START}deg)` }, // a touch too far up...
    { offset: 1, opacity: 1, transform: `translate(0, 0) rotate(${BOB_START}deg)` }, // ...and settled
  )
  const touchdown = parked.animate(descent, { duration: 2600, delay: 350, easing: 'linear', fill: 'backwards' })
  running.push(touchdown)
  try {
    await touchdown.finished
  } catch {
    return
  }
  landing.value = false
}

// Other pages: the rocket stays parked and just sways side to side a few times, settling back upright.
function sway() {
  const body = parkedEl.value?.querySelector('.rocket-body')
  if (!body || flying.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  body.animate(
    [0, -9, 7, -4, 2, 0].map(deg => ({ transform: `rotate(${deg}deg)` })),
    { duration: 1600, easing: 'ease-in-out' },
  )
}

// The rocket only flies off and back when going to the home page or the profile page.
const FLIGHT_PAGES = ['/', '/profile']

// route.path, not fullPath: ?floor=2 -> ?floor=3 is the same page, so the rocket stays put
watch(() => route.path, path => requestAnimationFrame(FLIGHT_PAGES.includes(path) ? launch : sway))
onUnmounted(stopFlight)
</script>

<template>
  <div class="doodles" :class="{ night: isNight }" :style="sky" aria-hidden="true">
    <!-- shared crayon look: a rough edge (displacement) and diagonal hatching for fills -->
    <svg class="defs" width="0" height="0">
      <defs>
        <filter id="crayon" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern id="hatch-blue" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="5.5" stroke="#4f9fe0" stroke-width="3.6" />
        </pattern>
        <pattern id="hatch-yellow" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#f1c64f" stroke-width="3.8" />
        </pattern>
        <pattern id="hatch-moon" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#f3e7b3" stroke-width="3.8" />
        </pattern>
      </defs>
    </svg>

    <!-- the sun by day, the moon by night: placed along the sky's arc by --sky-p and --sky-lift -->
    <svg v-if="!isNight" class="doodle celestial sun" :class="{ faint: overPage }" viewBox="0 0 200 200">
      <g filter="url(#crayon)">
        <g class="rays" stroke="#f1c64f" stroke-width="9" stroke-linecap="round">
          <line v-for="n in 12" :key="n" x1="100" y1="22" x2="100" y2="4" :transform="`rotate(${n * 30} 100 100)`" />
        </g>
        <circle cx="100" cy="100" r="54" fill="url(#hatch-yellow)" stroke="#e9b737" stroke-width="6" />
      </g>
    </svg>
    <svg v-else class="doodle celestial moon" :class="{ faint: overPage }" viewBox="0 0 200 200">
      <g filter="url(#crayon)">
        <path d="M128 34 A70 70 0 1 0 166 128 A56 56 0 1 1 128 34 Z" fill="url(#hatch-moon)" stroke="#e8d78e" stroke-width="6" stroke-linejoin="round" />
      </g>
    </svg>

    <svg class="doodle cloud cloud-a" viewBox="0 0 160 100">
      <g filter="url(#crayon)">
        <path d="M30 80 Q8 80 12 62 Q14 46 34 48 Q36 24 62 26 Q76 6 100 20 Q124 14 128 40 Q150 42 148 62 Q148 80 126 80 Z"
              fill="url(#hatch-blue)" stroke="#3d8bd6" stroke-width="5.5" stroke-linejoin="round" />
      </g>
    </svg>

    <svg class="doodle sparkles sparkles-a" viewBox="0 0 100 100">
      <g filter="url(#crayon)" fill="none" stroke="#e9b737" stroke-width="4.5" stroke-linejoin="round">
        <path class="spark s1" d="M30 10 Q32 28 48 30 Q32 32 30 50 Q28 32 12 30 Q28 28 30 10 Z" />
        <path class="spark s2" d="M70 30 Q71.5 42 82 43 Q71.5 44 70 56 Q68.5 44 58 43 Q68.5 42 70 30 Z" />
        <path class="spark s3" d="M44 62 Q45.5 74 56 75 Q45.5 76 44 88 Q42.5 76 32 75 Q42.5 74 44 62 Z" />
      </g>
    </svg>

    <svg class="doodle sparkles sparkles-b" viewBox="0 0 100 100">
      <g filter="url(#crayon)" fill="none" stroke="#e9b737" stroke-width="4.5" stroke-linejoin="round">
        <path class="spark s2" d="M40 14 Q42 32 58 34 Q42 36 40 54 Q38 36 22 34 Q38 32 40 14 Z" />
        <path class="spark s1" d="M72 56 Q73.5 68 84 69 Q73.5 70 72 82 Q70.5 70 60 69 Q70.5 68 72 56 Z" />
      </g>
    </svg>

    <svg class="doodle cloud cloud-b" viewBox="0 0 160 100">
      <g filter="url(#crayon)">
        <path d="M34 78 Q14 78 18 62 Q20 48 38 50 Q42 30 64 32 Q80 14 102 28 Q122 24 124 46 Q142 48 140 64 Q140 78 120 78 Z"
              fill="url(#hatch-blue)" stroke="#3d8bd6" stroke-width="5.5" stroke-linejoin="round" />
      </g>
    </svg>

    <!-- night only: a scatter of stars -->
    <svg v-if="isNight" class="doodle stars stars-left" viewBox="0 0 400 300">
      <g filter="url(#crayon)" fill="#f3e7b3">
        <path class="spark s1" d="M30 31 Q31.35 38.65 39 40 Q31.35 41.35 30 49 Q28.65 41.35 21 40 Q28.65 38.65 30 31 Z" />
        <path class="spark s2" d="M120 89 Q120.9 94.1 126 95 Q120.9 95.9 120 101 Q119.1 95.9 114 95 Q119.1 94.1 120 89 Z" />
        <path class="spark s3" d="M210 22 Q211.2 28.8 218 30 Q211.2 31.2 210 38 Q208.8 31.2 202 30 Q208.8 28.8 210 22 Z" />
        <path class="spark s1" d="M330 66 Q331.35 73.65 339 75 Q331.35 76.35 330 84 Q328.65 76.35 321 75 Q328.65 73.65 330 66 Z" />
        <path class="spark s2" d="M370 204 Q370.9 209.1 376 210 Q370.9 210.9 370 216 Q369.1 210.9 364 210 Q369.1 209.1 370 204 Z" />
        <path class="spark s3" d="M60 232 Q61.2 238.8 68 240 Q61.2 241.2 60 248 Q58.8 241.2 52 240 Q58.8 238.8 60 232 Z" />
        <path class="spark s2" d="M260 254 Q260.9 259.1 266 260 Q260.9 260.9 260 266 Q259.1 260.9 254 260 Q259.1 259.1 260 254 Z" />
      </g>
    </svg>
    <svg v-if="isNight" class="doodle stars stars-right" viewBox="0 0 400 300">
      <g filter="url(#crayon)" fill="#f3e7b3">
        <path class="spark s1" d="M30 31 Q31.35 38.65 39 40 Q31.35 41.35 30 49 Q28.65 41.35 21 40 Q28.65 38.65 30 31 Z" />
        <path class="spark s2" d="M120 89 Q120.9 94.1 126 95 Q120.9 95.9 120 101 Q119.1 95.9 114 95 Q119.1 94.1 120 89 Z" />
        <path class="spark s3" d="M210 22 Q211.2 28.8 218 30 Q211.2 31.2 210 38 Q208.8 31.2 202 30 Q208.8 28.8 210 22 Z" />
        <path class="spark s1" d="M330 66 Q331.35 73.65 339 75 Q331.35 76.35 330 84 Q328.65 76.35 321 75 Q328.65 73.65 330 66 Z" />
        <path class="spark s2" d="M370 204 Q370.9 209.1 376 210 Q370.9 210.9 370 216 Q369.1 210.9 364 210 Q369.1 209.1 370 204 Z" />
        <path class="spark s3" d="M60 232 Q61.2 238.8 68 240 Q61.2 241.2 60 248 Q58.8 241.2 52 240 Q58.8 238.8 60 232 Z" />
        <path class="spark s2" d="M260 254 Q260.9 259.1 266 260 Q260.9 260.9 260 266 Q259.1 260.9 254 260 Q259.1 259.1 260 254 Z" />
      </g>
    </svg>

    <svg ref="parkedEl" class="doodle rocket" :class="{ away: flying, landing }" viewBox="0 0 140 240">
      <g class="rocket-body" filter="url(#crayon)" stroke-linejoin="round">
        <path class="flame" d="M52 178 Q58 214 70 232 Q82 214 88 178 Z" fill="url(#hatch-yellow)" stroke="#e0644f" stroke-width="4" />
        <path d="M38 128 L12 176 L44 170 Z M102 128 L128 176 L96 170 Z" fill="url(#hatch-yellow)" stroke="#e0644f" stroke-width="5" />
        <path d="M70 8 Q110 50 104 132 Q100 168 92 180 L48 180 Q40 168 36 132 Q30 50 70 8 Z"
              fill="url(#hatch-blue)" stroke="#e0644f" stroke-width="6" />
        <circle cx="70" cy="82" r="16" fill="#fbf7ed" stroke="#e0644f" stroke-width="5" />
      </g>
    </svg>
  </div>

  <!-- the rocket's flight on a page change: its twin, above the page, moved by launch() -->
  <div v-if="puffs" class="puffs" :style="puffs" aria-hidden="true">
    <span v-for="n in 6" :key="n" class="puff"></span>
  </div>
  <svg ref="flierEl" v-show="flying" class="flier" viewBox="0 0 140 240" aria-hidden="true">
      <g filter="url(#crayon)" stroke-linejoin="round">
        <path class="flame" d="M52 178 Q58 214 70 232 Q82 214 88 178 Z" fill="url(#hatch-yellow)" stroke="#e0644f" stroke-width="4" />
        <path d="M38 128 L12 176 L44 170 Z M102 128 L128 176 L96 170 Z" fill="url(#hatch-yellow)" stroke="#e0644f" stroke-width="5" />
        <path d="M70 8 Q110 50 104 132 Q100 168 92 180 L48 180 Q40 168 36 132 Q30 50 70 8 Z"
              fill="url(#hatch-blue)" stroke="#e0644f" stroke-width="6" />
        <circle cx="70" cy="82" r="16" fill="#fbf7ed" stroke="#e0644f" stroke-width="5" />
      </g>
    </svg>

</template>

<style scoped>
/* fixed, so the doodles stay put while the page scrolls. The page's content sits above them (style.css),
   so on narrow screens they peek out from behind it; they ignore the mouse, so nothing can be blocked. */
.doodles { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.defs { position: absolute; }
.doodle { position: absolute; overflow: visible; }

/* ---------- wide screens: the empty paper either side of the 1126px page ---------- */
/* left: a cloud, sparkles and the parked rocket. right: sparkles and a cloud. Stars on both sides at night. */
.cloud-a { top: 120px; left: calc(50% - 563px - 190px); width: 150px; }
.sparkles-a { top: 330px; left: calc(50% - 563px - 140px); width: 90px; }
.rocket { bottom: 50px; left: calc(50% - 563px - 165px); width: 130px; }
.sparkles-b { top: 360px; right: calc(50% - 563px - 130px); width: 80px; }
.cloud-b { bottom: 110px; right: calc(50% - 563px - 180px); width: 140px; }
.stars-left { top: 60px; left: calc(50% - 563px - 210px); width: 200px; height: 380px; }
.stars-right { top: 80px; right: calc(50% - 563px - 210px); width: 200px; height: 380px; transform: scaleX(-1); }
/* the arc, east to west: rising from the right edge of the screen at 7am (or 7pm), over the top of the page at its
   highest (1pm or 1am, peeking out from behind the menu bar), and setting at the left edge at 7pm (or 7am) */
.celestial {
  --size: 140px;
  width: var(--size);
  left: calc((1 - var(--sky-p)) * (100% - var(--size)));
  top: calc(460px - var(--sky-lift) * 500px);
  transition: left 1s, top 1s, opacity 1.5s;
}
.moon { --size: 110px; }
.celestial.faint { opacity: 0.3; }

/* at night the clouds dim and the sparkles turn pale like the stars */
.night .cloud { opacity: 0.55; }
.night .sparkles g { stroke: #f3e7b3; }

/* ---------- movement ---------- */
/* clouds float along a wavy path, at different speeds so they never move in step */
.cloud-a { animation: float 9s ease-in-out infinite alternate; }
.cloud-b { animation: float 12s ease-in-out -5s infinite alternate-reverse; }
/* the sun's rays turn and it gently breathes; the moon rocks */
.sun .rays { transform-origin: 100px 100px; animation: spin 16s linear infinite; }
.sun circle { transform-origin: 100px 100px; animation: breathe 3.2s ease-in-out infinite; }
.moon { animation: rock 6s ease-in-out infinite; }
/* sparkles and stars twinkle and turn */
.spark { transform-box: fill-box; transform-origin: center; animation: twinkle 2.2s ease-in-out infinite; }
.s2 { animation-delay: -0.8s; }
.s3 { animation-delay: -1.5s; }
.sparkles-a { animation: sway 7s ease-in-out infinite; }
.sparkles-b { animation: sway 8s ease-in-out -3s infinite reverse; }
/* the parked rocket bobs and wobbles; it's hidden while its twin (in exactly the same spot) does the flying */
.rocket { animation: hover 3.4s ease-in-out infinite; }
.rocket.away { visibility: hidden; }
/* the sway on other pages pivots from the rocket's tail */
.rocket-body { transform-box: fill-box; transform-origin: 50% 90%; }
/* while landing: no bobbing (the landing ends where the bob starts, around the same centre), and the flame still roaring */
.rocket.landing { animation: none; }
.rocket.landing .flame { animation-duration: 0.12s; }
.flame { transform-box: fill-box; transform-origin: 50% 0; animation: flicker 0.3s ease-in-out infinite alternate; }

/* the flying twin: placed on the parked rocket by launch(), which also moves it */
.flier { position: fixed; z-index: 40; pointer-events: none; overflow: visible; }
.flier .flame { animation-duration: 0.09s; }

/* smoke billowing on the launch pad: crayon puffs that swell, drift apart and fade */
.puffs { position: fixed; z-index: 39; width: 0; height: 0; pointer-events: none; }
.puff {
  position: absolute;
  width: var(--puff);
  height: var(--puff);
  margin: calc(var(--puff) / -2);
  border: 3px solid #b9b3c9;
  border-radius: 50%;
  background: repeating-linear-gradient(-35deg, #d7d2e2 0 3px, transparent 3px 6px);
  opacity: 0;
  animation: puff 1.4s ease-out forwards;
}
.puff:nth-child(1) { --dx: -70%; --dy: 10%; animation-delay: 0.25s; }
.puff:nth-child(2) { --dx: 70%; --dy: 5%; animation-delay: 0.32s; }
.puff:nth-child(3) { --dx: -140%; --dy: -15%; animation-delay: 0.42s; }
.puff:nth-child(4) { --dx: 140%; --dy: -10%; animation-delay: 0.5s; }
.puff:nth-child(5) { --dx: -30%; --dy: -40%; animation-delay: 0.6s; }
.puff:nth-child(6) { --dx: 40%; --dy: -45%; animation-delay: 0.7s; }

@keyframes float {
  0% { transform: translate(-22px, 0); }
  50% { transform: translate(6px, -10px); }
  100% { transform: translate(28px, 2px); }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes rock { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
@keyframes twinkle { 0%, 100% { transform: scale(1) rotate(0); opacity: 1; } 50% { transform: scale(0.55) rotate(45deg); opacity: 0.4; } }
@keyframes sway { 0%, 100% { transform: translate(0, 0) rotate(0); } 50% { transform: translate(8px, -12px) rotate(10deg); } }
@keyframes hover { 0%, 100% { transform: translateY(0) rotate(5deg); } 50% { transform: translateY(-18px) rotate(-2deg); } }
@keyframes puff {
  0% { transform: translate(0, 0) scale(0.3); opacity: 0; }
  25% { opacity: 0.9; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1.5); opacity: 0; }
}
@keyframes flicker { from { transform: scaleY(0.8); } to { transform: scaleY(1.12); } }

/* ---------- narrower screens and phones: a smaller set peeking out from the corners ---------- */
@media (max-width: 1440px) {
  .doodles, .flier, .puffs { opacity: 0.6; }
  .cloud-a { top: 70px; left: 30%; width: 72px; }
  .sparkles-a { top: 46%; left: 6px; width: 46px; }
  .sparkles-b { top: 58%; right: 6px; width: 40px; }
  .cloud-b { display: none; }
  .rocket { bottom: 16px; left: 10px; width: 54px; }
  .stars-left { top: 64px; left: 0; width: 50%; height: 200px; }
  .stars-right { top: 80px; right: 0; width: 50%; height: 200px; }
  /* the same east-to-west arc, across the top of the screen below the menu bar */
  .celestial {
    --size: 64px;
    left: calc((1 - var(--sky-p)) * (100% - var(--size)));
    top: calc(200px - var(--sky-lift) * 130px);
  }
  .moon { --size: 52px; }
}

/* still for anyone who has asked their device for less motion (the sun and moon still move with the hours) */
@media (prefers-reduced-motion: reduce) {
  .doodle, .doodle * { animation: none !important; transition: none !important; }
  .flier, .puffs { display: none; }
  .rocket.away { visibility: visible; }
}
</style>

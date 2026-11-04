// ACTIVE: day or night, from the time in Singapore. Drives the doodles' sun and moon (Doodles.vue)
// and the night theme (html data-theme="night", colours in style.css). Students can also pick Day or Night themselves.
import { ref, computed, watch } from 'vue'

export const SUNRISE = 7 // 7am to 7pm counts as day (Singapore's sunrise and sunset barely move through the year)
export const SUNSET = 19
const MODES = ['auto', 'day', 'night']
const STORAGE_KEY = 'studyspots-theme'

// minutes since midnight in Singapore (UTC+8, no daylight saving), whatever the browser's time zone
const sgMinutes = () => Math.floor((Date.now() / 60000 + 8 * 60) % (24 * 60))

const minutes = ref(sgMinutes())
setInterval(() => (minutes.value = sgMinutes()), 60 * 1000)

// the student's choice, remembered in this browser only (it may be unavailable, e.g. in a private window)
function savedMode() {
  try {
    return MODES.includes(localStorage.getItem(STORAGE_KEY)) ? localStorage.getItem(STORAGE_KEY) : 'auto'
  } catch {
    return 'auto'
  }
}
const mode = ref(savedMode())

const timeIsDay = computed(() => minutes.value >= SUNRISE * 60 && minutes.value < SUNSET * 60)
const isNight = computed(() => (mode.value === 'auto' ? !timeIsDay.value : mode.value === 'night'))

// How far the sun (by day) or the moon (by night) is across the sky, from 0 (rising) to 1 (setting).
// Picking Day at night, or Night by day, parks it high in the sky.
const skyProgress = computed(() => {
  if (timeIsDay.value === !isNight.value) {
    const start = (isNight.value ? SUNSET : SUNRISE) * 60
    return (((minutes.value - start) % (24 * 60)) + 24 * 60) % (24 * 60) / (12 * 60)
  }
  return 0.5
})

// put the theme on <html> straight away (this file is imported by main.js before the app mounts), and on every change.
// data-bs-theme switches Bootstrap's own parts (the navbar links, Logout button, dropdowns) to match.
watch(isNight, night => {
  document.documentElement.dataset.theme = night ? 'night' : 'day'
  document.documentElement.dataset.bsTheme = night ? 'dark' : 'light'
}, { immediate: true })

export const daynight = {
  mode,
  isNight,
  skyProgress,
  // Auto -> Day -> Night -> Auto
  cycle() {
    mode.value = MODES[(MODES.indexOf(mode.value) + 1) % MODES.length]
    try {
      localStorage.setItem(STORAGE_KEY, mode.value)
    } catch {
      // not saved; it still applies until the page is reloaded
    }
  },
}

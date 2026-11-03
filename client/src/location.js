import { api } from './api'
import { mapStore } from './stores/map'

// The student's position for the nearby search (/find and the profile's top picks).
// The minimap is usually already following the user's location, so reuse that when we have it.
export function getPosition() {
  if (mapStore.userPos) return Promise.resolve({ latitude: mapStore.userPos[0], longitude: mapStore.userPos[1] })
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser does not support location access.'))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error('Could not get your location. Allow location access and try again.')),
      { timeout: 10000 }
    )
  })
}

// True when the position can be read without asking: the minimap has it, or the browser already allowed it.
export async function positionAllowed() {
  if (mapStore.userPos) return true
  try {
    return (await navigator.permissions?.query({ name: 'geolocation' }))?.state === 'granted'
  } catch {
    return false
  }
}

// Every study spot with its distance from the student (POST /api/nearby), unranked.
// onStatus gets a short message for each step, for a button label.
export async function fetchNearby(onStatus = () => {}) {
  onStatus('Getting your location…')
  const position = await getPosition()
  onStatus('Finding study spots…')
  return (await api('/api/nearby', { method: 'POST', body: position })).spots
}

// "420 m away (about 5 min walk)", "1.2 km away (about 15 min walk)"
export function walkText(meters, minutes) {
  const distance = meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`
  return `${distance} away (about ${minutes} min walk)`
}

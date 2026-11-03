import { NEEDS } from './ranking'

// Study preferences, saved on the account (GET/PUT /api/profile/preferences) and edited on the profile page.
// They feed rankSpots in ranking.js; the server checks the same values in lib/preferences.js.

export const NEED_LEVELS = [
  { value: 'off', label: 'Don’t mind' },
  { value: 'nice', label: 'Nice to have' },
  { value: 'must', label: 'Must have' },
]
export const DISTANCE_LEVELS = [
  { value: 'low', label: 'Not much' },
  { value: 'medium', label: 'Somewhat' },
  { value: 'high', label: 'A lot' },
]
export const SEAT_CHOICES = [
  { value: null, label: 'Any' },
  { value: 2, label: '2+' },
  { value: 4, label: '4+' },
  { value: 6, label: '6+' },
]

export const needList = Object.entries(NEEDS).map(([id, n]) => ({ id, label: n.label }))

// The arguments rankSpots(spots, needs, options) takes.
export function rankingInput(prefs) {
  return {
    needs: needList.filter(n => prefs.needs[n.id] !== 'off').map(n => ({ id: n.id, level: prefs.needs[n.id] })),
    options: { seatsNeeded: prefs.seats, distanceImportance: prefs.distance },
  }
}

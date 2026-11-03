// Crowd-sourced issue alerts for a study spot ("aircon broken", "room is locked"...).
// The keys match ALERT_TYPES in controllers/studyspot-alert-controller.js.
export const ALERT_TYPES = [
  { key: 'Closed', label: 'Closed / locked', icon: '🚫' },
  { key: 'Aircon', label: 'Aircon issue', icon: '🌡️' },
  { key: 'WiFi', label: 'Wi-Fi down', icon: '📶' },
  { key: 'Event', label: 'Event / booked', icon: '📅' },
  { key: 'Other', label: 'Other issue', icon: '⚠️' },
]

const byKey = Object.fromEntries(ALERT_TYPES.map(t => [t.key, t]))
export const alertLabel = type => byKey[type]?.label || type
export const alertIcon = type => byKey[type]?.icon || '⚠️'

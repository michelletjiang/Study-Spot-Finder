// Opening hours for the "Open / Closes in / Closed" badge on the home page building cards.
// PLACEHOLDER TIMES: check each building's real hours (and update them for vacation/exam periods).
// Times are 24-hour "HH:MM" in Singapore time; null means closed all day. Buildings not listed get no badge.
const SCHOOL = { weekday: ['07:00', '23:00'], saturday: ['08:00', '18:00'], sunday: null }

export const buildingHours = {
  'Li Ka Shing Library': { weekday: ['08:00', '22:00'], saturday: ['09:00', '17:00'], sunday: null },
  'SCIS 1': SCHOOL,
  'SCIS 2': SCHOOL,
  'Yong Pung How School of Law': SCHOOL,
  'School of Accountancy': SCHOOL,
  'School of Social Sciences / College of Integrative Studies': SCHOOL,
  'Lee Kong Chian School of Business': SCHOOL,
}

// a closing time this close counts as "closing soon"
const SOON_MINUTES = 60

const toMinutes = hhmm => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// "22:00" -> "10pm", "08:30" -> "8:30am"
function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'am' : 'pm'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`
}

function hoursOn(hours, day) {
  if (day === 0) return hours.sunday
  if (day === 6) return hours.saturday
  return hours.weekday
}

// Singapore day of week (0 = Sunday) and minutes since midnight, whatever timezone the browser is in
function singaporeNow(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Singapore', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(now).map(p => [p.type, p.value]))
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

// Returns { state: 'open' | 'closing' | 'closed', text } for the badge, or null if we don't know the hours
export function openStatus(buildingName, now = new Date()) {
  const hours = buildingHours[buildingName]
  if (!hours) return null
  const { day, minutes } = singaporeNow(now)

  const today = hoursOn(hours, day)
  if (today && minutes >= toMinutes(today[0]) && minutes < toMinutes(today[1])) {
    const left = toMinutes(today[1]) - minutes
    if (left <= SOON_MINUTES) return { state: 'closing', text: `Closes in ${left} min` }
    return { state: 'open', text: `Open · closes ${formatTime(today[1])}` }
  }

  // closed: find the next opening, later today or on one of the next 7 days
  if (today && minutes < toMinutes(today[0])) return { state: 'closed', text: `Closed · opens ${formatTime(today[0])}` }
  for (let i = 1; i <= 7; i++) {
    const next = hoursOn(hours, (day + i) % 7)
    if (!next) continue
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(day + i) % 7]
    return { state: 'closed', text: `Closed · opens ${weekday} ${formatTime(next[0])}` }
  }
  return { state: 'closed', text: 'Closed' }
}

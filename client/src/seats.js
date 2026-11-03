// Helpers for check-ins and free seats, shared by the room panel, floor plan, /find, favourites and the
// "Busiest times" chart. Seats free = the spot's seatCount - people checked in through the app,
// so it's an estimate (people who didn't check in aren't counted) and is always shown with a "~".

// How much room is left, for colours: 'plenty' (half or more free) | 'some' | 'few' | 'full'
export function seatsLevel(checkedIn, seatCount) {
  const free = Math.max(0, seatCount - checkedIn)
  if (free === 0) return 'full'
  if (free / seatCount >= 0.5) return 'plenty'
  if (free / seatCount >= 0.2) return 'some'
  return 'few'
}

export const SEAT_LEVELS = [
  { key: 'plenty', label: 'Half or more free' },
  { key: 'some', label: 'Some seats' },
  { key: 'few', label: 'A few seats' },
  { key: 'full', label: 'Full' },
]

// "~18 of 30 seats free"
export const seatsFreeText = (checkedIn, seatCount) => `~${Math.max(0, seatCount - checkedIn)} of ${seatCount} seats free`

export const peopleText = n => `${n} ${n === 1 ? 'person' : 'people'}`

// 5:30 pm, in Singapore time
export const clockTime = date =>
  new Date(date).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore' })

// ---------- busiest times ----------
// A pattern comes from GET /api/checkins/:spotId/pattern:
// { total, seatCount, days[0 = Sunday .. 6][hour] = { people, taken (0..1) } | null }

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// 14 -> '2 pm', 0 -> '12 am'
export const hourLabel = hour => `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`

// 0.42 -> '42%'
export const percent = share => `${Math.round(share * 100)}%`

// today's weekday and hour in Singapore (UTC+8, no daylight saving), whatever the browser's time zone
export function sgNow() {
  const local = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return { day: local.getUTCDay(), hour: local.getUTCHours() }
}

// a spot needs this many check-ins before we'll say when it's usually busiest
const MIN_FOR_SUMMARY = 5

// the hour with the most seats usually taken on that day (earlier wins a tie), or null
export function busiestHour(pattern, day) {
  if (!pattern || pattern.total < MIN_FOR_SUMMARY) return null
  let best = null
  pattern.days[day].forEach((cell, hour) => {
    if (cell && (!best || cell.taken > best.taken)) best = { hour, ...cell }
  })
  return best
}

// "On Tuesdays it's usually busiest around 2 pm (~40% of seats taken)." or null when there isn't enough data
export function busiestSummary(pattern, day) {
  const best = busiestHour(pattern, day)
  return best && `On ${DAY_NAMES[day]}s it's usually busiest around ${hourLabel(best.hour)} (~${percent(best.taken)} of seats taken).`
}

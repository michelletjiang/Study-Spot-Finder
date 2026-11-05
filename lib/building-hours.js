// Opening hours, so students can only check in while a building is open (controllers/checkin-controller.js),
// and a check-in ends at closing time at the latest.
// KEEP IN SYNC with client/src/buildingHours.js, which shows the same hours as the Open / Closed badges.
// PLACEHOLDER TIMES: check each building's real hours (and update them for vacation/exam periods).
// Times are 24-hour "HH:MM" in Singapore time; null means closed all day.
// Buildings not listed have no known hours, so check-ins there are always allowed.
const SCHOOL = { weekday: ['07:00', '23:00'], saturday: ['08:00', '18:00'], sunday: null };

const BUILDING_HOURS = {
  'CONNEX': { weekday: ['08:00', '22:30'], saturday: ['08:00', '17:00'], sunday: null },
  'Li Ka Shing Library': { weekday: ['08:00', '22:00'], saturday: ['09:00', '17:00'], sunday: null },
  'School of Computing and Information Systems 1': SCHOOL,
  'SCIS 2 / SOE': SCHOOL,
  'Yong Pung How School of Law': SCHOOL,
  'School of Accountancy': SCHOOL,
  'School of Social Sciences / College of Integrative Studies': SCHOOL,
  'Lee Kong Chian School of Business': SCHOOL,
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SG_OFFSET_MS = 8 * 60 * MINUTE_MS; // Singapore is UTC+8 all year (no daylight saving)
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toMinutes = hhmm => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// "22:00" -> "10pm", "08:30" -> "8:30am"
function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

function hoursOn(hours, day) {
  if (day === 0) return hours.sunday;
  if (day === 6) return hours.saturday;
  return hours.weekday;
}

// Can a student check in to this building now?
// Open:   { open: true, closesAt: Date } (closesAt is null when we don't know the building's hours)
// Closed: { open: false, message: 'Yong Pung How School of Law is closed right now. It opens Mon 7am.' }
function checkInWindow(buildingName, now = new Date()) {
  const hours = BUILDING_HOURS[buildingName];
  if (!hours) return { open: true, closesAt: null };

  const sg = now.getTime() + SG_OFFSET_MS;
  const msToday = ((sg % DAY_MS) + DAY_MS) % DAY_MS; // time since midnight in Singapore
  const minutes = msToday / MINUTE_MS;
  const day = new Date(sg).getUTCDay();

  const today = hoursOn(hours, day);
  if (today && minutes >= toMinutes(today[0]) && minutes < toMinutes(today[1])) {
    return { open: true, closesAt: new Date(now.getTime() - msToday + toMinutes(today[1]) * MINUTE_MS) };
  }

  const closed = `${buildingName} is closed right now.`;
  if (today && minutes < toMinutes(today[0])) {
    return { open: false, message: `${closed} It opens at ${formatTime(today[0])}.` };
  }
  for (let i = 1; i <= 7; i++) {
    const next = hoursOn(hours, (day + i) % 7);
    if (next) return { open: false, message: `${closed} It opens ${WEEKDAYS[(day + i) % 7]} ${formatTime(next[0])}.` };
  }
  return { open: false, message: closed };
}

module.exports = { checkInWindow, BUILDING_HOURS };

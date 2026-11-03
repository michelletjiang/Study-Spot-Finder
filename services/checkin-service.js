// services/checkin-service.js
// Check-ins: a student says "I'm sitting here", which takes one of the spot's seats until they
// check out or 3 hours pass. Seats free = the spot's seatCount - people checked in.
// Used by the check-in routes, the nearby search (/find) and the floor plan.

const CheckIn = require('../models/checkin-model');

const CHECKIN_LENGTH_MS = 3 * 60 * 60 * 1000; // a check-in ends on its own after 3 hours

const active = () => ({ endsAt: { $gt: new Date() } });

// How many people are checked in to each spot right now: { spotId: count }. Spots with nobody are left out.
async function countCheckedIn(spotIds) {
  if (!spotIds.length) return {};
  const rows = await CheckIn.find({ spot: { $in: spotIds }, ...active() }, { spot: 1 }).lean();
  const counts = {};
  for (const r of rows) counts[String(r.spot)] = (counts[String(r.spot)] || 0) + 1;
  return counts;
}

// The user's current check-in, or null.
function getMyCheckIn(userId) {
  return CheckIn.findOne({ userId, ...active() });
}

// Check the user in to a spot. A student can only sit in one place, so any other check-in ends now.
// Returns { checkIn, previousSpotId } (previousSpotId: the spot they were moved out of, or null).
async function checkIn(userId, spotId) {
  const previous = await getMyCheckIn(userId);
  if (previous) {
    previous.endsAt = new Date();
    await previous.save();
  }
  const created = await CheckIn.create({ spot: spotId, userId, endsAt: new Date(Date.now() + CHECKIN_LENGTH_MS) });
  return { checkIn: created, previousSpotId: previous ? String(previous.spot) : null };
}

// End the user's current check-in. Returns the spot id they left, or null if they weren't checked in.
async function checkOut(userId) {
  const current = await getMyCheckIn(userId);
  if (!current) return null;
  current.endsAt = new Date();
  await current.save();
  return String(current.spot);
}

// ---------- busiest times ----------

const PATTERN_WINDOW_MS = 8 * 7 * 24 * 60 * 60 * 1000; // look at the last 8 weeks
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const SG_OFFSET_MS = 8 * HOUR_MS; // Singapore is UTC+8 all year (no daylight saving)

// How full a spot usually is, by weekday and hour in Singapore time, from the last 8 weeks of check-ins.
// Each check-in counts for every minute between checking in and its end, so someone who sat from
// 1:30 to 3:00 pm counts half in the 1 pm hour and fully in the 2 pm hour.
// Returns { total, seatCount, days } where days[0 = Sunday .. 6][hour 0..23] is
// { people: average number checked in, taken: share of seats taken (0..1) } or null if nobody was ever there then.
async function getWeeklyPattern(spot) {
  const now = Date.now();
  const since = now - PATTERN_WINDOW_MS;
  const list = await CheckIn.find({ spot: spot._id, endsAt: { $gt: new Date(since) } }, { createdAt: 1, endsAt: 1 }).lean();

  const minutes = Array.from({ length: 7 }, () => new Array(24).fill(0)); // person-minutes per weekday-hour
  let first = now;
  for (const c of list) {
    let t = Math.max(new Date(c.createdAt).getTime(), since);
    const end = Math.min(new Date(c.endsAt).getTime(), now);
    first = Math.min(first, t);
    while (t < end) {
      const local = new Date(t + SG_OFFSET_MS); // read the UTC fields of this as Singapore time
      const nextHour = Math.floor((t + SG_OFFSET_MS) / HOUR_MS) * HOUR_MS + HOUR_MS - SG_OFFSET_MS;
      const stop = Math.min(end, nextHour);
      minutes[local.getUTCDay()][local.getUTCHours()] += (stop - t) / 60000;
      t = stop;
    }
  }

  // average over the weeks we have data for (up to 8), so a new feature isn't diluted by empty weeks
  const weeks = Math.min(8, Math.max(1, Math.ceil((now - first) / WEEK_MS)));
  const seatCount = spot.seatCount || 1;
  return {
    total: list.length,
    seatCount: spot.seatCount,
    days: minutes.map(hours => hours.map(m => {
      if (!m) return null;
      const people = m / 60 / weeks;
      return { people, taken: Math.min(1, people / seatCount) };
    })),
  };
}

module.exports = { CHECKIN_LENGTH_MS, countCheckedIn, getMyCheckIn, checkIn, checkOut, getWeeklyPattern };

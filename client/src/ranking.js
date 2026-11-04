// Ranks study spots for the "Find the right study spot" page (views/FindSpotView.vue, at /find).
// Pure functions: no Vue, no server, easy to tune. Spots come from POST /api/nearby.

// Each need turns a study spot into a "match" from 0 (not at all) to 1 (fully).
// known(s) is false when we have no data for that spot yet (e.g. nobody has reviewed it):
// it then scores a neutral 0.5, never counts as meeting the need, and is listed with its unknownNote.
// Only needs we have data for: noise from what checked-in students rated it in the last hour, rating from reviews,
// power from the spot itself, and "seats free" from the people checked in right now.

export const NEEDS = {
  quiet: {
    label: 'Quiet',
    unknownNote: 'no noise ratings in the last hour',
    known: (s) => s.liveNoise != null,
    match: (s) => (s.liveNoise == null ? 0.5 : 1 - s.liveNoise / 2), // liveNoise 0 (Quiet) to 2 (Loud) -> 1 to 0
  },
  power: { label: 'Power outlets', known: () => true, match: (s) => (s.hasPower ? 1 : 0) },
  rated: {
    label: 'Well reviewed (4★+)',
    unknownNote: 'no reviews yet',
    known: (s) => s.avgRating != null,
    match: (s) => (s.avgRating == null ? 0.5 : (s.avgRating - 1) / 4), // rating 1 to 5 -> 0 to 1
  },
  seatsFree: {
    label: 'Seats free now',
    unknownNote: 'nobody checked in via the app',
    known: (s) => s.checkedIn > 0,
    // share of seats free, where half or more free counts as fully met: 30 seats, 6 people -> 24 free -> 1; 27 people -> 0.2
    match: (s) => (s.checkedIn > 0 ? Math.min(1, Math.max(0, s.seats - s.checkedIn) / s.seats / 0.5) : 0.5),
  },
}

// Active alerts push a spot down instead of hiding it (an alert can be wrong or out of date).
// Each alert multiplies the score; "Closed" counts most because the room can't be used at all.
const ALERT_PENALTY = { Closed: 0.1, Event: 0.6, Aircon: 0.85, WiFi: 0.85, Other: 0.9 }

function alertFactor(spot) {
  return (spot.alerts || []).reduce((factor, type) => factor * (ALERT_PENALTY[type] ?? 0.9), 1)
}

// How much each importance level counts. "must" also removes spots that fail the need.
const LEVEL_WEIGHT = { nice: 1, important: 3, must: 3 }

// A spot "meets" a need if its match is at least this (so mostly-Quiet reviews, or a 4★+ average).
const MEETS = 0.75

// The user chooses how much distance matters; the needs share is what's left (1 - distance share).
const DISTANCE_SHARES = { low: 0.15, medium: 0.3, high: 0.5 }

// Step A: filter. A spot failing ANY "must have" is removed completely.
function filterSpots(spots, needs) {
  const musts = needs.filter((n) => n.level === 'must')
  return spots.filter((s) => musts.every((n) => NEEDS[n.id].match(s) >= MEETS))
}

// Step B: score. Closer is better, with diminishing returns: 0 km = 1.0, 1 km = 0.5, 4 km = 0.2
function distanceScore(meters) {
  return 1 / (1 + meters / 1000)
}

// Weighted average of the match values: (sum of weight x match) / (sum of weights)
function needScore(spot, needs) {
  let total = 0
  let earned = 0
  for (const n of needs) {
    const w = LEVEL_WEIGHT[n.level]
    total += w
    earned += w * NEEDS[n.id].match(spot)
  }
  return earned / total
}

function scoreSpot(spot, needs, distanceShare) {
  const dist = distanceScore(spot.distanceMeters)
  const alerts = alertFactor(spot)
  if (needs.length === 0) return { score: dist * alerts, needScore: null, distanceScore: dist, alertFactor: alerts } // nothing picked: nearest first
  const need = needScore(spot, needs)
  return { score: ((1 - distanceShare) * need + distanceShare * dist) * alerts, needScore: need, distanceScore: dist, alertFactor: alerts }
}

// Which of the user's picks does this spot meet, miss, or have no data for? (shown on each card)
function explain(spot, needs) {
  const matched = []
  const missing = []
  const unknown = []
  for (const n of needs) {
    const need = NEEDS[n.id]
    if (!need.known(spot)) unknown.push(`${need.label} (${need.unknownNote})`)
    else (need.match(spot) >= MEETS ? matched : missing).push(need.label)
  }
  return { matched, missing, unknown }
}

// Step C: sort. Highest score first; nearer spots win ties.
// options.seatsNeeded: spots with fewer seats are omitted (null = no requirement)
// options.distanceImportance: 'low' | 'medium' | 'high'
export function rankSpots(spots, needs, options = {}) {
  const { seatsNeeded = null, distanceImportance = 'medium' } = options
  const distanceShare = DISTANCE_SHARES[distanceImportance] ?? DISTANCE_SHARES.medium

  const enoughSeats = seatsNeeded ? spots.filter((s) => s.seats >= seatsNeeded) : spots
  const kept = filterSpots(enoughSeats, needs)

  const ranked = kept
    .map((s) => ({ ...s, ...scoreSpot(s, needs, distanceShare), ...explain(s, needs) }))
    .sort((a, b) => b.score - a.score || a.distanceMeters - b.distanceMeters)

  return {
    ranked,
    excludedBySeats: spots.length - enoughSeats.length,
    excludedByMustHaves: enoughSeats.length - kept.length,
  }
}

// What kind of room a study spot is, worked out from its name (spots don't store a type).
// Used by the building page's filters and details panel.

const TYPES = [
  [/\bGSR\b|group study|^RM\d/i, 'Group study room'],
  [/seminar/i, 'Seminar room'],
  [/classroom/i, 'Classroom'],
  [/quiet/i, 'Quiet zone'],
  [/learning common|study (area|space)|lounge|commons|terrace|scape|way\b/i, 'Open study area'],
  [/library/i, 'Library'],
  [/lab\b|labs\b/i, 'Lab'],
]

export function roomType(spot) {
  return TYPES.find(([pattern]) => pattern.test(spot.name))?.[1] || 'Study spot'
}

// small bookable rooms for a group: GSRs, or anything with 3-12 seats that isn't an open area
export function isGroupRoom(spot) {
  const type = roomType(spot)
  if (type === 'Group study room') return true
  return type !== 'Open study area' && type !== 'Quiet zone' && spot.seatCount >= 3 && spot.seatCount <= 12
}

export function isQuiet(spot) {
  return spot.noiseLevel === 'Quiet' || roomType(spot) === 'Quiet zone'
}

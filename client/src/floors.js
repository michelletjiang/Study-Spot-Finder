// Floor helpers shared by the building page and the floor page.

// old EJS pages saved floors as typed, so treat "b1", " 3" and "Level 3" the same as "B1" and "3"
export function normalizeFloor(floor) {
  return String(floor).trim().toUpperCase().replace(/^(LEVEL|LVL|L)\s*(?=\d)/, '')
}

// basements first (B2, B1), then 1, 2, 3...
export function floorOrder(floor) {
  return floor.startsWith('B') ? -Number(floor.slice(1)) : Number(floor)
}

export function floorLabel(floor) {
  return floor.startsWith('B') ? floor : `Level ${floor}`
}

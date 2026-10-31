// ACTIVE (comparison): pure functions for the shortlist rules, kept separate so test/compare-selection.test.js can check them.
// The shortlist holds at most three spots.
export const MAX_COMPARISON_SPOTS = 3

// Add a spot id, or remove it if it is already there.
export function toggleSelection(ids, id) {
  // Ids are always text so the same spot compares equal however it arrives.
  id = String(id)
  // Already chosen: return the list without it.
  if (ids.includes(id)) return ids.filter(item => item !== id)
  // Not chosen: add it only while there is room. When full, the same list comes back unchanged, which compare.js reads as a refusal.
  return ids.length < MAX_COMPARISON_SPOTS ? [...ids, id] : ids
}

// Clean a list of ids read from the URL: text only, no duplicates, at most three.
export function restoreSelection(ids) {
  return [...new Set(ids.map(String))].slice(0, MAX_COMPARISON_SPOTS)
}

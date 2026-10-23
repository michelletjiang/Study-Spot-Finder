export const MAX_COMPARISON_SPOTS = 3

export function toggleSelection(ids, id) {
  id = String(id)
  if (ids.includes(id)) return ids.filter(item => item !== id)
  return ids.length < MAX_COMPARISON_SPOTS ? [...ids, id] : ids
}

export function restoreSelection(ids) {
  return [...new Set(ids.map(String))].slice(0, MAX_COMPARISON_SPOTS)
}

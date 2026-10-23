export function idsAfterRemoval(ids, id) {
  return ids.filter(item => String(item) !== String(id))
}

export function comparisonLocation(ids) {
  return { path: '/compare', query: { ids: ids.join(',') } }
}

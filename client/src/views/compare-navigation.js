// ACTIVE (comparison): small helpers for the comparison page's links, in their own file so test/compare-runtime.test.js can check them.
// Return the shortlist without one id.
export function idsAfterRemoval(ids, id) {
  return ids.filter(item => String(item) !== String(id))
}

// Where "Compare selected" should go: the compare page with the ids in the URL, or home when fewer than two are chosen.
export function comparisonLocation(ids) {
  return ids.length >= 2
    // Two or three ids make /compare?ids=a,b[,c].
    ? { path: '/compare', query: { ids: ids.join(',') } }
    // Otherwise there is nothing to compare, so go home.
    : { path: '/' }
}

// Small helpers for showing reviews, shared by the spot page and the floorplan panel.

export function formatDate(date) {
  return new Date(date).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })
}

// most common noise level across a spot's reviews (older reviews may not have one)
export function noiseSummary(reviews) {
  const counts = {}
  for (const r of reviews) if (r.noiseLevel) counts[r.noiseLevel] = (counts[r.noiseLevel] || 0) + 1
  const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return top ? `${top[0]} (${top[1]} of ${reviews.length} reviews)` : 'No reports yet'
}

export function averageRating(reviews) {
  if (reviews.length === 0) return null
  return (reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
}

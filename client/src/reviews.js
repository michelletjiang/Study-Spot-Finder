// Small helpers for showing reviews, shared by the spot page and the floorplan panel.

export function formatDate(date) {
  return new Date(date).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })
}

// "12 min ago", "2 days ago"
export function timeAgo(date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  return new Date(date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
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

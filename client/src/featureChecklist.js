// Features are deliberately limited to facts stored on study spots.
export const STUDY_FEATURES = [
  { id: 'power', label: 'Power socket', matches: spot => spot.hasPowerSocket === true },
  { id: 'quiet', label: 'Quiet environment', matches: spot => spot.noiseLevel === 'Quiet' },
]

export function spotMatchesFeatures(spot, selectedIds) {
  return selectedIds.every(id => {
    const feature = STUDY_FEATURES.find(option => option.id === id)
    return feature ? feature.matches(spot) : false
  })
}

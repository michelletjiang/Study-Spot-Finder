import { describe, expect, it } from 'vitest'
import { spotMatchesFeatures } from '../../client/src/featureChecklist'

describe('study feature checklist matching', () => {
  const spot = { hasPowerSocket: true, noiseLevel: 'Quiet' }

  it('matches a spot when it has every selected feature', () => {
    expect(spotMatchesFeatures(spot, ['power', 'quiet'])).toBe(true)
    expect(spotMatchesFeatures({ ...spot, noiseLevel: 'Loud' }, ['power', 'quiet'])).toBe(false)
  })

  it('treats an empty checklist as matching every spot', () => {
    expect(spotMatchesFeatures({ hasPowerSocket: false, noiseLevel: 'Loud' }, [])).toBe(true)
  })
})

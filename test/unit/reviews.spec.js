// reviews.spec.js
// Unit tests (Vitest) for lib/reviews.js, the checks every new or edited review goes through.
// Run: npm run test:unit

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { validateReview, NOISE_LEVELS } = require('../../lib/reviews')

// A review that passes every check; each test changes one field.
const good = { title: 'Great spot', content: 'Quiet in the mornings', rating: 4, noiseLevel: 'Quiet' }

describe('TestSuite1: validateReview accepts valid reviews', () => {
  it('Test1: accepts a complete review', () => {
    expect(validateReview(good)).toBeNull()
  })

  it('Test2: accepts every noise level', () => {
    for (const noiseLevel of NOISE_LEVELS) {
      expect(validateReview({ ...good, noiseLevel })).toBeNull()
    }
  })

  it('Test3: accepts the rating limits 1 and 5, and a rating sent as text', () => {
    expect(validateReview({ ...good, rating: 1 })).toBeNull()
    expect(validateReview({ ...good, rating: 5 })).toBeNull()
    expect(validateReview({ ...good, rating: '3' })).toBeNull()
  })
})

describe('TestSuite2: validateReview rejects missing fields', () => {
  it('Test1: rejects a blank title, content or rating', () => {
    expect(validateReview({ ...good, title: '   ' })).toBe('All fields are required.')
    expect(validateReview({ ...good, content: '' })).toBe('All fields are required.')
    expect(validateReview({ ...good, rating: '' })).toBe('All fields are required.')
  })

  it('Test2: rejects a review with no noise level', () => {
    expect(validateReview({ ...good, noiseLevel: undefined })).toBe('All fields are required.')
  })
})

describe('TestSuite3: validateReview rejects bad values', () => {
  it('Test1: rejects ratings outside 1 to 5', () => {
    expect(validateReview({ ...good, rating: 0 })).toBe('Rating must be between 1 and 5.')
    expect(validateReview({ ...good, rating: 6 })).toBe('Rating must be between 1 and 5.')
    expect(validateReview({ ...good, rating: 'abc' })).toBe('Rating must be between 1 and 5.')
  })

  it('Test2: rejects a noise level that is not Quiet, Moderate or Loud', () => {
    expect(validateReview({ ...good, noiseLevel: 'Silent' })).toBe('Noise level must be Quiet, Moderate or Loud.')
    expect(validateReview({ ...good, noiseLevel: 'quiet' })).toBe('Noise level must be Quiet, Moderate or Loud.')
  })
})

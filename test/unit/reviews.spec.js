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

const { validateVote, withVotes, sortByScore } = require('../../lib/reviews')

describe('TestSuite4: validateVote', () => {
  const review = { userId: 'author1' }

  it('Test1: allows up, down and none from another user', () => {
    for (const vote of ['up', 'down', 'none']) {
      expect(validateVote(review, 'student2', vote)).toBeNull()
    }
  })

  it('Test2: rejects anything else', () => {
    expect(validateVote(review, 'student2', 'sideways')).toBe('Vote must be up, down or none.')
    expect(validateVote(review, 'student2', undefined)).toBe('Vote must be up, down or none.')
  })

  it('Test3: stops authors voting on their own review', () => {
    expect(validateVote(review, 'author1', 'up')).toBe('You cannot vote on your own review.')
  })
})

describe('TestSuite5: withVotes', () => {
  const review = { _id: 'r1', title: 'Nice', upvotes: ['a', 'b', 'c'], downvotes: ['d'] }

  it('Test1: counts votes and works out the score', () => {
    const out = withVotes(review, 'zzz')
    expect(out.upvoteCount).toBe(3)
    expect(out.downvoteCount).toBe(1)
    expect(out.score).toBe(2)
  })

  it('Test2: reports the viewer\'s own vote', () => {
    expect(withVotes(review, 'b').myVote).toBe('up')
    expect(withVotes(review, 'd').myVote).toBe('down')
    expect(withVotes(review, 'zzz').myVote).toBe('none')
  })

  it('Test3: hides who voted and keeps the other fields', () => {
    const out = withVotes(review, 'a')
    expect(out).not.toHaveProperty('upvotes')
    expect(out).not.toHaveProperty('downvotes')
    expect(out.title).toBe('Nice')
  })

  it('Test4: treats a review with no votes yet as 0', () => {
    const out = withVotes({ _id: 'r2' }, 'a')
    expect(out.score).toBe(0)
    expect(out.myVote).toBe('none')
  })

  it('Test5: works on a Mongoose document (uses toObject)', () => {
    const doc = { toObject: () => ({ _id: 'r3', upvotes: ['a'], downvotes: [] }) }
    expect(withVotes(doc, 'a')).toMatchObject({ _id: 'r3', score: 1, myVote: 'up' })
  })
})

describe('TestSuite6: sortByScore', () => {
  it('Test1: puts the highest score first, newest first on a tie', () => {
    const reviews = [
      { _id: 'low',      score: -1, createdAt: '2026-10-03' },
      { _id: 'tieOlder', score: 2,  createdAt: '2026-10-01' },
      { _id: 'tieNewer', score: 2,  createdAt: '2026-10-02' },
      { _id: 'zero',     score: 0,  createdAt: '2026-10-04' }
    ]
    expect(sortByScore(reviews).map(r => r._id)).toEqual(['tieNewer', 'tieOlder', 'zero', 'low'])
  })

  it('Test2: does not change the original array', () => {
    const reviews = [{ score: 0, createdAt: '2026-10-01' }, { score: 5, createdAt: '2026-10-01' }]
    sortByScore(reviews)
    expect(reviews[0].score).toBe(0)
  })
})

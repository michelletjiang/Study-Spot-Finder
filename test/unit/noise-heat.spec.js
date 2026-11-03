// noise-heat.spec.js
// Unit tests (Vitest) for the noise heatmap: its score (services/noise-service.js), who may report
// (controllers/noise-controller.js) and its colours and labels (client/src/heatmap.js).
//
// Run: npm run test:unit

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRequire } from 'node:module'
import { heatColour, heatEnabled, heatLabel, heatTextColour } from '../../client/src/heatmap.js'

const require = createRequire(import.meta.url)
const { noiseScore, summarise } = require('../../services/noise-service')
const { apiReport } = require('../../controllers/noise-controller')
const NoiseReport = require('../../models/noise-report-model')
const CheckIn = require('../../models/checkin-model')
const StudySpot = require('../../models/studyspot-model')

const minutesAgo = minutes => new Date(Date.now() - minutes * 60 * 1000)

describe('noiseScore', () => {
  it('puts each single level on the 0 to 2 scale', () => {
    expect(noiseScore([{ status: 'Quiet', createdAt: minutesAgo(1) }])).toBe(0)
    expect(noiseScore([{ status: 'Moderate', createdAt: minutesAgo(1) }])).toBe(1)
    expect(noiseScore([{ status: 'Loud', createdAt: minutesAgo(1) }])).toBe(2)
  })

  it('lands in the middle when equally recent reports disagree', () => {
    const now = new Date()
    expect(noiseScore([{ status: 'Quiet', createdAt: now }, { status: 'Loud', createdAt: now }])).toBeCloseTo(1, 1)
  })

  it('lets newer reports count more', () => {
    const score = noiseScore([{ status: 'Loud', createdAt: minutesAgo(1) }, { status: 'Quiet', createdAt: minutesAgo(28) }])
    expect(score).toBeGreaterThan(1)
  })

  it('leaves summarise() choosing one level', () => {
    const summary = summarise([{ status: 'Loud', createdAt: minutesAgo(1) }])
    expect(summary.current).toBe('Loud')
    expect(summary.count).toBe(1)
  })
})

describe('apiReport: only students checked in to the room can rate it', () => {
  const SPOT = '64b000000000000000000001'
  const OTHER_SPOT = '64b000000000000000000002'

  afterEach(() => vi.restoreAllMocks())

  // runs the controller with the database replaced; checkedInAt is the spot the user is checked in to, or null
  async function report(checkedInAt, status = 'Quiet') {
    vi.spyOn(StudySpot, 'findById').mockResolvedValue({ _id: SPOT, seatCount: 6 })
    vi.spyOn(CheckIn, 'findOne').mockResolvedValue(checkedInAt && { spot: checkedInAt })
    const removed = vi.spyOn(NoiseReport, 'deleteMany').mockResolvedValue({ deletedCount: 0 })
    const created = vi.spyOn(NoiseReport, 'create').mockResolvedValue({})
    vi.spyOn(NoiseReport, 'find').mockReturnValue({ sort: () => ({ lean: async () => [] }) })

    const res = { status: vi.fn(() => res), json: vi.fn() }
    await apiReport({ params: { id: SPOT }, body: { status }, session: { user: { id: 'user1' } } }, res)
    return { res, created, removed }
  }

  it('refuses someone who is not checked in anywhere', async () => {
    const { res, created } = await report(null)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(created).not.toHaveBeenCalled()
  })

  it('refuses someone checked in to a different room', async () => {
    const { res, created } = await report(OTHER_SPOT)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(created).not.toHaveBeenCalled()
  })

  it('saves the rating of someone checked in here, replacing their recent one', async () => {
    const { res, created, removed } = await report(SPOT, 'Loud')
    expect(res.status).toHaveBeenCalledWith(201)
    expect(removed).toHaveBeenCalledTimes(1)
    expect(created).toHaveBeenCalledWith({ spot: SPOT, userId: 'user1', status: 'Loud' })
  })

  it('rejects a level that is not a noise level', async () => {
    const { res, created } = await report(SPOT, 'Full')
    expect(res.status).toHaveBeenCalledWith(400)
    expect(created).not.toHaveBeenCalled()
  })
})

describe('heatColour', () => {
  it('runs from pale blue to deep red', () => {
    expect(heatColour(0)).toBe('rgb(214, 228, 245)')
    expect(heatColour(2)).toBe('rgb(179, 38, 62)')
  })

  it('stays on the scale for scores outside it', () => {
    expect(heatColour(-1)).toBe(heatColour(0))
    expect(heatColour(9)).toBe(heatColour(2))
  })
})

describe('heatTextColour', () => {
  it('uses ink on the pale colours and white on the deep red', () => {
    expect(heatTextColour(0)).toBe('#28263f')
    expect(heatTextColour(2)).toBe('#fff')
  })
})

describe('heatLabel', () => {
  const rect = (w, h) => `0,0 ${w},0 ${w},${h} 0,${h}`
  const texts = label => label.rows.map(row => row.text)

  it('gives a roomy room its name and report count, centred', () => {
    const label = heatLabel(rect(160, 80), 'Active Learning Classroom 4-1', 3, 1080)
    expect(label.x).toBeCloseTo(80)
    expect(texts(label).join(' ')).toBe('Active Learning Classroom 4-1 3 reports')
    expect(label.rows[label.rows.length - 1].note).toBe(true)
  })

  it('shortens the name to fit smaller rooms', () => {
    expect(texts(heatLabel(rect(50, 21), 'Meeting Pod 4-1', 2, 1080))).toEqual(['Pod 4-1'])
    expect(texts(heatLabel(rect(30, 20), 'Study Booth 4-1', 0, 1080))).toEqual(['4-1'])
  })

  it('says when a room has no reports', () => {
    expect(texts(heatLabel(rect(160, 80), 'Maker Space', 0, 1080))).toContain('no reports')
  })
})

describe('heatEnabled', () => {
  it('is only on for the trial floor', () => {
    expect(heatEnabled('CONNEX', '4')).toBe(true)
    expect(heatEnabled('CONNEX', '3')).toBe(false)
    expect(heatEnabled('SCIS 1', '4')).toBe(false)
  })
})

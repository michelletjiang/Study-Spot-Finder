// building-hours.spec.js
// Unit tests (Vitest) for lib/building-hours.js: students can only check in while the building is open.
// Run: npm run test:unit

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { checkInWindow } = require('../../lib/building-hours')

// a moment in Singapore time (UTC+8), e.g. sg('2026-11-04T10:00') is Wednesday 10am in Singapore
const sg = local => new Date(`${local}:00+08:00`)
const LAW = 'Yong Pung How School of Law' // 7am-11pm weekdays, 8am-6pm Saturday, closed Sunday
const LIBRARY = 'Li Ka Shing Library'     // 8am-10pm weekdays, 9am-5pm Saturday, closed Sunday

describe('TestSuite1: open buildings allow check-ins until closing time', () => {
  it('Test1: open on a weekday morning, closing at 11pm Singapore time', () => {
    const w = checkInWindow(LAW, sg('2026-11-04T10:00'))
    expect(w.open).toBe(true)
    expect(w.closesAt.getTime()).toBe(sg('2026-11-04T23:00').getTime())
  })

  it('Test2: opens exactly at opening time', () => {
    expect(checkInWindow(LIBRARY, sg('2026-11-04T08:00')).open).toBe(true)
  })

  it('Test3: uses Saturday hours on Saturday', () => {
    const w = checkInWindow(LIBRARY, sg('2026-11-07T12:00'))
    expect(w.open).toBe(true)
    expect(w.closesAt.getTime()).toBe(sg('2026-11-07T17:00').getTime())
  })

  it('Test4: buildings with unknown hours are always open, with no closing time', () => {
    expect(checkInWindow('Some New Building', sg('2026-11-08T03:00'))).toEqual({ open: true, closesAt: null })
  })
})

describe('TestSuite2: closed buildings refuse check-ins and say when they open', () => {
  it('Test1: closed before opening, opens later today', () => {
    const w = checkInWindow(LIBRARY, sg('2026-11-04T07:30'))
    expect(w.open).toBe(false)
    expect(w.message).toBe('Li Ka Shing Library is closed right now. It opens at 8am.')
  })

  it('Test2: closed exactly at closing time', () => {
    expect(checkInWindow(LIBRARY, sg('2026-11-04T22:00')).open).toBe(false)
  })

  it('Test3: closed on Sunday, opens Monday', () => {
    const w = checkInWindow(LAW, sg('2026-11-08T12:00'))
    expect(w.open).toBe(false)
    expect(w.message).toBe('Yong Pung How School of Law is closed right now. It opens Mon 7am.')
  })

  it('Test4: uses Singapore time, not UTC (11:30pm Friday in Singapore is still Friday 3:30pm UTC)', () => {
    const w = checkInWindow(LAW, sg('2026-11-06T23:30'))
    expect(w.open).toBe(false)
    expect(w.message).toBe('Yong Pung How School of Law is closed right now. It opens Sat 8am.')
  })
})

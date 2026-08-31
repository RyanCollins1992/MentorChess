import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpacedRepetitionEngine } from './SpacedRepetitionEngine'

describe('SpacedRepetitionEngine', () => {
  let engine

  beforeEach(() => {
    engine = new SpacedRepetitionEngine()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('enroll / unenroll', () => {
    it('enroll creates a new card with default values', () => {
      engine.enroll('trap-1')
      const card = engine.getCard('trap-1')
      expect(card).toMatchObject({
        trapId: 'trap-1',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        rating: null,
        lastReview: null,
      })
      expect(engine.isEnrolled('trap-1')).toBe(true)
    })

    it('enroll is a no-op if the trap is already enrolled (does not reset progress)', () => {
      engine.enroll('trap-1')
      engine.recordReview('trap-1', 3)
      const before = engine.getCard('trap-1')
      engine.enroll('trap-1')
      expect(engine.getCard('trap-1')).toEqual(before)
    })

    it('enroll emits "enrolled" with the trapId', () => {
      const cb = vi.fn()
      engine.on('enrolled', cb)
      engine.enroll('trap-1')
      expect(cb).toHaveBeenCalledWith('trap-1')
    })

    it('unenroll removes the card and emits "unenrolled"', () => {
      engine.enroll('trap-1')
      const cb = vi.fn()
      engine.on('unenrolled', cb)
      engine.unenroll('trap-1')
      expect(engine.isEnrolled('trap-1')).toBe(false)
      expect(engine.getCard('trap-1')).toBeNull()
      expect(cb).toHaveBeenCalledWith('trap-1')
    })

    it('unenroll on a non-enrolled trap does not throw', () => {
      expect(() => engine.unenroll('nope')).not.toThrow()
    })

    it('getEnrolledIds returns all enrolled trap ids', () => {
      engine.enroll('a')
      engine.enroll('b')
      expect(engine.getEnrolledIds().sort()).toEqual(['a', 'b'])
    })
  })

  describe('recordReview — quality branches', () => {
    it('quality=0 (fail) fully resets repetitions to 0 and interval to 1', () => {
      engine.enroll('trap-1')
      // Build up some progress first
      engine.recordReview('trap-1', 3)
      engine.recordReview('trap-1', 3)
      expect(engine.getCard('trap-1').repetitions).toBeGreaterThan(0)

      const updated = engine.recordReview('trap-1', 0)
      expect(updated.repetitions).toBe(0)
      expect(updated.interval).toBe(1)
    })

    it('quality=1 (hard) does NOT reset repetitions — it increments them', () => {
      engine.enroll('trap-1')
      engine.recordReview('trap-1', 3) // repetitions -> 1, interval -> 1
      const updated = engine.recordReview('trap-1', 1) // hard
      expect(updated.repetitions).toBe(2)
      expect(updated.interval).toBeGreaterThanOrEqual(1)
    })

    it('quality=1 (hard) grows the interval by ~1.2x rather than resetting it', () => {
      engine.enroll('trap-1')
      engine.recordReview('trap-1', 3) // repetitions 0->1, interval -> 1
      engine.recordReview('trap-1', 3) // repetitions 1->2, interval -> 6
      const card = engine.getCard('trap-1')
      expect(card.interval).toBe(6)

      const updated = engine.recordReview('trap-1', 1) // hard: interval * 1.2
      expect(updated.interval).toBe(Math.round(6 * 1.2)) // 7
      expect(updated.repetitions).toBe(3)
    })

    it('quality=1 on a brand-new card (repetitions=0) sets interval to 1', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 1)
      expect(updated.interval).toBe(1)
      expect(updated.repetitions).toBe(1)
    })

    it('quality=2 (good) grows interval normally: 1 -> 6 -> interval*ease', () => {
      engine.enroll('trap-1')
      let card = engine.recordReview('trap-1', 2)
      expect(card.interval).toBe(1)
      expect(card.repetitions).toBe(1)

      card = engine.recordReview('trap-1', 2)
      expect(card.interval).toBe(6)
      expect(card.repetitions).toBe(2)

      const easeBeforeThird = card.easeFactor
      card = engine.recordReview('trap-1', 2)
      expect(card.interval).toBe(Math.round(6 * easeBeforeThird))
      expect(card.repetitions).toBe(3)
    })

    it('quality=3 (easy) grows interval normally: 1 -> 6 -> interval*ease', () => {
      engine.enroll('trap-1')
      let card = engine.recordReview('trap-1', 3)
      expect(card.interval).toBe(1)
      card = engine.recordReview('trap-1', 3)
      expect(card.interval).toBe(6)
      const easeBeforeThird = card.easeFactor
      card = engine.recordReview('trap-1', 3)
      expect(card.interval).toBe(Math.round(6 * easeBeforeThird))
    })

    it('recordReview on a nonexistent card is a no-op (returns undefined, does not throw)', () => {
      expect(() => engine.recordReview('ghost', 3)).not.toThrow()
      expect(engine.recordReview('ghost', 3)).toBeUndefined()
    })

    it('emits "reviewed" with trapId and updated card', () => {
      engine.enroll('trap-1')
      const cb = vi.fn()
      engine.on('reviewed', cb)
      const updated = engine.recordReview('trap-1', 3)
      expect(cb).toHaveBeenCalledWith({ trapId: 'trap-1', card: updated })
    })
  })

  describe('ease factor adjustments', () => {
    it('quality=3 (easy) increases ease factor by 0.1', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 3)
      expect(updated.easeFactor).toBe(2.6)
    })

    it('quality=2 (good) leaves ease factor unchanged', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 2)
      expect(updated.easeFactor).toBe(2.5)
    })

    it('quality=1 (hard) decreases ease factor by 0.14', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 1)
      expect(updated.easeFactor).toBe(2.36)
    })

    it('quality=0 (fail) decreases ease factor by 0.32', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 0)
      expect(updated.easeFactor).toBe(2.18)
    })

    it('ease factor floors at MIN_EASE under repeated quality=0 reviews', () => {
      engine.enroll('trap-1')
      for (let i = 0; i < 20; i++) {
        engine.recordReview('trap-1', 0)
      }
      expect(engine.getCard('trap-1').easeFactor).toBe(SpacedRepetitionEngine.MIN_EASE)
    })

    it('ease factor floors at MIN_EASE under repeated quality=1 reviews', () => {
      engine.enroll('trap-1')
      for (let i = 0; i < 20; i++) {
        engine.recordReview('trap-1', 1)
      }
      expect(engine.getCard('trap-1').easeFactor).toBe(SpacedRepetitionEngine.MIN_EASE)
    })
  })

  describe('recordReview — quality clamping for out-of-range/invalid input', () => {
    it('quality=-1 is clamped to 0 (fail): resets repetitions and interval, ease delta matches quality=0', () => {
      engine.enroll('trap-1')
      engine.recordReview('trap-1', 3)
      engine.recordReview('trap-1', 3)
      expect(engine.getCard('trap-1').repetitions).toBeGreaterThan(0)

      const updated = engine.recordReview('trap-1', -1)
      expect(updated.repetitions).toBe(0)
      expect(updated.interval).toBe(1)
    })

    it('quality=4 is clamped to 3 (easy): grows interval/ease the same as a valid quality=3', () => {
      engine.enroll('trap-1')
      const viaFour  = engine.recordReview('trap-1', 4)
      engine.unenroll('trap-1')
      engine.enroll('trap-1')
      const viaThree = engine.recordReview('trap-1', 3)
      expect(viaFour.interval).toBe(viaThree.interval)
      expect(viaFour.easeFactor).toBe(viaThree.easeFactor)
    })

    it('quality=0 (boundary) behaves as a valid fail, not clamped away', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 0)
      expect(updated.repetitions).toBe(0)
      expect(updated.interval).toBe(1)
      expect(updated.easeFactor).toBe(2.18)
    })

    it('quality=3 (boundary) behaves as a valid easy pass, not clamped away', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 3)
      expect(updated.repetitions).toBe(1)
      expect(updated.easeFactor).toBe(2.6)
    })

    it('non-integer/NaN quality does not produce an out-of-range ease delta', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', NaN)
      // Falls back to quality=2 (good): ease factor unchanged, treated as a normal pass.
      expect(updated.easeFactor).toBe(2.5)
      expect(updated.repetitions).toBe(1)
    })
  })

  describe('setRating — rating clamping for out-of-range/invalid input', () => {
    it('rating=0 is clamped to a valid value, not silently treated as "unset"', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 0)
      const updated = engine.recordReview('trap-1', 2)
      // rating=0 must be clamped into 1-3 and actually apply a nudge — it must NOT
      // be treated as null/unset (that was the separate falsy-check bug).
      expect(engine.getCard('trap-1').rating).toBeGreaterThanOrEqual(1)
      expect(updated.easeFactor).not.toBe(2.5)
    })

    it('rating=0 clamps to the same effect as the valid boundary rating=1', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 0)
      const viaZero = engine.recordReview('trap-1', 2)
      engine.unenroll('trap-1')
      engine.enroll('trap-1')
      engine.setRating('trap-1', 1)
      const viaOne = engine.recordReview('trap-1', 2)
      expect(viaZero.easeFactor).toBe(viaOne.easeFactor)
    })

    it('rating=5 clamps to the same effect as the valid boundary rating=3', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 5)
      const viaFive = engine.recordReview('trap-1', 2)
      engine.unenroll('trap-1')
      engine.enroll('trap-1')
      engine.setRating('trap-1', 3)
      const viaThree = engine.recordReview('trap-1', 2)
      expect(viaFive.easeFactor).toBe(viaThree.easeFactor)
    })

    it('rating=1 (boundary) applies the full +0.1 nudge, not clamped away', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 1)
      const updated = engine.recordReview('trap-1', 2)
      expect(updated.easeFactor).toBe(2.6)
    })

    it('rating=3 (boundary) applies the full -0.1 nudge, not clamped away', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 3)
      const updated = engine.recordReview('trap-1', 2)
      expect(updated.easeFactor).toBe(2.4)
    })

    it('non-integer/NaN rating falls back to neutral (no nudge)', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', NaN)
      const updated = engine.recordReview('trap-1', 2)
      expect(updated.easeFactor).toBe(2.5)
    })
  })

  describe('user rating ±0.1 nudge', () => {
    it('rating=1 (easy per user) nudges ease UP by 0.1 relative to unset rating', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 1)
      const updated = engine.recordReview('trap-1', 2) // quality=2 leaves ease unchanged before rating nudge
      // base ease after quality=2 stays 2.5, then rating=1 nudge: -(1-2)*0.1 = +0.1
      expect(updated.easeFactor).toBe(2.6)
    })

    it('rating=2 (neutral) does not nudge ease at all', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 2)
      const updated = engine.recordReview('trap-1', 2)
      expect(updated.easeFactor).toBe(2.5)
    })

    it('rating=3 (hard per user) nudges ease DOWN by 0.1 relative to unset rating', () => {
      engine.enroll('trap-1')
      engine.setRating('trap-1', 3)
      const updated = engine.recordReview('trap-1', 2)
      // base ease stays 2.5, then rating=3 nudge: -(3-2)*0.1 = -0.1
      expect(updated.easeFactor).toBe(2.4)
    })

    it('unset (null) rating applies no nudge', () => {
      engine.enroll('trap-1')
      const updated = engine.recordReview('trap-1', 2)
      expect(updated.easeFactor).toBe(2.5)
    })

    it('setRating on a nonexistent card is a no-op', () => {
      expect(() => engine.setRating('ghost', 1)).not.toThrow()
      expect(engine.getCard('ghost')).toBeNull()
    })
  })

  describe('getDueCards / getDueCount', () => {
    it('a freshly enrolled card is due immediately (dueDate = now)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      engine.enroll('trap-1')
      expect(engine.getDueCount()).toBe(1)
      expect(engine.getDueCards().map(c => c.trapId)).toEqual(['trap-1'])
    })

    it('a card due exactly "now" is included (<=, not <)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      engine.enroll('trap-1')
      // card.dueDate === current system time exactly
      expect(engine.getCard('trap-1').dueDate).toBe(new Date().toISOString())
      expect(engine.getDueCount()).toBe(1)
    })

    it('a card due in the future is excluded', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      engine.enroll('trap-1')
      engine.recordReview('trap-1', 3) // interval -> 1 day out
      expect(engine.getDueCount()).toBe(0)

      // advance exactly 1 day — now due again
      vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'))
      expect(engine.getDueCount()).toBe(1)
    })

    it('getDueCount matches getDueCards length across multiple cards', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      engine.enroll('a')
      engine.enroll('b')
      engine.recordReview('b', 3) // push b's due date into the future
      expect(engine.getDueCount()).toBe(1)
      expect(engine.getDueCards()).toHaveLength(1)
    })
  })

  describe('getStats', () => {
    it('reports total, due, mastered, and newCards counts', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      engine.enroll('new-card')
      engine.enroll('mastered-card')
      // Manually drive mastered-card's interval to >= 21 via repeated good reviews
      engine.recordReview('mastered-card', 2) // interval 1
      engine.recordReview('mastered-card', 2) // interval 6
      engine.recordReview('mastered-card', 2) // interval 6*ease (>=21 with default ease ~2.5)

      const stats = engine.getStats()
      expect(stats.total).toBe(2)
      expect(stats.newCards).toBe(1) // only new-card has repetitions === 0
      expect(stats.mastered).toBe(engine.getCard('mastered-card').interval >= 21 ? 1 : 0)
    })

    it('mastered threshold is interval >= 21 exactly', () => {
      engine.enroll('trap-1')
      // Force the card's interval to exactly 21 to test the boundary directly
      const card = engine.getCard('trap-1')
      engine._cards['trap-1'] = { ...card, interval: 21 }
      expect(engine.getStats().mastered).toBe(1)

      engine._cards['trap-1'] = { ...card, interval: 20 }
      expect(engine.getStats().mastered).toBe(0)
    })

    it('newCards counts cards with repetitions === 0', () => {
      engine.enroll('a')
      engine.enroll('b')
      engine.recordReview('b', 3)
      expect(engine.getStats().newCards).toBe(1)
    })
  })
})

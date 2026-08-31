import { describe, it, expect, afterEach, vi } from 'vitest'
import { ProgressManager } from './ProgressManager'

describe('ProgressManager', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('awardXP', () => {
    it('awards the correct XP for TRAP_DRILL_COMPLETE and updates totals', () => {
      const mgr = new ProgressManager()
      const xpBefore = mgr.xpTotal
      const amount = mgr.awardXP('TRAP_DRILL_COMPLETE')
      expect(amount).toBe(10)
      expect(mgr.xpTotal).toBe(xpBefore + 10)
      expect(mgr.xpToday).toBe(amount + 10) // includes the DAILY_LOGIN award from construction... see below
    })

    it('awards the correct XP for PUZZLE_CORRECT', () => {
      const mgr = new ProgressManager()
      const amount = mgr.awardXP('PUZZLE_CORRECT')
      expect(amount).toBe(15)
    })

    it('applies the multiplier argument', () => {
      const mgr = new ProgressManager()
      const amount = mgr.awardXP('SRS_REVIEW', 3)
      expect(amount).toBe(15)
    })

    it('unknown action keys award 0 XP and do not mutate xpTotal', () => {
      const mgr = new ProgressManager()
      const before = mgr.xpTotal
      const amount = mgr.awardXP('NOT_A_REAL_ACTION')
      expect(amount).toBe(0)
      expect(mgr.xpTotal).toBe(before)
    })

    it('emits "xp" with action, amount, and running total', () => {
      const mgr = new ProgressManager()
      const cb = vi.fn()
      mgr.on('xp', cb)
      mgr.awardXP('SRS_REVIEW')
      expect(cb).toHaveBeenCalledWith({ action: 'SRS_REVIEW', amount: 5, total: mgr.xpTotal })
    })

    it('a single award spanning multiple levels triggers multiple levelUp emits', () => {
      const mgr = new ProgressManager()
      // xpForLevel(level) = level * 200. Starting at level 1, total 0 (ignoring daily login XP
      // already applied at construction — re-derive directly from current state).
      const startLevel = mgr.level
      const startTotal = mgr.xpTotal

      const levelUpCb = vi.fn()
      mgr.on('levelUp', levelUpCb)

      // TRAP_MASTERED = 50 XP per call; award enough at once via multiplier to cross 2+ level thresholds.
      // Need xpTotal >= startLevel*200 and then >= (startLevel+1)*200 in the same call.
      const xpNeededForTwoLevels = (startLevel + 1) * 200 - startTotal + 1
      const multiplier = Math.ceil(xpNeededForTwoLevels / ProgressManager.XP_REWARDS.TRAP_MASTERED)
      mgr.awardXP('TRAP_MASTERED', multiplier)

      expect(mgr.level).toBeGreaterThanOrEqual(startLevel + 2)
      expect(levelUpCb.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('daily streak logic', () => {
    it('same-day construction (login already recorded today) does not change the streak or re-award DAILY_LOGIN', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
      const first = new ProgressManager()
      const streakAfterFirst = first.streak
      const xpAfterFirst = first.xpTotal

      // Construct a second instance "later today" — simulates re-opening the app same day
      vi.setSystemTime(new Date('2026-01-01T18:00:00.000Z'))
      const second = new ProgressManager()
      expect(second.streak).toBe(streakAfterFirst)
      expect(second.xpTotal).toBe(xpAfterFirst)
    })

    it('consecutive-day login increments the streak', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
      const first = new ProgressManager()
      expect(first.streak).toBe(1)

      vi.setSystemTime(new Date('2026-01-02T10:00:00.000Z'))
      const second = new ProgressManager()
      expect(second.streak).toBe(2)
    })

    it('a gap day (skipped a day) resets the streak to 1', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
      new ProgressManager()

      vi.setSystemTime(new Date('2026-01-05T10:00:00.000Z'))
      const later = new ProgressManager()
      expect(later.streak).toBe(1)
    })

    it('a new day resets xpToday to 0 before awarding DAILY_LOGIN', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))
      const first = new ProgressManager()
      first.awardXP('PUZZLE_CORRECT')
      expect(first.xpToday).toBeGreaterThan(10) // daily login + puzzle correct

      vi.setSystemTime(new Date('2026-01-02T10:00:00.000Z'))
      const second = new ProgressManager()
      // xpToday reset to 0 then DAILY_LOGIN (10) awarded
      expect(second.xpToday).toBe(10)
    })
  })

  describe('recordTrapStudy', () => {
    it('records a new trap study entry and increments totalDrills', () => {
      const mgr = new ProgressManager()
      const drillsBefore = mgr.totalDrills
      mgr.recordTrapStudy('trap-1', false)
      expect(mgr.getTrapStudyCount('trap-1')).toBe(1)
      expect(mgr.totalDrills).toBe(drillsBefore + 1)
    })

    it('perfect flag persists once set true, even on subsequent non-perfect studies', () => {
      const mgr = new ProgressManager()
      mgr.recordTrapStudy('trap-1', true)
      mgr.recordTrapStudy('trap-1', false)
      expect(mgr._data.studiedTraps['trap-1'].perfect).toBe(true)
      expect(mgr.getTrapStudyCount('trap-1')).toBe(2)
    })

    it('non-perfect study does not set perfect flag', () => {
      const mgr = new ProgressManager()
      mgr.recordTrapStudy('trap-1', false)
      expect(mgr._data.studiedTraps['trap-1'].perfect).toBe(false)
    })

    it('emits "trapStudied" with the trapId', () => {
      const mgr = new ProgressManager()
      const cb = vi.fn()
      mgr.on('trapStudied', cb)
      mgr.recordTrapStudy('trap-1')
      expect(cb).toHaveBeenCalledWith('trap-1')
    })
  })

  describe('awardBadge', () => {
    it('awards a new badge and returns true', () => {
      const mgr = new ProgressManager()
      expect(mgr.awardBadge('first-win')).toBe(true)
      expect(mgr.hasBadge('first-win')).toBe(true)
    })

    it('duplicate badge award is a no-op and returns false', () => {
      const mgr = new ProgressManager()
      mgr.awardBadge('first-win')
      const before = mgr.badges.length
      const result = mgr.awardBadge('first-win')
      expect(result).toBe(false)
      expect(mgr.badges.length).toBe(before)
    })

    it('emits "badge" only on the first (successful) award', () => {
      const mgr = new ProgressManager()
      const cb = vi.fn()
      mgr.on('badge', cb)
      mgr.awardBadge('first-win')
      mgr.awardBadge('first-win')
      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  describe('getSnapshot', () => {
    it('returns the expected shape with current values', () => {
      const mgr = new ProgressManager()
      mgr.markKnown('trap-1', true)
      const snapshot = mgr.getSnapshot()
      expect(snapshot).toEqual({
        xpTotal:     mgr.xpTotal,
        xpToday:     mgr.xpToday,
        level:       mgr.level,
        streak:      mgr.streak,
        currentElo:  mgr.currentElo,
        badges:      mgr.badges,
        totalDrills: mgr.totalDrills,
        knownCount:  mgr.knownCount,
      })
      expect(snapshot.knownCount).toBe(1)
    })
  })

  describe('markKnown / isKnown', () => {
    it('marks a trap known and reflects it in isKnown and knownCount', () => {
      const mgr = new ProgressManager()
      expect(mgr.isKnown('trap-1')).toBe(false)
      mgr.markKnown('trap-1')
      expect(mgr.isKnown('trap-1')).toBe(true)
      expect(mgr.knownCount).toBe(1)
    })

    it('can unmark a trap as known', () => {
      const mgr = new ProgressManager()
      mgr.markKnown('trap-1', true)
      mgr.markKnown('trap-1', false)
      expect(mgr.isKnown('trap-1')).toBe(false)
    })
  })

  describe('recordElo', () => {
    it('updates currentElo and appends to eloHistory', () => {
      const mgr = new ProgressManager()
      mgr.recordElo(1200)
      expect(mgr.currentElo).toBe(1200)
      expect(mgr.eloHistory).toHaveLength(1)
      expect(mgr.eloHistory[0].elo).toBe(1200)
    })
  })
})

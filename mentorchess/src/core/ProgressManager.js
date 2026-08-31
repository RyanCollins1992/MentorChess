import { BaseManager } from './BaseManager'

/**
 * ProgressManager
 * Tracks XP, ELO estimate, daily streaks, badges, and study stats.
 * All progress is persisted to localStorage.
 */
export class ProgressManager extends BaseManager {
  static XP_REWARDS = {
    TRAP_DRILL_COMPLETE:  10,
    TRAP_DRILL_PERFECT:   20,
    SRS_REVIEW:            5,
    PUZZLE_CORRECT:       15,
    PUZZLE_STREAK_5:      25,
    ENDGAME_COMPLETE:     20,
    DAILY_LOGIN:          10,
    TRAP_MASTERED:        50,
  }

  constructor() {
    super('mentorchess-progress')
    this._data = this._load(this._defaultData())
    this._checkDailyStreak()
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Award XP for an action */
  awardXP(action, multiplier = 1) {
    const amount = (ProgressManager.XP_REWARDS[action] || 0) * multiplier
    if (!amount) return 0

    this._data.xpToday   += amount
    this._data.xpTotal   += amount
    this._data.xpHistory.push({ action, amount, date: new Date().toISOString() })

    this._checkLevelUp()
    this._save(this._data)
    this.emit('xp', { action, amount, total: this._data.xpTotal })
    return amount
  }

  /** Record a trap as studied */
  recordTrapStudy(trapId, perfect = false) {
    if (!this._data.studiedTraps[trapId]) {
      this._data.studiedTraps[trapId] = { count: 0, perfect: false, firstStudied: new Date().toISOString() }
    }
    this._data.studiedTraps[trapId].count += 1
    if (perfect) this._data.studiedTraps[trapId].perfect = true
    this._data.totalDrills += 1
    this._save(this._data)
    this.emit('trapStudied', trapId)
  }

  /** Get trap study count */
  getTrapStudyCount(trapId) {
    return this._data.studiedTraps[trapId]?.count || 0
  }

  /** Mark a trap as "I know this" */
  markKnown(trapId, known = true) {
    this._data.knownTraps[trapId] = known
    this._save(this._data)
    this.emit('knownUpdated', trapId)
  }

  isKnown(trapId) { return !!this._data.knownTraps[trapId] }

  /** Record ELO rating */
  recordElo(elo) {
    this._data.currentElo = elo
    this._data.eloHistory.push({ elo, date: new Date().toISOString() })
    this._save(this._data)
    this.emit('eloUpdated', elo)
  }

  /** Award a badge */
  awardBadge(badgeId) {
    if (this._data.badges.includes(badgeId)) return false
    this._data.badges.push(badgeId)
    this._save(this._data)
    this.emit('badge', badgeId)
    return true
  }

  hasBadge(badgeId) { return this._data.badges.includes(badgeId) }

  // ── Getters ──────────────────────────────────────────────────────

  get xpTotal()     { return this._data.xpTotal }
  get xpToday()     { return this._data.xpToday }
  get level()       { return this._data.level }
  get streak()      { return this._data.streak }
  get currentElo()  { return this._data.currentElo }
  get badges()      { return [...this._data.badges] }
  get eloHistory()  { return [...this._data.eloHistory] }
  get xpHistory()   { return [...this._data.xpHistory] }
  get totalDrills() { return this._data.totalDrills }
  get knownCount()  { return Object.values(this._data.knownTraps).filter(Boolean).length }

  getSnapshot() {
    return {
      xpTotal:     this._data.xpTotal,
      xpToday:     this._data.xpToday,
      level:       this._data.level,
      streak:      this._data.streak,
      currentElo:  this._data.currentElo,
      badges:      this._data.badges,
      totalDrills: this._data.totalDrills,
      knownCount:  this.knownCount,
    }
  }

  // ── Private ──────────────────────────────────────────────────────

  _defaultData() {
    return {
      xpTotal:      0,
      xpToday:      0,
      level:        1,
      streak:       0,
      lastLoginDate: null,
      currentElo:   500,
      eloHistory:   [],
      badges:       [],
      studiedTraps: {},
      knownTraps:   {},
      xpHistory:    [],
      totalDrills:  0,
    }
  }

  _checkDailyStreak() {
    const today   = new Date().toDateString()
    const last    = this._data.lastLoginDate
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (last === today) return // Already logged in today

    if (last === yesterday) {
      this._data.streak += 1
    } else if (last !== null) {
      this._data.streak = 1 // Reset streak
    } else {
      this._data.streak = 1 // First login
    }

    this._data.lastLoginDate = today
    this._data.xpToday = 0 // Reset daily XP
    this.awardXP('DAILY_LOGIN')
    this._save(this._data)
  }

  _checkLevelUp() {
    const xpForLevel = (level) => level * 200
    while (this._data.xpTotal >= xpForLevel(this._data.level)) {
      this._data.level += 1
      this.emit('levelUp', this._data.level)
    }
  }
}

// Singleton
export const progressManager = new ProgressManager()

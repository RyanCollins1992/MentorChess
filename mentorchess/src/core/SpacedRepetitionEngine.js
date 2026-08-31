import { BaseManager } from './BaseManager'

/**
 * SpacedRepetitionEngine
 * Implements the SM-2 algorithm for scheduling trap reviews.
 *
 * Each card has:
 *   - interval    (days until next review)
 *   - easeFactor  (how easy the card is, 1.3–2.5)
 *   - dueDate     (ISO string)
 *   - repetitions (how many times reviewed)
 *   - rating      (1=easy, 2=medium, 3=hard — user-set difficulty)
 */
export class SpacedRepetitionEngine extends BaseManager {
  static INITIAL_INTERVAL = 1
  static MIN_EASE = 1.3
  static DEFAULT_EASE = 2.5

  constructor() {
    super('mentorchess-srs')
    this._cards = this._load({})
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Add a trap to the review queue */
  enroll(trapId) {
    if (this._cards[trapId]) return
    this._cards[trapId] = this._createCard(trapId)
    this._save(this._cards)
    this.emit('enrolled', trapId)
  }

  /** Remove a trap from the queue */
  unenroll(trapId) {
    delete this._cards[trapId]
    this._save(this._cards)
    this.emit('unenrolled', trapId)
  }

  /** Record a review result. quality: 0 (fail) | 1 (hard) | 2 (ok) | 3 (easy) */
  recordReview(trapId, quality) {
    const card = this._cards[trapId]
    if (!card) return
    const updated = this._applyAlgorithm(card, SpacedRepetitionEngine._clampQuality(quality))
    this._cards[trapId] = updated
    this._save(this._cards)
    this.emit('reviewed', { trapId, card: updated })
    return updated
  }

  /** Get all cards due today */
  getDueCards() {
    const now = new Date()
    return Object.values(this._cards).filter(card => new Date(card.dueDate) <= now)
  }

  /** Get due count */
  getDueCount() {
    return this.getDueCards().length
  }

  /** Get a card by trapId */
  getCard(trapId) {
    return this._cards[trapId] || null
  }

  /** Get all enrolled trap IDs */
  getEnrolledIds() {
    return Object.keys(this._cards)
  }

  /** Check if enrolled */
  isEnrolled(trapId) {
    return !!this._cards[trapId]
  }

  /** Set user difficulty rating (affects ease factor). rating: 1=easy..3=hard */
  setRating(trapId, rating) {
    const card = this._cards[trapId]
    if (!card) return
    this._cards[trapId] = { ...card, rating: SpacedRepetitionEngine._clampRating(rating) }
    this._save(this._cards)
  }

  /** Get total stats */
  getStats() {
    const cards = Object.values(this._cards)
    return {
      total:    cards.length,
      due:      this.getDueCount(),
      mastered: cards.filter(c => c.interval >= 21).length,
      newCards: cards.filter(c => c.repetitions === 0).length,
    }
  }

  // ── SM-2 Algorithm ───────────────────────────────────────────────

  _createCard(trapId) {
    return {
      trapId,
      interval:    SpacedRepetitionEngine.INITIAL_INTERVAL,
      easeFactor:  SpacedRepetitionEngine.DEFAULT_EASE,
      repetitions: 0,
      dueDate:     new Date().toISOString(),
      rating:      null,
      lastReview:  null,
    }
  }

  _applyAlgorithm(card, quality) {
    let { interval, easeFactor, repetitions } = card

    if (quality === 0) {
      // True failure (quality=0 is not exposed in the UI, only used programmatically) —
      // reset repetitions, short interval
      repetitions = 0
      interval = 1
    } else if (quality === 1) {
      // Hard — remembered, but it was difficult. Shrink the interval growth instead of
      // resetting from scratch, so it doesn't collide with a true quality=0 failure.
      if (repetitions === 0) interval = 1
      else interval = Math.max(1, Math.round(interval * 1.2))

      repetitions += 1
    } else {
      // Passed (Good/Easy)
      if (repetitions === 0) interval = 1
      else if (repetitions === 1) interval = 6
      else interval = Math.round(interval * easeFactor)

      repetitions += 1
    }

    // Adjust ease factor based on quality
    easeFactor = Math.max(
      SpacedRepetitionEngine.MIN_EASE,
      easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
    )

    // Compose the user's difficulty rating (1=easy..3=hard) on top of the quality adjustment above:
    // each star away from the neutral midpoint (2) nudges ease by ±0.1, so hard-rated cards shrink
    // their ease factor (shorter intervals, reviewed more often) and easy-rated cards grow it (longer intervals).
    // Check specifically for "no rating set" rather than any falsy value, since 0 is falsy but not
    // a valid "unset" sentinel (rating is set via setRating, which clamps to 1-3; null/undefined means unset).
    if (card.rating !== null && card.rating !== undefined) {
      easeFactor = Math.max(
        SpacedRepetitionEngine.MIN_EASE,
        easeFactor - (card.rating - 2) * 0.1
      )
    }

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + interval)

    return {
      ...card,
      interval,
      easeFactor: Math.round(easeFactor * 100) / 100,
      repetitions,
      dueDate: dueDate.toISOString(),
      lastReview: new Date().toISOString(),
    }
  }

  // ── Input validation ─────────────────────────────────────────────

  /** Clamp quality to the valid integer range 0 (fail) – 3 (easy). Non-integer/NaN falls back to 2 (good). */
  static _clampQuality(quality) {
    if (!Number.isInteger(quality)) return 2
    return Math.min(3, Math.max(0, quality))
  }

  /** Clamp rating to the valid integer range 1 (easy) – 3 (hard). Non-integer/NaN falls back to 2 (neutral). */
  static _clampRating(rating) {
    if (!Number.isInteger(rating)) return 2
    return Math.min(3, Math.max(1, rating))
  }
}

// Singleton export
export const srsEngine = new SpacedRepetitionEngine()

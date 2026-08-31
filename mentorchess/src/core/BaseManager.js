/**
 * BaseManager
 * All feature managers extend this class.
 * Provides: persistent localStorage, event emission, and logging.
 */
export class BaseManager {
  constructor(storageKey) {
    this._storageKey = storageKey
    this._listeners = new Map()
  }

  // ── Persistence ─────────────────────────────────────────────────
  _load(defaultValue = {}) {
    try {
      const raw = localStorage.getItem(this._storageKey)
      return raw ? JSON.parse(raw) : defaultValue
    } catch {
      return defaultValue
    }
  }

  _save(data) {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(data))
    } catch (e) {
      console.warn(`[${this.constructor.name}] Failed to save:`, e)
    }
  }

  _clear() {
    localStorage.removeItem(this._storageKey)
  }

  // ── Events ───────────────────────────────────────────────────────
  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event).add(callback)
    return () => this.off(event, callback) // returns unsubscribe fn
  }

  off(event, callback) {
    this._listeners.get(event)?.delete(callback)
  }

  emit(event, data) {
    this._listeners.get(event)?.forEach(cb => cb(data))
  }

  // ── Logging ──────────────────────────────────────────────────────
  _log(...args) {
    console.log(`[${this.constructor.name}]`, ...args)
  }

  _warn(...args) {
    console.warn(`[${this.constructor.name}]`, ...args)
  }
}

import { encodeMateScore, clampEval } from './GameAnalysis'

// Bundled NNUE build (single-threaded "lite") — ships inside the app so
// analysis works offline and nothing fetches/executes remote code.
// Bare filename — the build auto-detects worker context and resolves its own
// .wasm by replacing the .js suffix on its own URL, no query/hash needed.
const ENGINE_JS = 'stockfish/stockfish-18-lite-single.js'
const STOP_AFTER_MS = 2500 // safety net: never block more than this per position

/**
 * ReviewEngine — a single Stockfish worker for GameReviewPage's batch
 * analysis. Extracted out of GameReviewPage.jsx (a page component file, so
 * exporting a plain class off it tripped the react-refresh/only-export-
 * components lint rule) into its own file, matching LiveEvalEngine.js's
 * existing precedent for the same class of object.
 *
 * Each ReviewEngine is a fully independent Worker, so a pool of them
 * (GameReviewPage.jsx owns the pool) can evaluate different positions
 * concurrently — evaluating a position never depends on any other
 * position's result, only the later move-classification pass does.
 */
export class ReviewEngine {
  constructor() {
    this._worker  = null
    this._ready   = false
    this._queue   = []
  }

  async init() {
    return new Promise(resolve => {
      // Bail out after 15 s if the engine never responds
      const timeout = setTimeout(() => resolve(false), 15000)
      const done = (ok) => { clearTimeout(timeout); resolve(ok) }

      try {
        const url = new URL(ENGINE_JS, document.baseURI).href
        this._worker = new Worker(url)

        this._worker.onmessage = (e) => {
          const line = e.data
          if (line === 'uciok')   { this._worker.postMessage('setoption name MultiPV value 2'); this._worker.postMessage('isready'); return }
          if (line === 'readyok') { this._ready = true; done(true); return }
          if (this._currentResolve) {
            if (line.startsWith('info') && line.includes(' score ')) {
              const pvMatch   = line.match(/\bmultipv (\d+)/)
              const pvIndex   = pvMatch ? parseInt(pvMatch[1]) : 1
              const cpMatch   = line.match(/score cp (-?\d+)/)
              const mateMatch = line.match(/score mate (-?\d+)/)
              const moveMatch = line.match(/\bpv (\S+)/)
              let cp = null
              // Mate encoded as sign * (10000 - distance) — see GameAnalysis.js
              if (mateMatch) { cp = encodeMateScore(parseInt(mateMatch[1])) }
              else if (cpMatch) { cp = clampEval(parseInt(cpMatch[1])) }
              if (cp !== null) {
                // Stockfish's score is relative to whoever is to move in the
                // position being analyzed, not always White — normalize to
                // White's perspective here so every consumer (classifyMove,
                // EvalBar) can treat `eval` as an absolute value.
                const whiteCp = this._sideToMove === 'b' ? -cp : cp
                if (pvIndex === 1) { this._eval1 = whiteCp; if (moveMatch) this._move1 = moveMatch[1] }
                else if (pvIndex === 2) { this._eval2 = whiteCp; if (moveMatch) this._move2 = moveMatch[1] }
              }
            }
            if (line.startsWith('bestmove')) {
              clearTimeout(this._stopTimer)
              const parts = line.split(' ')
              this._currentResolve({
                eval: this._eval1 ?? 0,
                bestMove: parts[1] !== '(none)' ? parts[1] : null,
                eval2: this._eval2 ?? null,
                secondMove: this._move2 ?? null,
              })
              this._currentResolve = null
              this._processQueue()
            }
          }
        }
        this._worker.onerror = () => done(false)
        this._worker.postMessage('uci')
      } catch { done(false) }
    })
  }

  evaluate(fen, depth = 20) {
    return new Promise(resolve => {
      this._queue.push({ fen, depth, resolve })
      if (!this._currentResolve) this._processQueue()
    })
  }

  _processQueue() {
    if (this._queue.length === 0) return
    const { fen, depth, resolve } = this._queue.shift()
    this._currentResolve = resolve
    this._sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w'
    this._eval1 = 0; this._move1 = null
    this._eval2 = null; this._move2 = null
    this._worker.postMessage(`position fen ${fen}`)
    this._worker.postMessage(`go depth ${depth}`)
    this._stopTimer = setTimeout(() => this._worker.postMessage('stop'), STOP_AFTER_MS)
  }

  // Drops any not-yet-dispatched queued positions, resolving each with a
  // harmless placeholder instead of leaving them pending forever — used when
  // GameReviewPage abandons an in-flight analysis run (a new game was loaded
  // mid-analysis) so the new run's evaluate() calls aren't stuck waiting
  // behind a whole stale game's worth of queued positions. The one position
  // already in flight with the worker (if any) is left to finish naturally;
  // it's bounded by STOP_AFTER_MS either way.
  cancelQueued() {
    const pending = this._queue.splice(0)
    pending.forEach(({ resolve }) => resolve({ eval: 0, bestMove: null, eval2: null, secondMove: null }))
  }

  terminate() { this._worker?.terminate() }
}

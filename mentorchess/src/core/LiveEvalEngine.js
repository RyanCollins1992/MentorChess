import { encodeMateScore, clampEval } from './GameAnalysis'

// Bundled NNUE build served same-origin from public/stockfish/ (same engine
// GameReviewPage/EndgamesPage/VsCoachPage use — a classic Worker can't load
// a cross-origin script, the constructor throws synchronously).
const ENGINE_JS = 'stockfish/stockfish-18-lite-single.js'
const DEPTH = 16          // shallower than GameReviewPage's batch depth-20 —
                            // a live eval bar needs to feel responsive after
                            // every move, not exhaustive.
const STOP_AFTER_MS = 1200 // safety net: never block more than this per position

const EMPTY_RESULT = { eval: 0, bestMove: null, pv: [], eval2: null, secondMove: null, pv2: [] }

/**
 * LiveEvalEngine — a single Stockfish worker for AnalysisPanel's always-on
 * live evaluation. Modeled on GameReviewPage.jsx's private ReviewEngine
 * (same UCI handshake, MultiPV value 2), but NOT shared code with it — the
 * queuing models differ. ReviewEngine queues and evaluates every position
 * in a finished game to completion; this one only ever cares about the
 * *current* live position, so a new evaluate() call while one is still
 * running SUPERSEDES it (posts 'stop' to force an early reply for the
 * stale request, then immediately starts the newer one) rather than
 * queuing behind it.
 */
export class LiveEvalEngine {
  constructor() {
    this._worker = null
    this._ready  = false
    this._activeResolve = null // resolve() for the request currently running in the engine
    this._nextRequest   = null // { fen, depth, resolve } waiting to take over once the active one stops
  }

  async init() {
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 15000)
      const done = (ok) => { clearTimeout(timeout); resolve(ok) }

      try {
        const url = new URL(ENGINE_JS, document.baseURI).href
        this._worker = new Worker(url)

        this._worker.onmessage = (e) => {
          const line = e.data
          if (line === 'uciok') { this._worker.postMessage('setoption name MultiPV value 2'); this._worker.postMessage('isready'); return }
          if (line === 'readyok') { this._ready = true; done(true); return }

          if (this._activeResolve) {
            if (line.startsWith('info') && line.includes(' score ')) {
              const pvIndexMatch = line.match(/\bmultipv (\d+)/)
              const pvIndex   = pvIndexMatch ? parseInt(pvIndexMatch[1]) : 1
              const cpMatch   = line.match(/score cp (-?\d+)/)
              const mateMatch = line.match(/score mate (-?\d+)/)
              // "pv" is always the last field in a Stockfish info line, so
              // capturing to end-of-line and splitting is safe (unlike
              // ReviewEngine's single-move `/\bpv (\S+)/`, this keeps the
              // whole line for the tactic-callout's short forcing sequence).
              const pvListMatch = line.match(/\bpv (.+)$/)
              const pvList = pvListMatch ? pvListMatch[1].trim().split(/\s+/) : null

              let cp = null
              if (mateMatch) cp = encodeMateScore(parseInt(mateMatch[1]))
              else if (cpMatch) cp = clampEval(parseInt(cpMatch[1]))

              if (cp !== null) {
                // Stockfish's score is relative to whoever is to move in the
                // position being analyzed, not always White — normalize to
                // White's perspective so EvalBar (and anything else reading
                // `eval`) can treat it as an absolute value.
                const whiteCp = this._sideToMove === 'b' ? -cp : cp
                if (pvIndex === 1) { this._eval1 = whiteCp; if (pvList) this._pv1 = pvList }
                else if (pvIndex === 2) { this._eval2 = whiteCp; if (pvList) this._pv2 = pvList }
              }
            }
            if (line.startsWith('bestmove')) {
              clearTimeout(this._stopTimer)
              const resolve = this._activeResolve
              this._activeResolve = null
              resolve({
                eval:       this._eval1 ?? 0,
                bestMove:   this._pv1?.[0] ?? null,
                pv:         this._pv1 ?? [],
                eval2:      this._eval2 ?? null,
                secondMove: this._pv2?.[0] ?? null,
                pv2:        this._pv2 ?? [],
              })
              if (this._nextRequest) {
                const { fen, depth, resolve: nextResolve } = this._nextRequest
                this._nextRequest = null
                this._begin(fen, depth, nextResolve)
              }
            }
          }
        }
        this._worker.onerror = () => done(false)
        this._worker.postMessage('uci')
      } catch { done(false) }
    })
  }

  evaluate(fen, depth = DEPTH) {
    return new Promise(resolve => {
      if (!this._ready) { resolve(EMPTY_RESULT); return }
      if (this._activeResolve) {
        // Supersede: queue this request and tell the engine to stop the
        // search that's currently running — its bestmove reply (still
        // resolved with whatever partial eval it had) triggers _begin() for
        // this newer request.
        this._nextRequest = { fen, depth, resolve }
        this._worker.postMessage('stop')
        return
      }
      this._begin(fen, depth, resolve)
    })
  }

  _begin(fen, depth, resolve) {
    this._activeResolve = resolve
    this._sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w'
    this._eval1 = 0; this._pv1 = []
    this._eval2 = null; this._pv2 = null
    this._worker.postMessage(`position fen ${fen}`)
    this._worker.postMessage(`go depth ${depth}`)
    this._stopTimer = setTimeout(() => this._worker.postMessage('stop'), STOP_AFTER_MS)
  }

  terminate() { this._worker?.terminate() }
}

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReviewEngine } from './ReviewEngine'

// A minimal stand-in for the real Worker — just records postMessage calls
// and lets the test fire onmessage manually to script a UCI exchange.
class FakeWorker {
  constructor() { this.posted = []; this.onmessage = null; this.onerror = null }
  postMessage(msg) { this.posted.push(msg) }
  terminate() {}
}

async function initEngine() {
  let worker
  vi.stubGlobal('Worker', function () { worker = new FakeWorker(); return worker })
  const engine = new ReviewEngine()
  const ready = engine.init()
  worker.onmessage({ data: 'uciok' })
  worker.onmessage({ data: 'readyok' })
  await ready
  return { engine, worker }
}

describe('ReviewEngine', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('normalizes a White-to-move eval unchanged (already White-perspective)', async () => {
    const { engine, worker } = await initEngine()
    const result = engine.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 20)
    worker.onmessage({ data: 'info depth 20 multipv 1 score cp 30 pv e2e4' })
    worker.onmessage({ data: 'bestmove e2e4' })
    expect((await result).eval).toBe(30)
  })

  it('flips a Black-to-move eval to White-perspective (Stockfish reports it relative to the mover)', async () => {
    const { engine, worker } = await initEngine()
    // Black to move here — Stockfish's "score cp 30" means +30 for BLACK,
    // i.e. -30 for White. Before the fix this passed straight through as 30.
    const result = engine.evaluate('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', 20)
    worker.onmessage({ data: 'info depth 20 multipv 1 score cp 30 pv e7e5' })
    worker.onmessage({ data: 'bestmove e7e5' })
    expect((await result).eval).toBe(-30)
  })

  it('normalizes a mate score the same way as a centipawn score', async () => {
    const { engine, worker } = await initEngine()
    // Black to move, "mate 2" means Black delivers mate — very bad for White.
    const result = engine.evaluate('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', 20)
    worker.onmessage({ data: 'info depth 20 multipv 1 score mate 2 pv e7e5' })
    worker.onmessage({ data: 'bestmove e7e5' })
    expect((await result).eval).toBeLessThan(-9000)
  })

  // Regression test for the "eval bar doesn't change / analysis stuck
  // loading" bug: GameReviewPage.jsx calls cancelQueued() on every engine
  // when a new game is loaded mid-analysis, so a previous game's queued (not
  // yet dispatched) positions don't sit ahead of the new game's evaluate()
  // calls in each engine's FIFO queue.
  it('cancelQueued resolves not-yet-dispatched positions with a placeholder, without touching the one already in flight', async () => {
    const { engine, worker } = await initEngine()
    const inFlight = engine.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 20)
    const queued   = engine.evaluate('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', 20)

    // Only the first position's fen/go should have been posted so far.
    expect(worker.posted.filter(m => m.startsWith('position fen')).length).toBe(1)

    engine.cancelQueued()
    await expect(queued).resolves.toEqual({ eval: 0, bestMove: null, eval2: null, secondMove: null })

    // The in-flight evaluate() is untouched — still pending until its own bestmove arrives.
    worker.onmessage({ data: 'info depth 20 multipv 1 score cp 15 pv e2e4' })
    worker.onmessage({ data: 'bestmove e2e4' })
    expect((await inFlight).eval).toBe(15)
  })
})

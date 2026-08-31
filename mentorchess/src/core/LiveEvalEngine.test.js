import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LiveEvalEngine } from './LiveEvalEngine'

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
  const engine = new LiveEvalEngine()
  const ready = engine.init()
  worker.onmessage({ data: 'uciok' })
  worker.onmessage({ data: 'readyok' })
  await ready
  return { engine, worker }
}

describe('LiveEvalEngine', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('normalizes a White-to-move eval unchanged (already White-perspective)', async () => {
    const { engine, worker } = await initEngine()
    const result = engine.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    worker.onmessage({ data: 'info depth 16 multipv 1 score cp 40 pv e2e4' })
    worker.onmessage({ data: 'bestmove e2e4' })
    expect((await result).eval).toBe(40)
  })

  it('flips a Black-to-move eval to White-perspective (Stockfish reports it relative to the mover)', async () => {
    const { engine, worker } = await initEngine()
    // Black to move — Stockfish's "score cp 40" means +40 for BLACK, i.e.
    // -40 for White. Before the fix this passed straight through as 40,
    // which is what made the live eval bar flip to the wrong side on
    // alternating moves.
    const result = engine.evaluate('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2')
    worker.onmessage({ data: 'info depth 16 multipv 1 score cp 40 pv e7e5 g1f3' })
    worker.onmessage({ data: 'bestmove e7e5' })
    expect((await result).eval).toBe(-40)
  })
})

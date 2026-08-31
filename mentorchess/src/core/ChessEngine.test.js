import { describe, it, expect } from 'vitest'
import { ChessEngine } from '@core/ChessEngine'

describe('ChessEngine', () => {
  it('starts at the standard opening position by default', () => {
    const engine = new ChessEngine()
    expect(engine.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(engine.isWhiteTurn).toBe(true)
    expect(engine.moveHistory).toEqual([])
  })

  it('loads a custom FEN when provided', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
    const engine = new ChessEngine(fen)
    expect(engine.fen).toBe(fen)
    expect(engine.isWhiteTurn).toBe(false)
  })

  it('applies a legal move and tracks history, rejects illegal moves', () => {
    const engine = new ChessEngine()
    const result = engine.move('e4')
    expect(result).not.toBeNull()
    expect(engine.sanHistory).toEqual(['e4'])
    expect(engine.move('e5e5')).toBeNull()
  })
})

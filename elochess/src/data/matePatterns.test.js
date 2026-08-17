import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { PATTERNS } from './matePatterns'

// Regression test for real bugs found 2026-07-15: Boden's Mate's `fen` had
// a malformed castling field ("w d - 0 1" instead of "w - - 0 1"), which
// chess.js rejects — and useChessBoard's `new Chess(initialFen)` isn't
// wrapped in try/catch, so it threw synchronously during render and crashed
// the whole page the moment the pattern was selected. Auditing the rest of
// PATTERNS the same way turned up three more broken solutions (Smothered,
// Anastasia's, Arabian) that either weren't legal moves at all or didn't
// actually deliver checkmate — all fixed alongside Boden's. This test
// validates every pattern's FEN parses, and (for patterns with a solution)
// that the listed move is legal and actually delivers checkmate — the exact
// class of bug this page has no other coverage against.
describe('matePatterns data', () => {
  it.each(PATTERNS)('$name has a valid FEN', (pattern) => {
    expect(() => new Chess(pattern.fen)).not.toThrow()
  })

  it.each(PATTERNS.filter(p => p.solution.length > 0))(
    '$name\'s solution move is legal and delivers checkmate',
    (pattern) => {
      const chess = new Chess(pattern.fen)
      const move = chess.move(pattern.solution[0])
      expect(move).not.toBeNull()
      expect(chess.isCheckmate()).toBe(true)
    }
  )

  // Regression for 4 real bugs found 2026-08-17 (Arabian, Epaulette,
  // Damiano's, Vukovic): the mating piece sat on the same open file/rank as
  // the king with nothing between them, so the king was already under
  // attack before the labeled "solution" move — the puzzle secretly started
  // one move too late. Checked by flipping whose turn it is (piece
  // placement unchanged) and asking whether the flipped-to-move side is in
  // check — that reveals an existing attack on the king regardless of whose
  // turn the FEN claims it is.
  it.each(PATTERNS.filter(p => p.solution.length > 0))(
    '$name is not already check before the solution move is played',
    (pattern) => {
      const [board, turn, ...rest] = pattern.fen.split(' ')
      const flipped = [board, turn === 'w' ? 'b' : 'w', ...rest].join(' ')
      expect(new Chess(flipped).inCheck()).toBe(false)
    }
  )
})

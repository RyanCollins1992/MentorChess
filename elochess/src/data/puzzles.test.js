import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { PUZZLES } from './puzzles'

// Regression coverage for two real bugs found 2026-08-17: p7 ("King
// Opposition") had no pawn, so chess.js correctly called the position an
// immediate draw by insufficient material — there was nothing to actually
// solve. And matePatterns.js's Scholar's Mate entry showed the position
// *after* Qxf7# had already been played, so there was no move left to make
// (Ryan: "the scholars already has black in checkmate"). Both are the same
// class of bug — a puzzle whose FEN is already game-over before the player
// makes a move — so this suite checks every puzzle's FEN is still a live,
// unsolved position, and that its solution move is legal from there.
describe('puzzles data', () => {
  it.each(PUZZLES)('$id ($title) has a valid, non-terminal starting FEN', (puzzle) => {
    let chess
    expect(() => { chess = new Chess(puzzle.fen) }).not.toThrow()
    expect(chess.isCheckmate(), 'starts on the last move — already checkmate').toBe(false)
    expect(chess.isStalemate() || chess.isDraw(), 'starts on an already-drawn position').toBe(false)
  })

  it.each(PUZZLES)('$id ($title) solution move is legal from the starting FEN', (puzzle) => {
    const chess = new Chess(puzzle.fen)
    const move = chess.move(puzzle.solution[0])
    expect(move).not.toBeNull()
  })

  it('every puzzle id is unique', () => {
    const ids = PUZZLES.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Regression for real bugs found 2026-08-17 in p79/p85/p88 and p121-124:
  // the solving piece sat on the same open file/rank/diagonal as the king
  // with nothing between them, so the king was already under attack before
  // the labeled "solution" move — checked by flipping whose turn it is
  // (piece placement unchanged) and asking whether the flipped-to-move side
  // is in check. See matePatterns.test.js for the sibling check.
  it.each(PUZZLES)('$id ($title) is not already check before the solution move is played', (puzzle) => {
    const [board, turn, ...rest] = puzzle.fen.split(' ')
    const flipped = [board, turn === 'w' ? 'b' : 'w', ...rest].join(' ')
    expect(new Chess(flipped).inCheck()).toBe(false)
  })
})

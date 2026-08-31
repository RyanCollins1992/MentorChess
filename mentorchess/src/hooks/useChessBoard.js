import { useState, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * useChessBoard — the shared chessboard drop-handling boilerplate.
 *
 * Follows the project's stale-closure rule: the Chess instance lives in a REF
 * (mutations don't trigger renders); only the FEN string lives in STATE so the
 * board re-renders. Everything else (move indices, mistake counts, expected-line
 * checking, follow-up/AI moves, flash styling) stays in the consuming page —
 * this hook only owns the instance and the fen sync.
 *
 * API:
 * - fen        current position (state — pass to <Chessboard position>)
 * - chessRef   the Chess instance ref, for reads inside handlers
 *              (turn(), isGameOver(), history(), moves(), fen(), …)
 * - move(input)      chess.js move (SAN string or {from,to,promotion}); updates fen
 *                    and returns the verbose move, or null if the move is illegal.
 *                    (chess.js throws on illegal moves — returning null IS the
 *                    legality check, not a swallowed error.)
 * - tryMove(from, to, promotion?)  drop-handler sugar for move({from, to, promotion}),
 *                    defaulting promotion to 'q' — pass the expected line's own
 *                    promotion piece for drills with an underpromotion move, or a
 *                    drag can never match a scripted "=N"/"=R"/"=B" line (a real
 *                    bug found shipping the Lasker Trap, whose point IS the
 *                    underpromotion).
 * - undo()     reverts the last move and re-syncs fen
 * - reset(newFen?)   reloads newFen (or the standard start position). Throws on
 *                    an invalid FEN so callers can surface the error themselves.
 *
 * All returned functions are referentially stable (useCallback), so they are
 * safe to list in effect dependency arrays.
 */
export function useChessBoard(initialFen) {
  const chessRef = useRef(new Chess(initialFen || undefined))
  const [fen, setFen] = useState(initialFen || START_FEN)

  const move = useCallback((input) => {
    let result
    try { result = chessRef.current.move(input) } catch { return null }
    if (result) setFen(chessRef.current.fen())
    return result
  }, [])

  const tryMove = useCallback((from, to, promotion = 'q') => move({ from, to, promotion }), [move])

  const undo = useCallback(() => {
    const result = chessRef.current.undo()
    if (result) setFen(chessRef.current.fen())
    return result
  }, [])

  const reset = useCallback((newFen) => {
    if (newFen) chessRef.current.load(newFen)
    else chessRef.current.reset()
    setFen(chessRef.current.fen())
  }, [])

  return { fen, chessRef, move, tryMove, undo, reset }
}

import { useState, useCallback } from 'react'

/**
 * Shared "is this drop a pawn promotion, and if so, which piece did the user
 * pick" state machine — used by any page that lets the user actually choose
 * a promotion piece (FreePlayPage, VsCoachPage), as opposed to the scripted
 * drill pages (Openings/SpacedReview/MemoryDrill), which already know the
 * expected line's promotion piece ahead of time and pass it straight to
 * tryMove (see useChessBoard.js's own doc comment re: the Lasker Trap fix).
 *
 * Detection is delegated to chess.js itself (`moves({square, verbose:true})`)
 * rather than reimplemented (e.g. "is it a pawn on the 7th/2nd rank") so it
 * inherits chess.js's own legality rules for free (pinned pawns, etc. are
 * automatically excluded since illegal moves never appear in that list).
 */
export function usePendingPromotion(chessRef) {
  const [pending, setPending] = useState(null) // { from, to, color } | null

  const detect = useCallback((from, to) => {
    const moves = chessRef.current.moves({ square: from, verbose: true })
    return moves.some(m => m.to === to && m.promotion)
  }, [chessRef])

  const request = useCallback((from, to) => {
    setPending({ from, to, color: chessRef.current.turn() })
  }, [chessRef])

  const cancel = useCallback(() => setPending(null), [])

  return { pending, detect, request, cancel }
}

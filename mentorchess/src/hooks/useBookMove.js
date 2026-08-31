import { useMemo } from 'react'
import { Chess } from 'chess.js'
import { nextBookMove } from '../core/openingIdentifier'
import { readThemeColor } from '../core/themeColor'

/**
 * "Book-move ghosting" — the last of the original Tempo design doc's
 * "Premium interactions" (card-fan promotion and the ambient clock-tick are
 * the other two, see FreePlayPage.jsx/VsCoachPage.jsx and PromotionPicker.jsx).
 * A faint arrow previewing what curated theory recommends next — purely a
 * suggestion, never forced or auto-played, and only shown once the played
 * moves are a genuine prefix of a known line (nextBookMove already handles
 * "diverged from the book" by returning null itself).
 *
 * Pure data lookup (no engine involved), so this is cheap enough to run on
 * every position — no lazy worker like useLiveEval's Stockfish instance.
 */
export function useBookMove(fen, sanMoveList, enabled) {
  return useMemo(() => {
    if (!enabled) return null
    const san = nextBookMove(sanMoveList)
    if (!san) return null

    // Resolve the SAN move to concrete squares against the *current*
    // position — a scratch Chess instance, never touches the page's own
    // chessRef/game state.
    try {
      const scratch = new Chess(fen)
      const result = scratch.move(san)
      if (!result) return null
      const rgb = readThemeColor('--color-muted-rgb', '138 129 118')
      return { startSquare: result.from, endSquare: result.to, color: `rgb(${rgb} / 0.55)` }
    } catch {
      return null
    }
  }, [fen, sanMoveList, enabled])
}

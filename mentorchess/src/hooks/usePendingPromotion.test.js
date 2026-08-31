import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Chess } from 'chess.js'
import { usePendingPromotion } from './usePendingPromotion'

// A white pawn one step from promoting, black king out of the way.
const PROMOTION_FEN = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1'

function chessRefFor(fen) {
  return { current: new Chess(fen) }
}

describe('usePendingPromotion', () => {
  it('detects a promotion-eligible move', () => {
    const chessRef = chessRefFor(PROMOTION_FEN)
    const { result } = renderHook(() => usePendingPromotion(chessRef))
    expect(result.current.detect('e7', 'e8')).toBe(true)
  })

  it('does not detect a non-promotion move as a promotion', () => {
    const chessRef = chessRefFor('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1') // pawn on e2, nowhere near promoting
    const { result } = renderHook(() => usePendingPromotion(chessRef))
    expect(result.current.detect('e2', 'e3')).toBe(false)
  })

  it('does not detect an illegal move as a promotion', () => {
    const chessRef = chessRefFor(PROMOTION_FEN)
    const { result } = renderHook(() => usePendingPromotion(chessRef))
    // e7-d8 isn't a legal pawn move here (no piece on d8 to capture).
    expect(result.current.detect('e7', 'd8')).toBe(false)
  })

  it('request() records the pending move and the side to move', () => {
    const chessRef = chessRefFor(PROMOTION_FEN)
    const { result } = renderHook(() => usePendingPromotion(chessRef))

    act(() => result.current.request('e7', 'e8'))

    expect(result.current.pending).toEqual({ from: 'e7', to: 'e8', color: 'w' })
  })

  it('cancel() clears the pending move', () => {
    const chessRef = chessRefFor(PROMOTION_FEN)
    const { result } = renderHook(() => usePendingPromotion(chessRef))

    act(() => result.current.request('e7', 'e8'))
    expect(result.current.pending).not.toBeNull()

    act(() => result.current.cancel())
    expect(result.current.pending).toBeNull()
  })

  it('starts with no pending promotion', () => {
    const chessRef = chessRefFor(PROMOTION_FEN)
    const { result } = renderHook(() => usePendingPromotion(chessRef))
    expect(result.current.pending).toBeNull()
  })
})

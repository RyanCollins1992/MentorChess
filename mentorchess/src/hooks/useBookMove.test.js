import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Chess } from 'chess.js'
import { useBookMove } from './useBookMove'

// Fried Liver Attack line (same as core/openingIdentifier.test.js) minus its
// final move — a genuine book prefix, next move should be 'Bxc6+'.
const FRIED_LIVER_PREFIX = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6']

function fenAfter(sanMoves) {
  const c = new Chess()
  for (const m of sanMoves) c.move(m)
  return c.fen()
}

describe('useBookMove', () => {
  it('returns null when disabled, even mid-book', () => {
    const { result } = renderHook(() => useBookMove(fenAfter(FRIED_LIVER_PREFIX), FRIED_LIVER_PREFIX, false))
    expect(result.current).toBeNull()
  })

  it('returns a ghost arrow for the book move when enabled and in book', () => {
    const { result } = renderHook(() => useBookMove(fenAfter(FRIED_LIVER_PREFIX), FRIED_LIVER_PREFIX, true))
    // Bxc6+ is a bishop capturing on c6 from b5.
    expect(result.current).toEqual(expect.objectContaining({ startSquare: 'b5', endSquare: 'c6' }))
    expect(result.current.color).toMatch(/^rgb\(/)
  })

  it('returns null once the game has diverged from every known line', () => {
    // Bxc6+ is check along c6-d7-e8; Nxc6 (the a5 knight recapturing) is a
    // legal reply that isn't the line's own next move — same "diverged from
    // book" case identifyOpening's own test covers, but this one has to be
    // an actually-legal move since this hook plays it through chess.js
    // rather than just string-comparing SAN like identifyOpening does.
    const moves = [...FRIED_LIVER_PREFIX, 'Bxc6+', 'Nxc6']
    const { result } = renderHook(() => useBookMove(fenAfter(moves), moves, true))
    expect(result.current).toBeNull()
  })

  it('returns null before any moves have been played', () => {
    const { result } = renderHook(() => useBookMove(fenAfter([]), [], true))
    expect(result.current).toBeNull()
  })
})

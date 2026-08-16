import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Chessboard } from './Chessboard'
import { useAppStore } from '../../store/useAppStore'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// react-chessboard's square divs each carry a stable data-square="e2" attribute
// with a plain onClick handler (not a drag sensor), so they can be targeted and
// clicked directly in jsdom without needing real layout/pixel coordinates.
const square = (container, id) => container.querySelector(`[data-square="${id}"]`)
const click = (container, id) => fireEvent.click(square(container, id))

describe('Chessboard', () => {
  it('renders without crashing given a FEN', () => {
    const { container } = render(<Chessboard position={START_FEN} onPieceDrop={() => true} />)
    expect(square(container, 'e2')).toBeTruthy()
  })

  it('click-to-move: clicking a piece then a legal destination calls onPieceDrop', () => {
    const onPieceDrop = vi.fn(() => true)
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={onPieceDrop} arePiecesDraggable />
    )
    click(container, 'e2')
    click(container, 'e4')

    expect(onPieceDrop).toHaveBeenCalledTimes(1)
    const call = onPieceDrop.mock.calls[0][0]
    expect(call.sourceSquare).toBe('e2')
    expect(call.targetSquare).toBe('e4')
  })

  // Regression test for a real bug found 2026-07-15: FreePlayPage.jsx and
  // SpacedReviewPage.jsx both omitted `arePiecesDraggable`, and this guard
  // clause silently no-ops in that case — so click-to-move was completely
  // dead on those two pages (drag-and-drop still worked, which is why it
  // went unnoticed). This test pins the documented behavior so a future
  // change can't silently reintroduce it without a test failing here too.
  it('click-to-move does nothing when arePiecesDraggable is not passed', () => {
    const onPieceDrop = vi.fn(() => true)
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={onPieceDrop} />
    )
    click(container, 'e2')
    click(container, 'e4')

    expect(onPieceDrop).not.toHaveBeenCalled()
  })

  it('clicking a square with no piece, then a destination, does not call onPieceDrop', () => {
    const onPieceDrop = vi.fn(() => true)
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={onPieceDrop} arePiecesDraggable />
    )
    click(container, 'e4') // empty square — nothing selected
    click(container, 'e5')

    expect(onPieceDrop).not.toHaveBeenCalled()
  })

  it('clicking an opponent piece first does not select it (no move fires on the next click)', () => {
    const onPieceDrop = vi.fn(() => true)
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={onPieceDrop} arePiecesDraggable />
    )
    // It's White's turn; e7 is a Black pawn — not selectable.
    click(container, 'e7')
    click(container, 'e5')

    expect(onPieceDrop).not.toHaveBeenCalled()
  })

  it('re-clicking the same piece twice does not call onPieceDrop (no self-move)', () => {
    const onPieceDrop = vi.fn(() => true)
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={onPieceDrop} arePiecesDraggable />
    )
    click(container, 'e2')
    click(container, 'e2')

    expect(onPieceDrop).not.toHaveBeenCalled()
  })

  it('shows the check-blink highlight on the king square when the position is in check', () => {
    // White king on e1 in check from a black rook on the e-file.
    const CHECK_FEN = '4r2k/8/8/8/8/8/8/4K3 w - - 0 1'
    const { container } = render(<Chessboard position={CHECK_FEN} onPieceDrop={() => true} />)
    // squareStyles (where the check-blink animation lives) is applied by
    // react-chessboard to an inner wrapper div, not the outer [data-square] div.
    const kingSquare = square(container, 'e1')
    const innerDiv = kingSquare.querySelector('div')
    expect(innerDiv.style.animation).toContain('check-blink')
  })

  it('glows both squares of the lastMove prop', () => {
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={() => true} lastMove={{ from: 'e2', to: 'e4' }} />
    )
    const fromInner = square(container, 'e2').querySelector('div')
    const toInner   = square(container, 'e4').querySelector('div')
    expect(fromInner.style.animation).toContain('last-move-glow')
    expect(toInner.style.animation).toContain('last-move-glow')
    expect(toInner.style.animation).not.toContain('capture-impact')
  })

  it('layers the capture-impact flash on top of the glow when lastMove.captured is true', () => {
    const { container } = render(
      <Chessboard position={START_FEN} onPieceDrop={() => true} lastMove={{ from: 'e4', to: 'd5', captured: true }} />
    )
    const toInner = square(container, 'd5').querySelector('div')
    expect(toInner.style.animation).toContain('last-move-glow')
    expect(toInner.style.animation).toContain('capture-impact')
  })

  // Regression test for a real bug, found 2026-07-24: every piece style's
  // rendered content had `pointer-events: none` on its own wrapper. A real
  // mouse drag's mousedown landed outside the piece's actual DOM subtree
  // (confirmed via document.elementFromPoint against a live page — the hit
  // target was an ancestor wrapper, not the draggable node react-chessboard/
  // dnd-kit registers), so drag-and-drop was silently broken for every piece
  // style, for every user, while click-to-move kept working (a click still
  // bubbles up to the square's own handler regardless of which element
  // absorbed the initial hit). Removing pointer-events:none from every piece
  // renderer fixed it — confirmed live with a real mouse-event sequence
  // (page.mouse.down/move/up, not a high-level "drag" helper) against all
  // piece styles. This test pins the fix at the CSS level, one row per style,
  // so a future edit can't silently reintroduce pointer-events:none on any
  // of them.
  it.each(['classic', 'fantasy', 'skulls'])(
    'the %s piece style\'s own rendered root is never pointer-events:none (breaks real-mouse dragging)',
    (pieceStyle) => {
      useAppStore.setState(s => ({ settings: { ...s.settings, pieceStyle } }))
      const { container } = render(
        <Chessboard position={START_FEN} onPieceDrop={() => true} arePiecesDraggable />
      )
      const pieceRoot = square(container, 'e2').querySelector('[data-piece]')
      expect(pieceRoot).toBeTruthy()
      // Check every descendant too, not just the immediate wrapper — any
      // pointer-events:none anywhere inside the piece's own subtree causes
      // the same hit-testing problem the bug was rooted in.
      const allNodes = [pieceRoot, ...pieceRoot.querySelectorAll('*')]
      for (const node of allNodes) {
        expect(node.style.pointerEvents).not.toBe('none')
      }
    }
  )
})

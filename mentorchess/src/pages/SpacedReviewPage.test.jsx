import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SpacedReviewPage from './SpacedReviewPage'
import { srsEngine } from '../core/SpacedRepetitionEngine'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

describe('SpacedReviewPage', () => {
  it('shows the empty state when nothing is due', () => {
    render(<SpacedReviewPage />)
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
  })

  it('shows the drill card for a due trap', () => {
    // enroll() sets dueDate to "now" — by the time getDueCards() checks
    // dueDate <= now a moment later, it already qualifies as due.
    srsEngine.enroll('scholars-mate')
    render(<SpacedReviewPage />)

    expect(screen.getByText("Scholar's Mate")).toBeInTheDocument()
    expect(screen.getByText('1.Qh5')).toBeInTheDocument()
  })

  // Regression test for a real bug found 2026-07-15: this page never passed
  // `arePiecesDraggable` to <Chessboard>, and Chessboard's click handler
  // silently no-ops when that prop is falsy — so click-to-move was
  // completely dead on this drill (only drag-and-drop worked, which is why
  // it went unnoticed). Drives the real Chessboard component, not a mock.
  it('click-to-move: playing the correct first move advances the drill', async () => {
    srsEngine.enroll('scholars-mate')
    const { container } = render(<SpacedReviewPage />)

    // Scholar's Mate: 1.Qh5 (queen d1-h5) is the first move the drill expects.
    click(container, 'd1')
    click(container, 'h5')

    // The auto-played opponent reply (1...Nc6) fires 500ms after the correct
    // move; wait for both pills to mark as played (i < moveIdx → accent2).
    await waitFor(() => {
      expect(screen.getByText('1.Qh5').className).toContain('text-accent2')
      expect(screen.getByText('Nc6').className).toContain('text-accent2')
    })
  })

  it('click-to-move: an incorrect move flashes wrong and does not advance', () => {
    srsEngine.enroll('scholars-mate')
    const { container } = render(<SpacedReviewPage />)

    // Nf3 is legal but not the expected first move (Qh5).
    click(container, 'g1')
    click(container, 'f3')

    // Still on the first move — nothing has been marked as played yet.
    expect(screen.getByText('1.Qh5').className).not.toContain('text-accent2')
    expect(screen.getByText('1.Qh5').className).toContain('text-gold')
  })
})

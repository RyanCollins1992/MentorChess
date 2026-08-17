import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PuzzlesPage from './PuzzlesPage'
import { useAppStore } from '../store/useAppStore'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

describe('PuzzlesPage', () => {
  beforeEach(() => {
    useAppStore.setState({ solvedPuzzles: [] })
    localStorage.removeItem('mentorchess-selected-puzzle')
  })

  it('shows a placeholder until a puzzle is selected', () => {
    render(<PuzzlesPage />)
    expect(screen.getByText('Select a puzzle')).toBeInTheDocument()
  })

  it('theme filter narrows the puzzle list', () => {
    render(<PuzzlesPage />)
    expect(screen.getByText('Back Rank Checkmate')).toBeInTheDocument()
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Fork' } })
    expect(screen.queryByText('Back Rank Checkmate')).not.toBeInTheDocument()
    expect(screen.getByText('Fork the King and Rook')).toBeInTheDocument()
  })

  it('difficulty filter narrows the puzzle list', () => {
    render(<PuzzlesPage />)
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'advanced' } })
    expect(screen.queryByText('Back Rank Checkmate')).not.toBeInTheDocument()
    // "Queen Sacrifice" isn't unique — the puzzle data has two entries with
    // that exact title (p6 and p89) — pick one that genuinely is.
    expect(screen.getByText('Discovered Check')).toBeInTheDocument()
  })

  it('selecting a puzzle shows its board and hint toggle', () => {
    render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    expect(screen.getByText('💡 Show Hint')).toBeInTheDocument()
  })

  it('Show Hint reveals the hint text', () => {
    render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    fireEvent.click(screen.getByText('💡 Show Hint'))
    expect(screen.getByText('The enemy king is trapped on the back rank')).toBeInTheDocument()
    expect(screen.getByText('💡 Hide Hint')).toBeInTheDocument()
  })

  it('Show Hint glows the square of the piece to move (Rd1, the solving rook)', () => {
    const { container } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    fireEvent.click(screen.getByText('💡 Show Hint'))

    // squareStyles (where the glow animation lives) lands on react-chessboard's
    // inner wrapper div, not the outer [data-square] div — same pattern as
    // Chessboard.test.jsx's check-blink/last-move-glow assertions.
    const d1Inner = container.querySelector('[data-square="d1"]').querySelector('div')
    expect(d1Inner.style.animation).toContain('hint-glow')

    fireEvent.click(screen.getByText('💡 Hide Hint'))
    expect(container.querySelector('[data-square="d1"]').querySelector('div').style.animation).not.toContain('hint-glow')
  })

  it('playing the correct solution move marks the puzzle solved', () => {
    const { container } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    click(container, 'd1')
    click(container, 'd8')

    expect(screen.getByText('✅ Solved!')).toBeInTheDocument()
    expect(screen.getByText('First try!')).toBeInTheDocument()
    expect(useAppStore.getState().solvedPuzzles).toContain('p1')
  })

  it('solving a puzzle registers on the 7-day activity heatmap for today', () => {
    const { container } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    click(container, 'd1')
    click(container, 'd8')

    // Real per-day counts from ProgressManager.xpHistory, not fabricated —
    // today's bar (the 7th/rightmost) should now show a non-zero count.
    // Solved via a title attribute rather than an exact count, since
    // ProgressManager is a persistent singleton and earlier tests in this
    // file may have already logged a solve earlier "today".
    const bars = container.querySelectorAll('[title$="puzzle solved"], [title$="puzzles solved"]')
    expect(bars.length).toBe(7)
    const todaysBar = bars[bars.length - 1]
    expect(todaysBar.title).not.toBe('0 puzzles solved')
  })

  it('an incorrect move does not solve it, and a subsequent solve is no longer "first try"', () => {
    const { container } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    click(container, 'd1')
    click(container, 'd5') // legal but wrong

    expect(screen.queryByText('✅ Solved!')).not.toBeInTheDocument()

    // The wrong move gets undone (see handleDrop's undo() on mismatch), so
    // the rook is back on d1, not left sitting on d5.
    click(container, 'd1')
    click(container, 'd8') // now the correct move

    expect(screen.getByText('✅ Solved!')).toBeInTheDocument()
    expect(screen.queryByText('First try!')).not.toBeInTheDocument()
  })

  it('Reset restores the board to the puzzle start position', () => {
    const { container } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    click(container, 'd1')
    click(container, 'd5') // move the rook off its start square
    fireEvent.click(screen.getByText('↺ Reset'))

    // If the reset genuinely put the rook back on d1, the same
    // click-to-move sequence used elsewhere in this file to solve the
    // puzzle should work again from scratch.
    click(container, 'd1')
    click(container, 'd8')
    expect(screen.getByText('✅ Solved!')).toBeInTheDocument()
  })

  it('Reset after solving lets the puzzle be played again, not left locked on the solved screen', () => {
    const { container } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    click(container, 'd1')
    click(container, 'd8')
    expect(screen.getByText('✅ Solved!')).toBeInTheDocument()

    fireEvent.click(screen.getByText('↺ Reset'))
    expect(screen.queryByText('✅ Solved!')).not.toBeInTheDocument()
    expect(screen.getByText('Find the best move', { exact: false })).toBeInTheDocument()
  })

  it('selecting a puzzle persists it so a refresh reopens the same one', () => {
    render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    expect(localStorage.getItem('mentorchess-selected-puzzle')).toBe('p1')
  })

  it('remounting the page (simulating a refresh) restores the previously-open puzzle', () => {
    const { unmount } = render(<PuzzlesPage />)
    fireEvent.click(screen.getByText('Back Rank Checkmate'))
    unmount()

    render(<PuzzlesPage />)
    expect(screen.getByText('💡 Show Hint')).toBeInTheDocument()
    expect(screen.queryByText('Select a puzzle')).not.toBeInTheDocument()
  })
})

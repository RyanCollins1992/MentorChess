import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoveLedger from './MoveLedger'

describe('MoveLedger', () => {
  it('shows an empty-state message when there are no moves', () => {
    render(<MoveLedger moveList={[]} />)
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })

  it('shows an empty-state message when moveList is undefined', () => {
    render(<MoveLedger />)
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })

  it('pairs moves into numbered White|Black rows', () => {
    render(<MoveLedger moveList={['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']} />)
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
    expect(screen.getByText('3.')).toBeInTheDocument()
    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('Bb5')).toBeInTheDocument()
  })

  it('leaves an odd final row half-empty rather than throwing', () => {
    render(<MoveLedger moveList={['e4', 'e5', 'Nf3']} />)
    expect(screen.getByText('Nf3')).toBeInTheDocument()
  })

  it('without activeIdx, only the last move gets the gold "current" class', () => {
    render(<MoveLedger moveList={['e4', 'e5', 'Nf3']} />)
    expect(screen.getByText('e4')).toHaveClass('text-white')
    expect(screen.getByText('e5')).toHaveClass('text-muted')
    expect(screen.getByText('Nf3')).toHaveClass('text-gold', 'font-bold')
  })

  it('with activeIdx, applies played/current/upcoming 3-way styling', () => {
    render(<MoveLedger moveList={['e4', 'e5', 'Nf3', 'Nc6']} activeIdx={2} />)
    expect(screen.getByText('e4')).toHaveClass('text-accent2')   // played (idx 0 < 2)
    expect(screen.getByText('e5')).toHaveClass('text-accent2')   // played (idx 1 < 2)
    expect(screen.getByText('Nf3')).toHaveClass('text-gold', 'font-bold') // current (idx 2)
    expect(screen.getByText('Nc6')).toHaveClass('text-muted')    // upcoming (idx 3 > 2)
  })

  it('calls onMoveClick with the move index when a played move is clicked', async () => {
    const user = userEvent.setup()
    const onMoveClick = vi.fn()
    render(<MoveLedger moveList={['e4', 'e5', 'Nf3', 'Nc6']} activeIdx={2} onMoveClick={onMoveClick} />)

    await user.click(screen.getByText('e5'))
    expect(onMoveClick).toHaveBeenCalledWith(1)
  })

  it('does not attach a click handler to an empty cell in the final odd row', async () => {
    const user = userEvent.setup()
    const onMoveClick = vi.fn()
    const { container } = render(<MoveLedger moveList={['e4', 'e5', 'Nf3']} onMoveClick={onMoveClick} />)

    // The Black cell of the final (odd) row renders empty — find it via the
    // last row's second span rather than by text, since it has none.
    // container.firstChild is the ledger's own root div; its direct
    // children are the row divs (not container's direct children, which
    // is just the single ledger root wrapping all of them).
    const rows = container.firstChild.children
    const lastRow = rows[rows.length - 1]
    const emptyCell = lastRow.querySelectorAll('span')[2]
    await user.click(emptyCell)
    expect(onMoveClick).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MatePatternsPage from './MatePatternsPage'
import { useAppStore } from '../store/useAppStore'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

describe('MatePatternsPage', () => {
  beforeEach(() => {
    useAppStore.setState({ matePatternsLearned: [] })
  })

  it('shows a placeholder until a pattern is selected', () => {
    render(<MatePatternsPage />)
    expect(screen.getByText('Select a pattern')).toBeInTheDocument()
  })

  it('shows 0/N learned initially', () => {
    render(<MatePatternsPage />)
    expect(screen.getByText(/^0\/\d+ learned$/)).toBeInTheDocument()
  })

  it('category filter narrows the pattern list', () => {
    render(<MatePatternsPage />)
    expect(screen.getByText('Back Rank Mate')).toBeInTheDocument()
    // "Knight" also appears as several patterns' own category subtitle —
    // the filter button is the one inside the category button row.
    fireEvent.click(screen.getByRole('button', { name: 'Knight' }))
    expect(screen.queryByText('Back Rank Mate')).not.toBeInTheDocument()
    expect(screen.getByText('Smothered Mate')).toBeInTheDocument()
  })

  it('selecting a pattern shows the board and the "find the checkmate" prompt', () => {
    render(<MatePatternsPage />)
    fireEvent.click(screen.getByText('Back Rank Mate'))
    expect(screen.getByText('Find the checkmate move!', { exact: false })).toBeInTheDocument()
  })

  it('Scholar\'s Mate starts from the position before the final blow, not the completed mate', () => {
    const { container } = render(<MatePatternsPage />)
    fireEvent.click(screen.getByText("Scholar's Mate"))
    expect(screen.queryByText('Study position — no moves required', { exact: false })).not.toBeInTheDocument()
    expect(screen.getByText('Find the checkmate move!', { exact: false })).toBeInTheDocument()

    click(container, 'h5')
    click(container, 'f7')
    expect(screen.getByText('✅ Explanation')).toBeInTheDocument()
    expect(useAppStore.getState().matePatternsLearned).toContain('scholars')
  })

  it('playing the correct solution move marks the pattern learned', () => {
    const { container } = render(<MatePatternsPage />)
    fireEvent.click(screen.getByText('Back Rank Mate'))
    click(container, 'd1')
    click(container, 'd8')

    expect(screen.getByText('✅ Learned!')).toBeInTheDocument()
    expect(useAppStore.getState().matePatternsLearned).toContain('back-rank')
  })

  it('an incorrect move is rejected and does not mark the pattern learned', () => {
    const { container } = render(<MatePatternsPage />)
    fireEvent.click(screen.getByText('Back Rank Mate'))
    click(container, 'd1')
    click(container, 'd5') // legal rook move, not the mating move

    expect(screen.queryByText('✅ Learned!')).not.toBeInTheDocument()
    expect(useAppStore.getState().matePatternsLearned).not.toContain('back-rank')
  })

  it('the learned count updates after solving a pattern', () => {
    const { container } = render(<MatePatternsPage />)
    fireEvent.click(screen.getByText('Back Rank Mate'))
    click(container, 'd1')
    click(container, 'd8')

    expect(screen.getByText(/^1\/\d+ learned$/)).toBeInTheDocument()
  })
})

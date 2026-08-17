import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RateDifficultyPage from './RateDifficultyPage'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { TOTAL_TRAPS } from '../data/traps'

describe('RateDifficultyPage', () => {
  beforeEach(() => {
    // currentPage defaults to 'openings' itself, so the navigation tests
    // below start it somewhere else — otherwise "didn't navigate" can't be
    // told apart from "was already on openings by default".
    useAppStore.setState({ difficultyRatings: {}, currentPage: 'dashboard' })
    useOpeningsStore.setState({ selectedTrap: null, activeColor: 'white' })
  })

  it('shows 0 rated out of the full trap count initially', () => {
    render(<RateDifficultyPage />)
    expect(screen.getByText(`0/${TOTAL_TRAPS}`)).toBeInTheDocument()
  })

  it('groups traps into White/Black/Mates sections', () => {
    render(<RateDifficultyPage />)
    expect(screen.getByText('♔ White Traps')).toBeInTheDocument()
    expect(screen.getByText('♚ Black Traps')).toBeInTheDocument()
    expect(screen.getByText('💀 Mates')).toBeInTheDocument()
  })

  it('clicking the 2nd star rates a trap Medium and updates the store', () => {
    render(<RateDifficultyPage />)
    const row = screen.getByText('Fried Liver Attack').closest('div.bg-bg2')
    const stars = row.querySelectorAll('button')
    fireEvent.click(stars[1]) // 2nd star = rating 2 (Medium)

    expect(useAppStore.getState().difficultyRatings['fried-liver']).toBe(2)
    expect(screen.getByText(`1/${TOTAL_TRAPS}`)).toBeInTheDocument()
  })

  // srsEngine.setRating() is a no-op if the trap isn't enrolled yet
  // (`if (!card) return` — rating only actually affects the SM-2 ease
  // factor once a trap is in the active review queue), so this only
  // exercises real SRS-side effects once enrolled first, unlike the test
  // above where the difficultyRatings store still updates regardless.
  it('for an SRS-enrolled trap, rating it also updates the SRS card', () => {
    srsEngine.enroll('fried-liver')
    render(<RateDifficultyPage />)
    const row = screen.getByText('Fried Liver Attack').closest('div.bg-bg2')
    fireEvent.click(row.querySelectorAll('button')[2]) // 3rd star = Hard (3)

    expect(srsEngine._cards['fried-liver'].rating).toBe(3)
  })

  it('clicking a trap row navigates to Openings with that exact trap selected', () => {
    render(<RateDifficultyPage />)
    const row = screen.getByText('Fried Liver Attack').closest('div.bg-bg2')
    fireEvent.click(row)

    expect(useAppStore.getState().currentPage).toBe('openings')
    expect(useOpeningsStore.getState().selectedTrap?.id).toBe('fried-liver')
    expect(useOpeningsStore.getState().activeColor).toBe('white')
  })

  it('clicking a star to rate a trap does not also navigate away', () => {
    render(<RateDifficultyPage />)
    const row = screen.getByText('Fried Liver Attack').closest('div.bg-bg2')
    fireEvent.click(row.querySelectorAll('button')[1])

    expect(useAppStore.getState().currentPage).toBe('dashboard')
    expect(useOpeningsStore.getState().selectedTrap).toBeNull()
  })

  it('clicking the same star again clears the rating (toggle off)', () => {
    useAppStore.setState({ difficultyRatings: { 'fried-liver': 2 } })
    render(<RateDifficultyPage />)
    const row = screen.getByText('Fried Liver Attack').closest('div.bg-bg2')
    fireEvent.click(row.querySelectorAll('button')[1]) // click the already-set 2nd star again

    expect(useAppStore.getState().difficultyRatings['fried-liver']).toBe(0)
  })

  it('the Unrated filter hides traps that already have a rating', () => {
    useAppStore.setState({ difficultyRatings: { 'fried-liver': 1 } })
    render(<RateDifficultyPage />)
    fireEvent.click(screen.getByText('Unrated'))

    expect(screen.queryByText('Fried Liver Attack')).not.toBeInTheDocument()
    expect(screen.getByText("Scholar's Mate")).toBeInTheDocument()
  })

  it('the Easy filter shows only traps rated 1 star', () => {
    useAppStore.setState({ difficultyRatings: { 'fried-liver': 1, 'legal-trap': 3 } })
    render(<RateDifficultyPage />)
    fireEvent.click(screen.getByText('Easy'))

    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.queryByText("Legal's Trap")).not.toBeInTheDocument()
  })

  it('search filters by trap name', () => {
    render(<RateDifficultyPage />)
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'fried liver' } })
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.queryByText("Scholar's Mate")).not.toBeInTheDocument()
  })

  it('shows the empty state when a filter/search combination matches nothing', () => {
    render(<RateDifficultyPage />)
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzznotarealtrap' } })
    expect(screen.getByText('No traps match this filter')).toBeInTheDocument()
  })
})

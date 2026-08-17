import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FavouritesPage from './FavouritesPage'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'

describe('FavouritesPage', () => {
  beforeEach(() => {
    // currentPage defaults to 'openings' itself, so navigation tests start
    // it somewhere else — otherwise "did navigate" can't be told apart from
    // "was already on openings by default".
    useAppStore.setState({ favourites: [], currentPage: 'dashboard' })
    useOpeningsStore.setState({ selectedTrap: null, activeColor: 'white' })
  })

  it('shows the empty state when there are no favourites', () => {
    render(<FavouritesPage />)
    expect(screen.getByText('No favourites yet')).toBeInTheDocument()
    expect(screen.getByText('0 traps saved')).toBeInTheDocument()
  })

  it('lists all traps to browse when none are favourited yet', () => {
    render(<FavouritesPage />)
    expect(screen.getByText('All Traps')).toBeInTheDocument()
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
  })

  it('starring a trap moves it into "Your Favourites" and updates the store', () => {
    render(<FavouritesPage />)
    const trapRow = screen.getByText('Fried Liver Attack').closest('div[class*="cursor-pointer"]')
    fireEvent.click(trapRow.querySelector('button'))

    expect(useAppStore.getState().favourites).toContain('fried-liver')
    expect(screen.getByText('⭐ Your Favourites')).toBeInTheDocument()
    expect(screen.getByText('Add More')).toBeInTheDocument()
  })

  it('un-starring a favourited trap removes it from the favourites list', () => {
    useAppStore.setState({ favourites: ['fried-liver'] })
    render(<FavouritesPage />)
    expect(screen.getByText('1 trap saved')).toBeInTheDocument()

    const trapRow = screen.getByText('Fried Liver Attack').closest('div[class*="cursor-pointer"]')
    fireEvent.click(trapRow.querySelector('button'))

    expect(useAppStore.getState().favourites).not.toContain('fried-liver')
  })

  it('search filters both the favourites and the browse-all list by name', () => {
    useAppStore.setState({ favourites: ['fried-liver'] })
    render(<FavouritesPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps…'), { target: { value: 'scholar' } })

    expect(screen.queryByText('Fried Liver Attack')).not.toBeInTheDocument()
    expect(screen.getByText("Scholar's Mate")).toBeInTheDocument()
  })

  it('search also matches by opening name, not just trap name', () => {
    render(<FavouritesPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps…'), { target: { value: 'ruy lopez' } })
    expect(screen.getByText('Fishing Pole Trap')).toBeInTheDocument()
  })

  it('clicking a trap row navigates to Openings with that exact trap selected, not just the generic list', () => {
    render(<FavouritesPage />)
    fireEvent.click(screen.getByText('Fried Liver Attack'))
    expect(useAppStore.getState().currentPage).toBe('openings')
    expect(useOpeningsStore.getState().selectedTrap?.id).toBe('fried-liver')
    expect(useOpeningsStore.getState().activeColor).toBe('white')
  })

  it('clicking a mate trap selects it and switches the Openings tab to Mates', () => {
    render(<FavouritesPage />)
    fireEvent.click(screen.getByText("Scholar's Mate"))
    expect(useOpeningsStore.getState().selectedTrap?.id).toBe('scholars-mate')
    expect(useOpeningsStore.getState().activeColor).toBe('mates')
  })

  it('the White/Black color tabs filter traps by their color field', () => {
    render(<FavouritesPage />)
    // Fried Liver Attack is a white trap, Traxler Counterattack is black.
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.getByText('Traxler Counterattack')).toBeInTheDocument()

    fireEvent.click(screen.getByText('White'))
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.queryByText('Traxler Counterattack')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Black'))
    expect(screen.queryByText('Fried Liver Attack')).not.toBeInTheDocument()
    expect(screen.getByText('Traxler Counterattack')).toBeInTheDocument()

    fireEvent.click(screen.getByText('All'))
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.getByText('Traxler Counterattack')).toBeInTheDocument()
  })
})

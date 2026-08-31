import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OpeningDatabasePage from './OpeningDatabasePage'

describe('OpeningDatabasePage', () => {
  it('prompts to search or pick a category before showing any list, and no board is selected yet', () => {
    render(<OpeningDatabasePage />)
    expect(screen.getByText('Select an opening to browse')).toBeInTheDocument()
    expect(screen.getByText('Search by name or pick a category to browse')).toBeInTheDocument()
  })

  it('never shows an ECO code — entries are listed by name only', () => {
    render(<OpeningDatabasePage />)
    fireEvent.change(screen.getByPlaceholderText('Search opening names…'), { target: { value: 'Najdorf' } })
    expect(screen.queryByText(/^[A-E]\d{2}$/)).not.toBeInTheDocument()
  })

  it('search narrows the list by name', () => {
    render(<OpeningDatabasePage />)
    fireEvent.change(screen.getByPlaceholderText('Search opening names…'), { target: { value: 'Najdorf' } })
    expect(screen.getByText('Sicilian Defence: Najdorf')).toBeInTheDocument()
  })

  it('every entry in the database has at least 8 moves', async () => {
    const { ECO_DATABASE } = await import('../data/ecoDatabase')
    expect(ECO_DATABASE.length).toBeGreaterThan(0)
    expect(ECO_DATABASE.every(e => e.moves.length >= 8)).toBe(true)
  })

  it('category filter narrows the list, excluding entries from other categories', () => {
    render(<OpeningDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Indian Defences' }))
    expect(screen.getByText('166 openings')).toBeInTheDocument()
    expect(screen.queryByText('Sicilian Defence: Najdorf')).not.toBeInTheDocument()
  })

  it('selecting an entry shows the board and its move order', () => {
    render(<OpeningDatabasePage />)
    fireEvent.change(screen.getByPlaceholderText('Search opening names…'), { target: { value: 'Najdorf' } })
    fireEvent.click(screen.getByText('Sicilian Defence: Najdorf'))
    expect(screen.getAllByText('Sicilian Defence: Najdorf').length).toBeGreaterThan(0)
    expect(screen.getByText('Move Order')).toBeInTheDocument()
  })

  it('caps rendered results at 200 with a hint to narrow the search', () => {
    render(<OpeningDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Games & French Defence' }))
    expect(screen.getByText(/showing first 200/)).toBeInTheDocument()
  })
})

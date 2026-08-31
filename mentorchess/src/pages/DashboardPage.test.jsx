import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from './DashboardPage'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'

describe('DashboardPage', () => {
  beforeEach(() => {
    useAppStore.getState().refreshProgress()
  })

  it('shows the current ELO and streak in the header', () => {
    render(<DashboardPage />)
    expect(screen.getAllByText(`${progressManager.currentElo}`, { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('day streak')).toBeInTheDocument()
  })

  it('shows "No reviews due" when nothing is due', () => {
    render(<DashboardPage />)
    expect(screen.getByText('No reviews due', { exact: false })).toBeInTheDocument()
  })

  it('renders the four stat cards', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Current Rating')).toBeInTheDocument()
    expect(screen.getByText('Due for Review')).toBeInTheDocument()
    expect(screen.getByText('Puzzles Solved')).toBeInTheDocument()
    expect(screen.getByText('Total Drills')).toBeInTheDocument()
  })

  it('shows the "play more games" placeholder instead of a chart when ELO history is short', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Play more games to see your ELO trend')).toBeInTheDocument()
  })

  it('shows a rating chart once there are 2+ recorded ELO points', () => {
    progressManager.recordElo(600)
    progressManager.recordElo(650)
    useAppStore.getState().refreshProgress()
    render(<DashboardPage />)
    expect(screen.queryByText('Play more games to see your ELO trend')).not.toBeInTheDocument()
    expect(screen.getByText('Rating Progress')).toBeInTheDocument()
  })

  it('the Continue Learning "Puzzles" row navigates to the puzzles page', () => {
    render(<DashboardPage />)
    screen.getByText('Puzzles').closest('button').click()
    expect(useAppStore.getState().currentPage).toBe('puzzles')
  })

  it('the Continue Learning "Spaced Review" row navigates to spaced-review', () => {
    render(<DashboardPage />)
    screen.getByText('Spaced Review').closest('button').click()
    expect(useAppStore.getState().currentPage).toBe('spaced-review')
  })

  it('Jump back in quick links navigate to their respective pages', () => {
    render(<DashboardPage />)
    screen.getByText('Openings').closest('button').click()
    expect(useAppStore.getState().currentPage).toBe('openings')

    screen.getByText('Endgames').closest('button').click()
    expect(useAppStore.getState().currentPage).toBe('endgames')

    screen.getByText('Mate Patterns').closest('button').click()
    expect(useAppStore.getState().currentPage).toBe('mate-patterns')
  })
})

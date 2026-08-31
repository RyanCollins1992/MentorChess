import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EloRoadmapPage from './EloRoadmapPage'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

// Stage titles appear twice: once in the header's "Stage: X" summary line,
// once as the stage row's own heading in the list below — this grabs the
// list row specifically (the one worth asserting against in most tests
// here), disambiguating by its distinct className.
const stageRow = (title) => screen.getAllByText(title).find(el => el.className.includes('font-bold')).closest('button')

describe('EloRoadmapPage', () => {
  beforeEach(() => {
    progressManager.recordElo(500)
  })

  it('shows the current ELO and the matching stage title', () => {
    render(<EloRoadmapPage />)
    expect(screen.getByText('500')).toBeInTheDocument()
    // 500 falls in the 400–700 "Beginner" band.
    expect(stageRow('Beginner')).toBeInTheDocument()
  })

  it('the current-ELO stage is expanded by default with its goals visible', () => {
    render(<EloRoadmapPage />)
    expect(screen.getByText('✅ Goals at this level')).toBeInTheDocument()
    expect(screen.getByText('Recognise and avoid forks')).toBeInTheDocument()
  })

  it('the expanded stage also shows a recommended-reading list', () => {
    render(<EloRoadmapPage />)
    expect(screen.getByText('📖 Recommended reading')).toBeInTheDocument()
    expect(screen.getByText('Chess Tactics for Students — John Bain')).toBeInTheDocument()
  })

  it('stages below the current ELO are marked done with a checkmark', () => {
    render(<EloRoadmapPage />)
    // "Complete Beginner" (0–400) is below current ELO 500 — should show ✓.
    const stage = screen.getByText('Complete Beginner').closest('button')
    expect(stage).toHaveTextContent('✓')
  })

  it('a higher-ELO stage shows the "You are here" badge only for the actual current stage', () => {
    render(<EloRoadmapPage />)
    expect(screen.getByText('You are here')).toBeInTheDocument()
    // Only one badge should exist.
    expect(screen.getAllByText('You are here')).toHaveLength(1)
  })

  it('clicking a non-current stage header expands its goals', () => {
    render(<EloRoadmapPage />)
    expect(screen.queryByText('Control the centre with pawns and pieces')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Intermediate Beginner'))
    expect(screen.getByText('Control the centre with pawns and pieces')).toBeInTheDocument()
  })

  it('clicking a study-section chip navigates to that page', () => {
    render(<EloRoadmapPage />)
    // Current stage (Beginner) suggests puzzles/mate-patterns/openings.
    fireEvent.click(screen.getByText('puzzles'))
    expect(useAppStore.getState().currentPage).toBe('puzzles')
  })

  it('a very high ELO lands on the final "Advanced" stage, not out of bounds', () => {
    progressManager.recordElo(2000)
    render(<EloRoadmapPage />)
    expect(stageRow('Advanced')).toBeInTheDocument()
    expect(screen.getByText('Master all endgame techniques')).toBeInTheDocument()
  })

  it('an ELO right at a boundary (700) lands in the higher band, not the lower one', () => {
    progressManager.recordElo(700)
    render(<EloRoadmapPage />)
    // 700 should land in "Intermediate Beginner" (700–1000), not "Beginner" (400–700).
    expect(stageRow('Intermediate Beginner')).toBeInTheDocument()
    expect(stageRow('Beginner')).toHaveTextContent('✓') // now marked done, not current
  })
})

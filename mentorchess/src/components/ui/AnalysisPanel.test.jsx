import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalysisPanel from './AnalysisPanel'
import { START_FEN } from '../../core/GameAnalysis'
import { TRAPS } from '../../data/traps'

const friedLiverMoves = TRAPS.find(t => t.id === 'fried-liver').moves

describe('AnalysisPanel', () => {
  it('shows a loading message while the engine is not ready', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={[]} sfReady={false} evalResult={null} tactic={null} />)
    expect(screen.getByText('⏳ Loading engine…')).toBeInTheDocument()
  })

  it('shows the eval bar once the engine is ready', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={[]} sfReady evalResult={{ eval: 45 }} tactic={null} />)
    expect(screen.queryByText('⏳ Loading engine…')).not.toBeInTheDocument()
    expect(screen.getByText('+0.5')).toBeInTheDocument()
  })

  it('identifies a known opening from the played moves', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={friedLiverMoves} sfReady evalResult={null} tactic={null} />)
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
  })

  it('shows no Opening section when nothing matches', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={['a4']} sfReady evalResult={null} tactic={null} />)
    expect(screen.queryByText('Opening')).not.toBeInTheDocument()
  })

  it('shows the tactical opportunity callout with a down-arrow between plies', () => {
    const tactic = [
      { san: 'Bxf2+', moveNum: '1…', from: 'c5', to: 'f2', color: 'b' },
      { san: 'Kxf2',  moveNum: '2.', from: 'e1', to: 'f2', color: 'w' },
      { san: 'Qh4+',  moveNum: '2…', from: 'd8', to: 'h4', color: 'b' },
    ]
    render(<AnalysisPanel fen={START_FEN} sanMoveList={[]} sfReady evalResult={{ eval: 900 }} tactic={tactic} />)
    expect(screen.getByText('🔥 Tactical opportunity')).toBeInTheDocument()
    expect(screen.getByText('1… Bxf2+')).toBeInTheDocument()
    expect(screen.getByText('2. Kxf2')).toBeInTheDocument()
    expect(screen.getAllByText('↓').length).toBe(2) // one before each ply after the first
  })

  it('shows no tactic callout when none was detected', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={[]} sfReady evalResult={{ eval: 20 }} tactic={null} />)
    expect(screen.queryByText('🔥 Tactical opportunity', { exact: false })).not.toBeInTheDocument()
  })

  it('shows Best/Alt variations from the engine PVs', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={[]} sfReady
      evalResult={{ eval: 30, pv: ['e2e4', 'e7e5'], pv2: ['d2d4', 'd7d5'] }} tactic={null} />)
    expect(screen.getByText('Best')).toBeInTheDocument()
    expect(screen.getByText('1.e4 1…e5', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Alt')).toBeInTheDocument()
    expect(screen.getByText('1.d4 1…d5', { exact: false })).toBeInTheDocument()
  })

  it('the notes textarea keeps whatever the user types', () => {
    render(<AnalysisPanel fen={START_FEN} sanMoveList={[]} sfReady={false} evalResult={null} tactic={null} />)
    const textarea = screen.getByPlaceholderText('Scratch notes for this game…')
    fireEvent.change(textarea, { target: { value: 'watch the queenside' } })
    expect(textarea).toHaveValue('watch the queenside')
  })
})

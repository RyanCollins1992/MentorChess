import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ScoutOpponentPage from './ScoutOpponentPage'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'
import * as ChessComImport from '../core/ChessComImport'

// The recommendation engine (OpponentScout.js) is unit-tested on its own —
// here it's exercised for real against fixture games so the page renders
// its actual output, only the network fetch is mocked.
function lossGame(opening) {
  return { color: 'Black', result: 'Loss', opening }
}

describe('ScoutOpponentPage', () => {
  beforeEach(() => {
    useAppStore.setState({ currentPage: 'scout-opponent' })
    vi.restoreAllMocks()
  })

  it('shows the empty placeholder before scouting', () => {
    render(<ScoutOpponentPage />)
    expect(screen.getByText('No opponent scouted yet')).toBeInTheDocument()
  })

  it('requires a username before scouting', () => {
    render(<ScoutOpponentPage />)
    fireEvent.click(screen.getByText('Scout'))
    expect(screen.getByText('Enter a Chess.com username')).toBeInTheDocument()
  })

  it('no public games found shows an error', async () => {
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue([])
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'ghost' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('No recent public games found for "ghost"')).toBeInTheDocument()
  })

  it('scans the last 50 games, not a fixed number of months', async () => {
    const spy = vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue([lossGame('Italian Game'), lossGame('Italian Game'), lossGame('Italian Game')])
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    await screen.findByText('3 games analyzed · weakling', { exact: false })
    expect(spy).toHaveBeenCalledWith('weakling', { limit: 50 })
  })

  it('a weak spot that matches a trap shows a "Practice this trap" recommendation', async () => {
    // 3 losses as Black against Italian Game lines — enough to clear MIN_SAMPLE
    // and matches the "fried-liver" trap's opening ("Italian Game", White).
    const games = [lossGame('Italian Game'), lossGame('Italian Game'), lossGame('Italian Game')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('3 games analyzed · weakling', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('1. Italian Game')).toBeInTheDocument()
    expect(screen.getByText('Play as white')).toBeInTheDocument()
    expect(screen.getByText('Practice this trap')).toBeInTheDocument()
  })

  it('clicking "Practice this trap" sets up the drill and navigates to Openings', async () => {
    const games = [lossGame('Italian Game'), lossGame('Italian Game'), lossGame('Italian Game')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    fireEvent.click(await screen.findByText('Practice this trap'))

    expect(useAppStore.getState().currentPage).toBe('openings')
    expect(useOpeningsStore.getState().drillMode).toBe(true)
    expect(useOpeningsStore.getState().activeColor).toBe('white')
    expect(useOpeningsStore.getState().selectedTrap?.id).toBe('fried-liver')
  })

  it('a weak spot with no matching trap falls back to a plain suggestion', async () => {
    const games = [lossGame('Some Obscure Line'), lossGame('Some Obscure Line'), lossGame('Some Obscure Line')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('Some Obscure Line')).toBeInTheDocument()
    expect(screen.queryByText('Practice this trap')).not.toBeInTheDocument()
    expect(screen.getByText('No matching trap in the library yet', { exact: false })).toBeInTheDocument()
  })

  it('lists the top 3 most-played openings, most common first, capped at 3', async () => {
    const games = [
      // "Big Opening": played 5 times
      ...Array(5).fill(0).map(() => lossGame('Big Opening')),
      // "Mid Opening": played 4 times
      ...Array(4).fill(0).map(() => lossGame('Mid Opening')),
      // "Small Opening": played 3 times
      ...Array(3).fill(0).map(() => lossGame('Small Opening')),
      // "Rarest Opening": played once — should be excluded from the top 3
      lossGame('Rarest Opening'),
    ]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'grinder' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('1. Big Opening')).toBeInTheDocument()
    expect(screen.getByText('2. Mid Opening')).toBeInTheDocument()
    expect(screen.getByText('3. Small Opening')).toBeInTheDocument()
    expect(screen.queryByText('Rarest Opening', { exact: false })).not.toBeInTheDocument()
  })

  it('an opening below the weak-spot sample size still shows up in the top list, with no best-counter trap', async () => {
    const games = [lossGame('Italian Game')] // a single game — too small a sample for a genuine weak spot
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('1. Italian Game')).toBeInTheDocument()
    expect(screen.getByText('Not enough repeated games in one opening yet to find a genuine weak spot.')).toBeInTheDocument()
  })

  it('a top opening with a sample game shows a Practice button that drills the opponent\'s actual moves', async () => {
    // Identical moves for all 3 games, so however the real ECO-backed
    // identifyOpening() names this exact line, they land in one bucket —
    // the test doesn't need to predict/hardcode that name.
    const ITALIAN_LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']
    const games = [
      { color: 'Black', result: 'Loss', opening: 'Italian Game', sanMoves: ITALIAN_LINE },
      { color: 'Black', result: 'Loss', opening: 'Italian Game', sanMoves: ITALIAN_LINE },
      { color: 'Black', result: 'Loss', opening: 'Italian Game', sanMoves: ITALIAN_LINE },
    ]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    await screen.findByText('3 games analyzed · weakling', { exact: false })
    fireEvent.click(screen.getByText('Practice'))

    expect(useAppStore.getState().currentPage).toBe('openings')
    expect(useOpeningsStore.getState().drillMode).toBe(true)
    expect(useOpeningsStore.getState().activeColor).toBe('white') // opponent played black
    expect(useOpeningsStore.getState().selectedTrap?.moves).toEqual(ITALIAN_LINE)
  })

  it('a top opening with no recorded moves (legacy fixture shape) shows no Practice button', async () => {
    const games = [lossGame('Italian Game'), lossGame('Italian Game'), lossGame('Italian Game')]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'weakling' } })
    fireEvent.click(screen.getByText('Scout'))

    await screen.findByText('1. Italian Game')
    expect(screen.queryByText('Practice')).not.toBeInTheDocument()
  })

  it('lists openings with a winning record too, not just losing ones', async () => {
    const games = [
      { color: 'White', result: 'Win', opening: 'Queens Gambit' },
      { color: 'White', result: 'Win', opening: 'Queens Gambit' },
      { color: 'White', result: 'Win', opening: 'Queens Gambit' },
    ]
    vi.spyOn(ChessComImport, 'fetchRecentGames').mockResolvedValue(games)
    render(<ScoutOpponentPage />)
    fireEvent.change(screen.getByLabelText("Their Chess.com username"), { target: { value: 'crusher' } })
    fireEvent.click(screen.getByText('Scout'))

    expect(await screen.findByText('1. Queens Gambit')).toBeInTheDocument()
    expect(screen.getByText('3W-0L-0D')).toBeInTheDocument()
  })
})

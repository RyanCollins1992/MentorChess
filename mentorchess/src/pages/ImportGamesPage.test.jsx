import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImportGamesPage from './ImportGamesPage'
import { useAppStore } from '../store/useAppStore'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function samplePgn({ result = '1-0', termination = 'hikaru won by checkmate' } = {}) {
  return `[Event "Live Chess"]\n[Date "2026.07.01"]\n[White "hikaru"]\n[Black "opponent1"]\n[Result "${result}"]\n[TimeControl "600"]\n[Termination "${termination}"]\n[Opening "Italian Game"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 ${result}`
}

function sampleGame(overrides = {}) {
  return {
    pgn: samplePgn(),
    white: { username: 'hikaru', rating: 2800 },
    black: { username: 'opponent1', rating: 2200 },
    accuracies: { white: 95.2, black: 80.1 },
    url: 'https://chess.com/game/1',
    ...overrides,
  }
}

describe('ImportGamesPage', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, chesscomUsername: '' },
      importedGames: {},
      reviewGame: null,
      currentPage: 'import-games',
    })
    vi.stubGlobal('fetch', vi.fn())
  })

  it('shows the empty placeholder before any fetch', () => {
    render(<ImportGamesPage />)
    expect(screen.getByText('No games loaded yet')).toBeInTheDocument()
  })

  it('requires a username before fetching', () => {
    render(<ImportGamesPage />)
    fireEvent.click(screen.getByText('Fetch Games'))
    expect(screen.getByText('Enter your Chess.com username')).toBeInTheDocument()
  })

  it('fetching games renders the parsed list', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ games: [sampleGame()] }) })
    render(<ImportGamesPage />)
    fireEvent.change(screen.getByLabelText('Chess.com username'), { target: { value: 'hikaru' } })
    fireEvent.click(screen.getByText('Fetch Games'))

    expect(await screen.findByText('vs opponent1 (2200)', { exact: false })).toBeInTheDocument()
    const now = new Date()
    expect(screen.getByText(`1 games · ${MONTHS[now.getMonth()]} ${now.getFullYear()}`)).toBeInTheDocument()
  })

  it('a 404 shows a "not found" error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
    render(<ImportGamesPage />)
    fireEvent.change(screen.getByLabelText('Chess.com username'), { target: { value: 'ghost' } })
    fireEvent.click(screen.getByText('Fetch Games'))

    expect(await screen.findByText('Player "ghost" not found on Chess.com')).toBeInTheDocument()
  })

  it('an empty month shows a "no games found" message', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ games: [] }) })
    render(<ImportGamesPage />)
    fireEvent.change(screen.getByLabelText('Chess.com username'), { target: { value: 'hikaru' } })
    fireEvent.click(screen.getByText('Fetch Games'))

    expect(await screen.findByText('No games found for', { exact: false })).toBeInTheDocument()
  })

  it('sorting by Opponent reorders the game list alphabetically, and toggling direction reverses it', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ games: [
        sampleGame({ black: { username: 'zebra', rating: 2000 }, pgn: samplePgn().replace('opponent1', 'zebra') }),
        sampleGame({ black: { username: 'apple', rating: 2000 }, pgn: samplePgn().replace('opponent1', 'apple') }),
      ] }),
    })
    render(<ImportGamesPage />)
    fireEvent.change(screen.getByLabelText('Chess.com username'), { target: { value: 'hikaru' } })
    fireEvent.click(screen.getByText('Fetch Games'))
    await screen.findByText('vs zebra', { exact: false })

    const opponentRowText = () => [...document.querySelectorAll('.space-y-2 > div.flex.items-center.gap-4')]
      .map(el => el.textContent)

    // First click on a column defaults to descending (matches Date/Accuracy/
    // Moves' "newest/highest first" default) — for Opponent that's Z→A.
    fireEvent.click(screen.getByText('Opponent'))
    let rows = opponentRowText()
    expect(rows[0]).toContain('zebra')
    expect(rows[1]).toContain('apple')

    fireEvent.click(screen.getByText('Opponent')) // toggle direction → A→Z
    rows = opponentRowText()
    expect(rows[0]).toContain('apple')
    expect(rows[1]).toContain('zebra')
  })

  it('clicking Review sets the review game and navigates to Game Breakdown', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ games: [sampleGame()] }) })
    render(<ImportGamesPage />)
    fireEvent.change(screen.getByLabelText('Chess.com username'), { target: { value: 'hikaru' } })
    fireEvent.click(screen.getByText('Fetch Games'))

    const reviewBtn = await screen.findByText('Review')
    fireEvent.click(reviewBtn)

    expect(useAppStore.getState().currentPage).toBe('game-review')
    expect(useAppStore.getState().reviewGame).toMatchObject({ opponent: 'opponent1', color: 'White' })
  })
})

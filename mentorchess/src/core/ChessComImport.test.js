import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchArchives, fetchRecentGames } from './ChessComImport'

function pgn(result) {
  return `[White "me"]\n[Black "opp"]\n[Result "${result}"]\n1. e4 e5 1-0`
}

function monthResponse(count, result = '1-0') {
  return { games: Array(count).fill(0).map(() => ({ pgn: pgn(result) })) }
}

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body }
}

describe('fetchArchives', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('returns the archives list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ archives: ['a', 'b', 'c'] })))
    expect(await fetchArchives('someone')).toEqual(['a', 'b', 'c'])
  })

  it('throws a friendly error on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchArchives('ghost')).rejects.toThrow('not found')
  })
})

describe('fetchRecentGames', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('walks archives newest-first and stops once `limit` games are collected', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ archives: ['m1', 'm2', 'm3'] })) // fetchArchives
      .mockResolvedValueOnce(jsonResponse(monthResponse(2))) // m3 (newest)
    vi.stubGlobal('fetch', fetchMock)

    const games = await fetchRecentGames('someone', { limit: 2 })

    expect(games).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2) // archives index + only the newest month
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'm3')
  })

  it('keeps fetching older months until the limit is met', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ archives: ['m1', 'm2', 'm3'] }))
      .mockResolvedValueOnce(jsonResponse(monthResponse(1))) // m3: only 1 game
      .mockResolvedValueOnce(jsonResponse(monthResponse(3))) // m2: enough to clear the limit
    vi.stubGlobal('fetch', fetchMock)

    const games = await fetchRecentGames('someone', { limit: 3 })

    expect(games).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(3) // archives + m3 + m2, m1 never needed
  })

  it('trims to exactly the most recent `limit` games when a month overshoots it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ archives: ['m1', 'm2'] }))
      .mockResolvedValueOnce(jsonResponse(monthResponse(10)))
    vi.stubGlobal('fetch', fetchMock)

    const games = await fetchRecentGames('someone', { limit: 4 })

    expect(games).toHaveLength(4)
  })

  it('skips a month whose fetch fails and keeps going', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ archives: ['m1', 'm2'] }))
      .mockResolvedValueOnce({ ok: false, status: 500 }) // m2 fails
      .mockResolvedValueOnce(jsonResponse(monthResponse(2))) // m1 succeeds
    vi.stubGlobal('fetch', fetchMock)

    const games = await fetchRecentGames('someone', { limit: 2 })

    expect(games).toHaveLength(2)
  })

  it('stops once the player has no more months, even under the limit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ archives: ['m1'] }))
      .mockResolvedValueOnce(jsonResponse(monthResponse(2)))
    vi.stubGlobal('fetch', fetchMock)

    const games = await fetchRecentGames('someone', { limit: 50 })

    expect(games).toHaveLength(2)
  })
})

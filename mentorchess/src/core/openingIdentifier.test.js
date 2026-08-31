import { describe, it, expect } from 'vitest'
import { identifyOpening, nextBookMove } from './openingIdentifier'

describe('identifyOpening', () => {
  it('returns null when no moves have been played', () => {
    expect(identifyOpening([])).toBeNull()
    expect(identifyOpening(null)).toBeNull()
  })

  it('returns null when the opening move matches nothing in the curated data', () => {
    expect(identifyOpening(['a4'])).toBeNull()
  })

  it('picks the longest-matching line when two lines share a prefix', () => {
    // Fried Liver Attack and Italian Game: Two Knights Defense (openingsRepertoire.js)
    // share their first 9 plies (e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5) before
    // diverging (Na5 vs Nxd5) — playing all the way to Fried Liver's own
    // 15-move line should resolve to it specifically, not the shorter-matching
    // near-duplicate.
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+']
    expect(identifyOpening(moves)).toBe('Fried Liver Attack')
  })

  it('still matches once the game has diverged past a known line\'s own length', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+', 'Kd7']
    expect(identifyOpening(moves)).toBe('Fried Liver Attack')
  })

  it('normalizes decorated SAN (check/mate/! symbols) when comparing', () => {
    // Fried Liver Attack's own line includes a decorated "Bb5+" — a played
    // move list without the trailing "+" should still match it.
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5']
    expect(identifyOpening(moves)).toBe('Fried Liver Attack')
  })

  it('excludes traps whose fen is not the standard starting position', () => {
    // Scholar's Mate is stored relative to a mid-opening fen (after
    // 1.e4 e5 2.Bc4) — its moves array ['Qh5','Nc6','Qxf7#'] is a
    // continuation from THAT position, not a from-move-1 sequence, so it
    // must not be matched against a real from-the-start move list (doing so
    // previously caused false positives — see OpponentScout's "Sicilian
    // Trap (Black)" regression).
    expect(identifyOpening(['Qh5', 'Nc6', 'Qxf7'])).toBeNull()
  })

  it('resolves a shared opening prefix before any traps diverge', () => {
    // Just 1.e4 e5 2.Nf3 Nc6 3.Bc4 matches many lines equally — the result
    // should still be one specific named line, not null/undefined.
    const result = identifyOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('falls back to ecoDatabase.js for lines outside the curated traps/repertoire', () => {
    // "Amar Opening: Gambit" exists only in ecoDatabase.js, not TRAPS or
    // OPENING_REPERTOIRE — proves the broader database is actually searched.
    const moves = ['Nh3', 'd5', 'g3', 'e5', 'f4', 'Bxh3', 'Bxh3', 'exf4']
    expect(identifyOpening(moves)).toBe('Amar Opening: Gambit')
  })
})

describe('nextBookMove', () => {
  it('returns null when no moves have been played', () => {
    expect(nextBookMove([])).toBeNull()
    expect(nextBookMove(null)).toBeNull()
  })

  it('returns the matched line\'s next move when the played moves are a genuine prefix', () => {
    // Same Fried Liver Attack line as the identifyOpening tests above, minus
    // its final move — the "book" suggestion should be exactly that move.
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6']
    expect(nextBookMove(moves)).toBe('Bxc6+')
  })

  it('returns null once the game has diverged past every known line (no longer "in book")', () => {
    // Same as identifyOpening's "still matches once diverged" test — the name
    // identification stays sticky (still Fried Liver Attack), but there's no
    // honest "next" move to suggest once real moves outrun the line.
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+', 'Kd7']
    expect(nextBookMove(moves)).toBeNull()
  })

  it('returns null once the matched line is fully played out (nothing left to suggest)', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Bxc6+']
    expect(nextBookMove(moves)).toBeNull()
  })

  it('returns null when the opening move matches nothing in the curated data', () => {
    expect(nextBookMove(['a4'])).toBeNull()
  })
})

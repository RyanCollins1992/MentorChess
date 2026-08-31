import { describe, it, expect } from 'vitest'
import {
  CLASSIFICATIONS,
  classifyMove,
  START_FEN,
  clampEval,
  encodeMateScore,
  isMateScore,
  mateDistance,
  winPercent,
  moveAccuracy,
  uciToSan,
  pvToSan,
  isGreatMove,
  isBrilliantMove,
  parsePgnToGame,
  parsePGN,
} from './GameAnalysis.js'

// ── Mate-score encoding ───────────────────────────────────────────
// Contract (fixed 2026-07-04 after the flat ±10000 encoding displayed
// "M1000"): mate scores encode as sign * (10000 - distance), regular cp
// evals clamp to ±2000, and any |cp| >= 9000 decodes back to a mate.
describe('mate-score encoding', () => {
  it('encodes mate-for as 10000 - distance', () => {
    expect(encodeMateScore(1)).toBe(9999)
    expect(encodeMateScore(3)).toBe(9997)
    expect(encodeMateScore(10)).toBe(9990)
  })

  it('encodes mate-against as -(10000 - distance)', () => {
    expect(encodeMateScore(-1)).toBe(-9999)
    expect(encodeMateScore(-3)).toBe(-9997)
    expect(encodeMateScore(-10)).toBe(-9990)
  })

  it('orders closer mates as more extreme scores', () => {
    expect(encodeMateScore(1)).toBeGreaterThan(encodeMateScore(5))
    expect(encodeMateScore(-1)).toBeLessThan(encodeMateScore(-5))
  })

  it.each([1, 2, 5, 10, 100, 1000])('round-trips mate in %i for both sides', (m) => {
    const forUs = encodeMateScore(m)
    expect(isMateScore(forUs)).toBe(true)
    expect(forUs).toBeGreaterThan(0)
    expect(mateDistance(forUs)).toBe(m)

    const against = encodeMateScore(-m)
    expect(isMateScore(against)).toBe(true)
    expect(against).toBeLessThan(0)
    expect(mateDistance(against)).toBe(m)
  })

  it('decode threshold boundary sits exactly at |cp| = 9000', () => {
    expect(isMateScore(9000)).toBe(true)   // mate in 1000 — encoding's outer limit
    expect(isMateScore(-9000)).toBe(true)
    expect(isMateScore(8999)).toBe(false)
    expect(isMateScore(-8999)).toBe(false)
    expect(mateDistance(9000)).toBe(1000)
    // Distances beyond 1000 would fall below the threshold — outside the
    // contract, and unreachable in real games (documented, not "fixed").
    expect(isMateScore(encodeMateScore(1001))).toBe(false)
  })

  it('clamped cp evals can never collide with the mate range', () => {
    expect(clampEval(50)).toBe(50)
    expect(clampEval(2000)).toBe(2000)
    expect(clampEval(2001)).toBe(2000)
    expect(clampEval(-2001)).toBe(-2000)
    expect(clampEval(99999)).toBe(2000)
    expect(isMateScore(clampEval(99999))).toBe(false)
    expect(isMateScore(clampEval(-99999))).toBe(false)
  })
})

// ── classifyMove ──────────────────────────────────────────────────
describe('classifyMove', () => {
  // Thresholds on the mover-perspective delta (from the code):
  // >= -10 BEST, >= -25 EXCELLENT, >= -50 GOOD, >= -100 INACCURACY,
  // >= -200 MISTAKE, else BLUNDER.
  it.each([
    [0,    'BEST'],
    [-10,  'BEST'],
    [-11,  'EXCELLENT'],
    [-25,  'EXCELLENT'],
    [-26,  'GOOD'],
    [-50,  'GOOD'],
    [-51,  'INACCURACY'],
    [-100, 'INACCURACY'],
    [-101, 'MISTAKE'],
    [-200, 'MISTAKE'],
    [-201, 'BLUNDER'],
    [-1000, 'BLUNDER'],
  ])('white move with delta %i is %s', (delta, expected) => {
    expect(classifyMove(0, delta, true)).toBe(expected)
  })

  it('treats eval gains as BEST', () => {
    expect(classifyMove(0, 150, true)).toBe('BEST')
    expect(classifyMove(-300, -100, true)).toBe('BEST')
  })

  it('flips perspective for black: eval rising means black got worse', () => {
    expect(classifyMove(0, 300, false)).toBe('BLUNDER')  // black handed white +3
    expect(classifyMove(100, 50, false)).toBe('BEST')    // black clawed back 50cp
    expect(classifyMove(0, 60, false)).toBe('INACCURACY')
  })

  it('only returns keys that exist in CLASSIFICATIONS', () => {
    for (const delta of [0, -15, -30, -75, -150, -500]) {
      expect(CLASSIFICATIONS).toHaveProperty(classifyMove(0, delta, true))
    }
  })
})

// ── winPercent ────────────────────────────────────────────────────
describe('winPercent', () => {
  it('is 50% at equality', () => {
    expect(winPercent(0)).toBe(50)
  })

  it('is monotonic and symmetric around 50', () => {
    expect(winPercent(100)).toBeGreaterThan(50)
    expect(winPercent(-100)).toBeLessThan(50)
    expect(winPercent(100) + winPercent(-100)).toBeCloseTo(100, 6)
  })

  it('clamps input to ±3000 (mate-encoded scores saturate, not overflow)', () => {
    expect(winPercent(9999)).toBe(winPercent(3000))
    expect(winPercent(-9999)).toBe(winPercent(-3000))
    expect(winPercent(3000)).toBeLessThan(100)
  })
})

// ── moveAccuracy ──────────────────────────────────────────────────
describe('moveAccuracy', () => {
  it('is ~100 when the eval is unchanged', () => {
    expect(moveAccuracy(0, 0, true)).toBeCloseTo(100, 2)
    expect(moveAccuracy(150, 150, false)).toBeCloseTo(100, 2)
  })

  it('clamps to 100 when the move improves the position', () => {
    expect(moveAccuracy(0, 500, true)).toBe(100)
    expect(moveAccuracy(0, -500, false)).toBe(100) // black improving
  })

  it('drops sharply for large eval losses and never goes below 0', () => {
    const blunder = moveAccuracy(0, -1000, true)
    expect(blunder).toBeLessThan(20)
    expect(blunder).toBeGreaterThanOrEqual(0)
    expect(moveAccuracy(2000, -2000, true)).toBe(0)
  })

  it('is perspective-aware: the same eval swing scores opposite for each side', () => {
    const whiteView = moveAccuracy(0, -300, true)   // white lost 300cp
    const blackView = moveAccuracy(0, -300, false)  // black gained 300cp
    expect(whiteView).toBeLessThan(50)
    expect(blackView).toBe(100)
  })
})

// ── uciToSan ──────────────────────────────────────────────────────
describe('uciToSan', () => {
  it('converts simple moves', () => {
    expect(uciToSan(START_FEN, 'e2e4')).toBe('e4')
    expect(uciToSan(START_FEN, 'g1f3')).toBe('Nf3')
  })

  it('handles promotion suffixes', () => {
    expect(uciToSan('7k/4P3/8/8/8/8/8/4K3 w - - 0 1', 'e7e8q')).toBe('e8=Q+')
  })

  it('returns null for empty/illegal input or a bad FEN', () => {
    expect(uciToSan(START_FEN, null)).toBeNull()
    expect(uciToSan(START_FEN, '')).toBeNull()
    expect(uciToSan(START_FEN, 'e2e5')).toBeNull()       // illegal move
    expect(uciToSan('not a fen', 'e2e4')).toBeNull()
  })
})

// ── pvToSan ───────────────────────────────────────────────────────
describe('pvToSan', () => {
  it('replays a PV from the start position, numbering white/black moves', () => {
    const pv = pvToSan(START_FEN, ['e2e4', 'e7e5', 'g1f3'])
    expect(pv).toEqual([
      { san: 'e4',  from: 'e2', to: 'e4', color: 'w', moveNum: '1.' },
      { san: 'e5',  from: 'e7', to: 'e5', color: 'b', moveNum: '1…' },
      { san: 'Nf3', from: 'g1', to: 'f3', color: 'w', moveNum: '2.' },
    ])
  })

  it('numbers from the FEN\'s own fullmove/turn fields for a mid-game PV', () => {
    // After 1.e4 e5 2.Nf3 Nc6, White to move at move 3.
    const midgameFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    const pv = pvToSan(midgameFen, ['f1b5', 'a7a6'])
    expect(pv.map(p => p.moveNum)).toEqual(['3.', '3…'])
    expect(pv.map(p => p.san)).toEqual(['Bb5', 'a6'])
  })

  it('caps at maxPlies', () => {
    const pv = pvToSan(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'], 2)
    expect(pv).toHaveLength(2)
    expect(pv.map(p => p.san)).toEqual(['e4', 'e5'])
  })

  it('handles a promotion move mid-PV', () => {
    const pv = pvToSan('7k/4P3/8/8/8/8/8/4K3 w - - 0 1', ['e7e8q'])
    expect(pv[0].san).toBe('e8=Q+')
  })

  it('stops early (keeping what it built) on an illegal move', () => {
    const pv = pvToSan(START_FEN, ['e2e4', 'e7e6', 'e2e5']) // e2e5 illegal after the first two moves
    expect(pv.map(p => p.san)).toEqual(['e4', 'e6'])
  })

  it('returns an empty array for empty/missing input', () => {
    expect(pvToSan(START_FEN, [])).toEqual([])
    expect(pvToSan(START_FEN, null)).toEqual([])
  })
})

// ── isGreatMove ───────────────────────────────────────────────────
describe('isGreatMove', () => {
  it('requires the played move to be the engine top choice', () => {
    expect(isGreatMove({ playedIsBest: false, eval1: 500, eval2: 0 })).toBe(false)
  })

  it('requires a second engine line to compare against', () => {
    expect(isGreatMove({ playedIsBest: true, eval1: 500, eval2: null })).toBe(false)
    expect(isGreatMove({ playedIsBest: true, eval1: 500, eval2: undefined })).toBe(false)
  })

  it('fires when the gap to the second-best line is >= 70cp', () => {
    expect(isGreatMove({ playedIsBest: true, eval1: 100, eval2: 30 })).toBe(true)   // gap 70
    expect(isGreatMove({ playedIsBest: true, eval1: 100, eval2: 31 })).toBe(false)  // gap 69
    expect(isGreatMove({ playedIsBest: true, eval1: -30, eval2: -100 })).toBe(true) // abs gap
  })
})

// ── isBrilliantMove ───────────────────────────────────────────────
describe('isBrilliantMove', () => {
  // White knight on e5 can be taken by the d6 pawn (lesser value) — a sac.
  const KNIGHT_EN_PRISE = 'rnbqkbnr/ppp1pppp/3p4/4N3/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'

  it('detects a piece left capturable by an equal-or-lesser piece', () => {
    expect(isBrilliantMove({ playedIsBest: true, fenAfter: KNIGHT_EN_PRISE, toSquare: 'e5', movedPiece: 'n' })).toBe(true)
  })

  it('requires the played move to be the engine top choice', () => {
    expect(isBrilliantMove({ playedIsBest: false, fenAfter: KNIGHT_EN_PRISE, toSquare: 'e5', movedPiece: 'n' })).toBe(false)
  })

  it('is false when the moved piece cannot be captured at all', () => {
    const afterNf3 = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKBNR b KQkq - 1 1'
    expect(isBrilliantMove({ playedIsBest: true, fenAfter: afterNf3, toSquare: 'f3', movedPiece: 'n' })).toBe(false)
  })

  it('is false when only a higher-value piece can capture (not a sac)', () => {
    // White pawn on d4 attackable only by the c6 knight (3 > 1)
    const pawnVsKnight = 'r1bqkbnr/pppppppp/2n5/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1'
    expect(isBrilliantMove({ playedIsBest: true, fenAfter: pawnVsKnight, toSquare: 'd4', movedPiece: 'p' })).toBe(false)
  })

  it('is false for missing args or an invalid FEN', () => {
    expect(isBrilliantMove({ playedIsBest: true, fenAfter: KNIGHT_EN_PRISE, toSquare: null, movedPiece: 'n' })).toBe(false)
    expect(isBrilliantMove({ playedIsBest: true, fenAfter: KNIGHT_EN_PRISE, toSquare: 'e5', movedPiece: null })).toBe(false)
    expect(isBrilliantMove({ playedIsBest: true, fenAfter: 'garbage', toSquare: 'e5', movedPiece: 'n' })).toBe(false)
  })
})

// ── parsePGN ──────────────────────────────────────────────────────
describe('parsePGN', () => {
  it('parses a plain movetext into move objects', () => {
    const moves = parsePGN('1. e4 e5 2. Nf3 Nc6')
    expect(moves.map(m => m.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(moves.map(m => m.color)).toEqual(['w', 'b', 'w', 'b'])
    expect(moves.map(m => m.moveNum)).toEqual(['1.', '1…', '2.', '2…'])
    expect(moves[0].from).toBe('e2')
    expect(moves[0].to).toBe('e4')
    expect(moves[0].promotion).toBe('')
    // chess.js v1 omits the en-passant square when no capture is possible
    expect(moves[0].fenAfter).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
  })

  it('strips headers, comments, variations, NAGs and result markers', () => {
    const pgn = [
      '[Event "Test"]',
      '[Result "1-0"]',
      '',
      '1. e4 {best by test} e5 $1 (1... c5 2. Nf3) 2. Nf3 1-0',
    ].join('\n')
    expect(parsePGN(pgn).map(m => m.san)).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('returns [] for an empty string or headers-only PGN', () => {
    expect(parsePGN('')).toEqual([])
    expect(parsePGN('[Event "x"]\n[Result "*"]')).toEqual([])
  })

  it('returns [] instead of throwing on non-string input', () => {
    expect(parsePGN(null)).toEqual([])
    expect(parsePGN(undefined)).toEqual([])
  })

  it('parses a PGN with no result marker', () => {
    expect(parsePGN('1. e4 e5').length).toBe(2)
  })

  it('silently skips illegal or unparseable tokens (documented behavior)', () => {
    // Second "e4" is illegal for black and "Nf3" is then illegal too — both
    // are skipped rather than throwing, yielding a truncated move list.
    expect(parsePGN('1. e4 e4 2. Nf3').map(m => m.san)).toEqual(['e4'])
    expect(parsePGN('1. e4 zz9 e5').map(m => m.san)).toEqual(['e4', 'e5'])
  })
})

// ── parsePgnToGame ────────────────────────────────────────────────
describe('parsePgnToGame', () => {
  const PGN = [
    '[White "Ryan"]',
    '[Black "Rival"]',
    '[WhiteElo "1500"]',
    '[BlackElo "1600"]',
    '[Result "1-0"]',
    '[Date "2024.01.15"]',
    '[TimeControl "600"]',
    '[Opening "Italian Game"]',
    '[Termination "Normal"]',
    '',
    '1. e4 e5 2. Nf3 1-0',
  ].join('\n')

  it('extracts headers relative to my color', () => {
    const asWhite = parsePgnToGame(PGN, 'White')
    expect(asWhite.opponent).toBe('Rival')
    expect(asWhite.opponentRating).toBe('1600')
    expect(asWhite.myRating).toBe('1500')
    expect(asWhite.opening).toBe('Italian Game')
    expect(asWhite.timeControl).toBe('600')
    expect(asWhite.termination).toBe('Normal')

    const asBlack = parsePgnToGame(PGN, 'Black')
    expect(asBlack.opponent).toBe('Ryan')
    expect(asBlack.opponentRating).toBe('1500')
    expect(asBlack.myRating).toBe('1600')
  })

  it('maps the Result tag onto Win/Loss/Draw for my color', () => {
    expect(parsePgnToGame(PGN, 'White').result).toBe('Win')
    expect(parsePgnToGame(PGN, 'Black').result).toBe('Loss')
    const lossPgn = PGN.replace('[Result "1-0"]', '[Result "0-1"]')
    expect(parsePgnToGame(lossPgn, 'White').result).toBe('Loss')
    expect(parsePgnToGame(lossPgn, 'Black').result).toBe('Win')
    const drawPgn = PGN.replace('[Result "1-0"]', '[Result "1/2-1/2"]')
    expect(parsePgnToGame(drawPgn, 'White').result).toBe('Draw')
  })

  it('labels a missing/unknown Result tag as Draw (documented behavior)', () => {
    const noResult = '[White "A"]\n[Black "B"]\n\n1. e4 e5'
    expect(parsePgnToGame(noResult, 'White').result).toBe('Draw')
    const starResult = noResult.replace('\n\n', '\n[Result "*"]\n\n')
    expect(parsePgnToGame(starResult, 'White').result).toBe('Draw')
  })

  it('normalises dotted dates and counts full moves', () => {
    const game = parsePgnToGame(PGN, 'White')
    expect(game.date).toBe('2024-01-15')
    expect(game.moves).toBe(2) // 3 plies -> ceil(3/2)
  })

  it('falls back to defaults on an empty PGN without throwing', () => {
    const game = parsePgnToGame('', 'White')
    expect(game.result).toBe('Draw')
    expect(game.opponent).toBe('Black')
    expect(game.opponentRating).toBe('?')
    expect(game.opening).toBe('Unknown')
    expect(game.timeControl).toBe('Unknown')
    expect(game.date).toBe('Unknown')
    expect(game.moves).toBe(0)
  })
})

import { TRAPS } from '../data/traps'
import { OPENING_REPERTOIRE } from '../data/openingsRepertoire'
import { ECO_DATABASE } from '../data/ecoDatabase'

// Same SAN-decoration stripping already used in OpeningsPage.jsx/
// MemoryDrillPage.jsx for the same "does the played move match the
// scripted move" comparison problem.
const normalize = s => s.replace(/[+#!?]/g, '')

const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Every named line the app knows about, flattened to just {name, moves} —
// TRAPS/OPENING_REPERTOIRE first (curated teaching content, preferred on a
// tie since callers usually want the name the app can actually drill), then
// the much broader ECO_DATABASE (1,345 verified lines) as coverage for
// everything else. `allNamedLines()` is memoized — none of these three
// sources change at runtime, and this list gets rebuilt on every call
// otherwise (identifyOpening runs once per move in live eval).
//
// TRAPS entries whose `fen` isn't the standard starting position (e.g.
// Scholar's/Smothered/Anastasia's/Back Rank Mate, and the two "...Trap"
// entries that start from a specific mid-opening position rather than move
// 1) have a `moves` array that's a continuation relative to THAT fen, not a
// from-move-1 SAN sequence — comparing it against a real game's move list
// from the start produces false-positive matches whenever their first
// couple of moves happen to coincide with an unrelated opening (confirmed:
// "Sicilian Trap (Black)"'s moves start with Nf3/Nc6/d4, which falsely
// matched a real 1.Nf3 f5 Dutch Defense game). Excluded here rather than
// fixed at the data layer, since those traps are legitimately meant to be
// FEN-seeded for drilling — they just aren't valid input for this
// from-the-start identification.
let cached = null
function allNamedLines() {
  if (cached) return cached
  const trapLines = TRAPS.filter(t => t.fen === STANDARD_START_FEN).map(t => ({ name: t.name, moves: t.moves }))
  const repertoireLines = OPENING_REPERTOIRE.flatMap(group => group.lines.map(l => ({ name: l.name, moves: l.moves })))
  const ecoLines = ECO_DATABASE.map(e => ({ name: e.name, moves: e.moves }))
  cached = [...trapLines, ...repertoireLines, ...ecoLines]
  return cached
}

// How many of the played moves agree with this line's own moves, from the
// start — 0 if they disagree on move 1. Comparing up to the shorter of the
// two lengths: once a game runs past a line's own length, the position still
// genuinely passed through that line before diverging further, so it's
// still a real (if no-longer-deepening) match.
function matchLength(sanMoves, lineMoves) {
  const max = Math.min(sanMoves.length, lineMoves.length)
  let i = 0
  while (i < max && normalize(sanMoves[i]) === normalize(lineMoves[i])) i++
  return i
}

// A 1-ply "match" is meaningless — hundreds of lines share any single
// common opening move (Nf3, e4, d4...). Below this many plies of genuine
// agreement, a "best" match is more likely coincidence than a real
// identification (e.g. a game transposing into a line via a move order not
// literally present at the front of any of our lines can otherwise pick up
// a spurious 1-ply match to something totally unrelated purely because it
// happened to be scanned first). Callers with their own raw-name fallback
// (e.g. OpponentScout.js) should prefer that over a sub-threshold result.
const MIN_MATCH_LEN = 3

// Shared by identifyOpening/nextBookMove — finds the named line whose own
// moves share the longest matching prefix with what's actually been played.
// Returns null before any moves have been played, or when the best match
// found is too shallow (see MIN_MATCH_LEN) to be a meaningful identification.
function findBestMatch(sanMoves) {
  if (!sanMoves || sanMoves.length === 0) return null

  let best = null
  let bestLen = 0
  for (const line of allNamedLines()) {
    const len = matchLength(sanMoves, line.moves)
    if (len > bestLen) { bestLen = len; best = line }
  }
  return bestLen >= MIN_MATCH_LEN ? { line: best, matchLen: bestLen } : null
}

// Identifies the opening/trap a game's move list has followed. Returns null
// once the game diverges from every known line, before any moves have been
// played, or when the best match found is too shallow to be meaningful.
export function identifyOpening(sanMoves) {
  return findBestMatch(sanMoves)?.line.name ?? null
}

// The next move ("book move") of whichever named line best matches the
// game so far — the "book-move ghosting" premium interaction from the
// original Tempo design doc: a faint preview of what theory recommends
// next, not a move the player is required to make. Only returns a move
// when the played moves are a genuine *prefix* of the matched line (not
// just sharing a long common run that's since diverged) — matchLen must
// equal sanMoves.length, otherwise the game has already left the book and
// showing a "next" move from the old line would misleadingly suggest it's
// still relevant.
export function nextBookMove(sanMoves) {
  if (!sanMoves || sanMoves.length === 0) return null
  const match = findBestMatch(sanMoves)
  if (!match || match.matchLen !== sanMoves.length) return null
  return match.line.moves[sanMoves.length] ?? null
}

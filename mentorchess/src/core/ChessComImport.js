/**
 * Chess.com Published-Data API — PGN parsing and fetch helpers shared by
 * ImportGamesPage (your own games, single month) and ScoutOpponentPage (an
 * arbitrary opponent's public games, last N games via the archives index).
 * Extracted from ImportGamesPage.jsx once a second consumer needed the same
 * parsing logic.
 */

export function parseGame(g, myUsername) {
  const pgn = g.pgn || ''

  const header = (tag) => {
    const m = pgn.match(new RegExp(`\\[${tag} "([^"]+)"\\]`))
    return m ? m[1] : ''
  }

  const isWhite   = (g.white?.username || '').toLowerCase() === myUsername
  const color     = isWhite ? 'White' : 'Black'
  const myRating  = isWhite ? g.white?.rating : g.black?.rating
  const oppName   = isWhite ? (g.black?.username || 'Unknown') : (g.white?.username || 'Unknown')
  const oppRating = isWhite ? g.black?.rating : g.white?.rating

  // Result
  const resultStr = header('Result')
  let result = 'Draw'
  if (resultStr === '1-0') result = isWhite ? 'Win' : 'Loss'
  else if (resultStr === '0-1') result = isWhite ? 'Loss' : 'Win'

  // Termination
  const term = header('Termination').replace(/^.+? by /, '') || 'unknown'

  // Date
  const dateStr = header('Date') || header('UTCDate') || ''
  const date    = dateStr.replace(/\./g, '-')

  // Opening
  const opening = header('Opening') || header('ECOUrl')?.split('/').pop()?.replace(/-/g, ' ') || 'Unknown'

  // Time control
  const tc     = g.time_control || header('TimeControl') || '?'
  const tcLabel = formatTimeControl(tc)

  // Move list + count. Order matters: Chess.com's real move text is
  // annotated with per-move clock comments containing their own brackets
  // ("1. e4 {[%clk 0:03:00]} 1... e6 {[%clk 0:03:00]} 2. Nf3 ..."), so the
  // `{...}` comments must be stripped BEFORE the `[...]` header-tag regex
  // runs — otherwise that regex reaches inside the comments and eats just
  // the "[%clk ...]" bracket, leaving an empty, no-longer-strippable "{}"
  // token behind for every single ply. Black's move number is also written
  // with three dots ("1...", not "1."), so the move-number strip needs
  // `\.+` (one or more dots), not a single literal `.` — otherwise it only
  // consumes the first dot and leaves a stray ".." token per full move.
  const movesOnly = pgn
    .replace(/\{[^}]+\}/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\d+\.+/g, '')
    .trim()
  const moveTokens = movesOnly.split(/\s+/).filter(t => t && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/))
  const moveCount  = Math.ceil(moveTokens.length / 2)

  // Accuracy (from Chess.com data if available)
  const myAcc = isWhite ? g.accuracies?.white : g.accuracies?.black

  return {
    pgn,
    color,
    result,
    opponent:       oppName,
    opponentRating: oppRating || '?',
    myRating:       myRating || '?',
    opening,
    sanMoves:       moveTokens,
    timeControl:    tcLabel,
    date,
    moves:          moveCount,
    termination:    term,
    accuracy:       myAcc != null ? Math.round(myAcc) : null,
    url:            g.url || '',
    white:          g.white?.username || '',
    black:          g.black?.username || '',
  }
}

export function formatTimeControl(tc) {
  if (!tc || tc === '-') return 'Unknown'
  const [base] = tc.split('+').map(Number)
  if (isNaN(base)) return tc
  if (base < 180) return `${base}s Bullet`
  if (base < 600) return `${Math.round(base/60)}min Blitz`
  if (base < 1800) return `${Math.round(base/60)}min Rapid`
  return `${Math.round(base/60)}min Classical`
}

// List of monthly archive URLs for a player, oldest first (Chess.com's own order).
export async function fetchArchives(username) {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`)
  if (res.status === 404) throw new Error(`Player "${username}" not found on Chess.com`)
  if (!res.ok) throw new Error(`Chess.com API error (${res.status})`)
  const data = await res.json()
  return data.archives || []
}

// Fetches and parses a player's most recent `limit` public games — used for
// opponent scouting, where a single month is too small/inconsistent a
// sample (some months have 2 games, some have 200). Walks the archives
// newest-month-first, fetching one month at a time until at least `limit`
// games have been collected (or the player's whole history is exhausted),
// then trims to exactly the most recent `limit`.
export async function fetchRecentGames(username, { limit = 50 } = {}) {
  const lower = username.trim().toLowerCase()
  const archives = await fetchArchives(lower)
  const games = [] // built oldest-to-newest as older months get prepended

  for (let i = archives.length - 1; i >= 0 && games.length < limit; i--) {
    const res = await fetch(archives[i])
    if (!res.ok) continue
    const data = await res.json()
    const parsed = (data.games || []).filter(g => g.pgn).map(g => parseGame(g, lower))
    games.unshift(...parsed)
  }

  return games.slice(-limit).reverse()
}

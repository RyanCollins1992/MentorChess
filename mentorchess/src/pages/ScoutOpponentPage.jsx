import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { fetchRecentGames } from '../core/ChessComImport'
import { allOpenings, recommendOpenings, spotToPracticeTrap } from '../core/OpponentScout'

const GAMES_SCANNED = 50
const TOP_N = 3

export default function ScoutOpponentPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState(null) // { username, gameCount, topOpenings, bestCounter }

  const navigate   = useAppStore(s => s.navigate)
  const selectTrap = useOpeningsStore(s => s.selectTrap)
  const setDrillMode = useOpeningsStore(s => s.setDrillMode)
  const setActiveColor = useOpeningsStore(s => s.setActiveColor)

  const scout = async () => {
    const name = username.trim()
    if (!name) { setError('Enter a Chess.com username'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const games = await fetchRecentGames(name, { limit: GAMES_SCANNED })
      if (games.length === 0) {
        setError(`No recent public games found for "${name}"`)
        return
      }
      const topOpenings = allOpenings(games).slice(0, TOP_N)
      const [bestCounter] = recommendOpenings(games, { max: 1 })
      setResult({ username: name, gameCount: games.length, topOpenings, bestCounter })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const practiceTrap = (trap) => {
    setDrillMode(true)
    setActiveColor(trap.color)
    selectTrap(trap)
    navigate('openings')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white font-heading">Scout Opponent</h2>
          <p className="text-muted text-sm mt-0.5">
            Pull a Chess.com player's last {GAMES_SCANNED} games, see their most common openings, practice against the exact lines they play, and find the best one to counter them with
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label htmlFor="scout-username" className="text-xs text-muted font-medium block mb-1">Their Chess.com username</label>
            <input
              id="scout-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scout()}
              placeholder="e.g. theirusername"
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50"
            />
          </div>
          <button onClick={scout} disabled={loading}
            className="btn-gold text-sm px-5 py-2 disabled:opacity-60">
            {loading ? 'Scouting…' : 'Scout'}
          </button>
        </div>

        {error && <div className="text-danger text-sm">{error}</div>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!result && !loading && !error && (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl mb-3 opacity-20">🎯</div>
            <div className="font-semibold text-white">No opponent scouted yet</div>
            <p className="text-sm mt-2">
              Enter a public Chess.com username — their last {GAMES_SCANNED} games get scanned for their most common openings and the best way to counter them
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="text-xs text-muted uppercase tracking-wide font-bold">
              {result.gameCount} games analyzed · {result.username}
            </div>

            {result.topOpenings.length === 0 && (
              <div className="text-center py-12 text-muted">
                <div className="font-semibold text-white">No identifiable openings</div>
                <p className="text-sm mt-2">None of their recent games had an opening we could name.</p>
              </div>
            )}

            {result.topOpenings.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Their {result.topOpenings.length === 1 ? 'most common opening' : `${result.topOpenings.length} most common openings`}</div>
                {result.topOpenings.map((spot, i) => (
                  <OpeningRow key={i} rank={i + 1} spot={spot} username={result.username} onPractice={practiceTrap} />
                ))}
              </div>
            )}

            {result.topOpenings.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">Best counter</div>
                {result.bestCounter ? (
                  <BestCounterCard rec={result.bestCounter} onPractice={practiceTrap} />
                ) : (
                  <p className="text-sm text-muted">Not enough repeated games in one opening yet to find a genuine weak spot.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OpeningRow({ rank, spot, username, onPractice }) {
  const practiceLine = spotToPracticeTrap(spot, username)
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-bg2 rounded-lg border border-border">
      <div className="min-w-0">
        <div className="font-bold text-white text-sm">{rank}. {spot.openingName}</div>
        <div className="text-xs text-muted mt-0.5">as {spot.opponentColor} · {spot.games} game{spot.games === 1 ? '' : 's'}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-sm text-muted font-medium">{spot.wins}W-{spot.losses}L-{spot.draws}D</div>
        {practiceLine && (
          <button onClick={() => onPractice(practiceLine)} className="btn-gold text-xs px-3 py-1.5 shrink-0">
            Practice
          </button>
        )}
      </div>
    </div>
  )
}

function BestCounterCard({ rec, onPractice }) {
  const { weakSpot, forColor } = rec
  const name = rec.kind === 'trap' ? rec.trap.name : rec.openingName

  return (
    <div className="p-4 bg-bg2 rounded-xl border border-border space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted uppercase tracking-wide font-bold">Play as {forColor}</div>
          <div className="font-bold text-white text-base mt-0.5">{name}</div>
        </div>
        {rec.kind === 'trap' && (
          <button onClick={() => onPractice(rec.trap)} className="btn-gold text-xs px-3 py-1.5 shrink-0">
            Practice this trap
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        Targets their weakest spot: {weakSpot.openingName} as {weakSpot.opponentColor}, {weakSpot.wins}W-{weakSpot.losses}L-{weakSpot.draws}D ({Math.round(weakSpot.lossRate * 100)}% loss rate).
      </p>
      {rec.kind === 'suggestion' && (
        <p className="text-xs text-muted italic">No matching trap in the library yet — steer into {weakSpot.openingName} and play it out.</p>
      )}
    </div>
  )
}

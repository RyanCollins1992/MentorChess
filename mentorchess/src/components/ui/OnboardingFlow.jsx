import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { progressManager } from '../../core/ProgressManager'

// Preference order for "which rating represents this player's overall
// skill" when seeding their starting ELO — Rapid first (the closest match
// to how most improvement content, including this app's own trap/puzzle
// library, is paced), falling back through faster time controls, then
// correspondence chess, for players who only play one format.
const RATING_PREFERENCE = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily']

function extractRating(stats) {
  for (const key of RATING_PREFERENCE) {
    const rating = stats?.[key]?.last?.rating
    if (typeof rating === 'number') return rating
  }
  return null
}

/**
 * First-run welcome flow — floated as an idea back when the KnightPath
 * Dashboard shipped (2026-07-15) and never built: new users landed straight
 * on Openings with zero introduction, and settings like starting ELO or a
 * Chess.com username were only discoverable by already knowing to open
 * Settings. Shown once, gated on settings.onboardingComplete, which is the
 * only thing this component itself owns — the ELO/username values it
 * collects go straight through the same store/manager methods Settings
 * itself uses (progressManager.recordElo, updateSettings), not a parallel
 * path.
 *
 * Username is asked before ELO (not after) specifically so a successful
 * Chess.com lookup (their real Rapid/Blitz/Bullet/Daily rating, whichever
 * exists first) can pre-fill the ELO step instead of asking the user to
 * recall/guess it — still editable before continuing, never silently
 * applied without being shown.
 */
export default function OnboardingFlow() {
  const { settings, updateSettings, navigate, showToast, refreshProgress } = useAppStore()
  const [step, setStep] = useState('welcome') // welcome | username | elo | done
  const [elo, setElo] = useState('')
  const [eloSource, setEloSource] = useState(null) // null | 'chesscom' | 'manual'
  const [username, setUsername] = useState('')
  const [looking, setLooking] = useState(false)

  if (settings.onboardingComplete) return null

  const finish = () => {
    updateSettings({ onboardingComplete: true })
    navigate('dashboard')
  }

  const submitUsername = async () => {
    const name = username.trim()
    if (!name) { setStep('elo'); return }
    updateSettings({ chesscomUsername: name })

    setLooking(true)
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${name.toLowerCase()}/stats`)
      if (res.ok) {
        const rating = extractRating(await res.json())
        if (rating != null) {
          setElo(String(rating))
          setEloSource('chesscom')
        }
      }
      // A 404 (username not found) or missing rating just falls through to
      // a blank, manual ELO step below — this step is best-effort, not a
      // hard requirement, so there's nothing to surface as an error here.
    } catch {
      // Network failure — same "fall through to manual" treatment.
    } finally {
      setLooking(false)
      setStep('elo')
    }
  }

  const submitElo = () => {
    const n = parseInt(elo)
    if (elo.trim() && (isNaN(n) || n < 100 || n > 3000)) {
      showToast('Enter a valid ELO (100–3000), or skip', 'error')
      return
    }
    if (!isNaN(n)) {
      progressManager.recordElo(n)
      refreshProgress()
    }
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="card w-full max-w-md space-y-5 text-center">
        {step === 'welcome' && (
          <>
            <img src="/mentorchess-icon.png" alt="MentorChess" className="w-16 h-16 rounded-xl object-cover mx-auto" />
            <div>
              <h2 className="text-xl font-extrabold font-heading">Welcome to MentorChess</h2>
              <p className="text-muted text-sm mt-2">
                Learn openings, drill tactics, and track your rating. Let's get you set up — takes about 10 seconds.
              </p>
            </div>
            <button onClick={() => setStep('username')} className="btn-gold w-full">Get started</button>
          </>
        )}

        {step === 'username' && (
          <>
            <div>
              <h2 className="text-xl font-extrabold font-heading">Connect Chess.com? (optional)</h2>
              <p className="text-muted text-sm mt-2">We'll pull your real rating to set your starting ELO, and you can import games or scout opponents later.</p>
            </div>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !looking && submitUsername()}
              placeholder="your username"
              autoFocus
              disabled={looking}
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-center outline-none focus:border-gold/50 disabled:opacity-60"
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('elo')} disabled={looking} className="btn-ghost flex-1 disabled:opacity-60">Skip</button>
              <button onClick={submitUsername} disabled={looking} className="btn-gold flex-1 disabled:opacity-60">
                {looking ? 'Looking you up…' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {step === 'elo' && (
          <>
            <div>
              <h2 className="text-xl font-extrabold font-heading">What's your current rating?</h2>
              <p className="text-muted text-sm mt-2">
                {eloSource === 'chesscom'
                  ? `We found your Chess.com rating — adjust it if you'd rather start elsewhere.`
                  : 'Used to calibrate difficulty and track your improvement over time.'}
              </p>
            </div>
            <input
              type="number"
              value={elo}
              onChange={e => { setElo(e.target.value); setEloSource('manual') }}
              onKeyDown={e => e.key === 'Enter' && submitElo()}
              placeholder="e.g. 850"
              min={100} max={3000}
              autoFocus
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-center text-lg outline-none focus:border-gold/50"
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('done')} className="btn-ghost flex-1">Skip</button>
              <button onClick={submitElo} className="btn-gold flex-1">Continue</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="text-5xl">🎉</div>
            <div>
              <h2 className="text-xl font-extrabold font-heading">You're all set!</h2>
              <p className="text-muted text-sm mt-2">Jump into your Dashboard, or explore Openings, Puzzles, and vs. Coach from the sidebar anytime.</p>
            </div>
            <button onClick={finish} className="btn-gold w-full">Start training</button>
          </>
        )}
      </div>
    </div>
  )
}

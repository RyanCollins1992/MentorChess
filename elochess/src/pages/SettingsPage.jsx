import { useState, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { PIECE_STYLES, DEFAULT_PIECE_STYLE_ID } from '../styles/pieceStyles'
import { getAnalyticsConsent, setAnalyticsConsent } from '../core/analytics'

export default function SettingsPage() {
  const { settings, updateSettings, showToast, refreshProgress } = useAppStore()
  const [elo, setElo] = useState(progressManager.currentElo)
  // Lets the choice made in ConsentBanner.jsx (or a fresh one) be changed
  // later — GDPR requires withdrawing consent to be as easy as giving it.
  const [analyticsConsent, setAnalyticsConsentState] = useState(getAnalyticsConsent)

  const save = (key, value) => {
    updateSettings({ [key]: value })
    showToast('Settings saved', 'success', 1500)
  }

  const handleEloSave = () => {
    const n = parseInt(elo)
    if (isNaN(n) || n < 100 || n > 3000) { showToast('Enter a valid ELO (100–3000)', 'error'); return }
    progressManager.recordElo(n)
    refreshProgress()
    showToast('ELO updated!', 'success')
  }

  const handleReset = () => {
    localStorage.clear()
    showToast('All data cleared — refreshing…', 'info')
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white font-heading">Settings</h2>
        <p className="text-muted text-sm mt-1">Customise your MentorChess experience</p>
      </div>

      {/* Profile */}
      <Section title="👤 Profile">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted block mb-1.5">Your ELO Rating</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={elo}
                onChange={e => setElo(e.target.value)}
                className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/50"
                placeholder="e.g. 850"
                min={100} max={3000}
              />
              <button onClick={handleEloSave} className="btn-gold text-sm px-4">Save</button>
            </div>
            <p className="text-xs text-muted mt-1">Used to calibrate difficulty and track improvement</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1.5">Chess.com Username</label>
            <input
              type="text"
              defaultValue={settings.chesscomUsername || ''}
              onBlur={e => save('chesscomUsername', e.target.value)}
              placeholder="your username"
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold/50"
            />
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="🌗 Appearance">
        <ToggleRow
          label="Dark mode"
          desc="Near-black surfaces with the logo's own gold accent"
          value={settings.darkMode === true}
          onChange={v => save('darkMode', v)}
        />
      </Section>

      {/* Piece Style */}
      <Section title="♞ Piece Style">
        <div className="grid grid-cols-2 gap-2">
          {PIECE_STYLES.map(style => {
            const active = (settings.pieceStyle || DEFAULT_PIECE_STYLE_ID) === style.id
            return (
              <button
                key={style.id}
                onClick={() => save('pieceStyle', style.id)}
                title={style.description}
                className={`text-left p-2.5 rounded-lg border transition-colors ${
                  active ? 'border-gold bg-gold/10' : 'border-border bg-bg3 hover:border-border/80'
                }`}
              >
                <div className={`text-xs font-bold ${active ? 'text-gold' : 'text-white'}`}>{style.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{style.description}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Board */}
      <Section title="♟ Board">
        <div className="space-y-3">
          <ToggleRow
            label="Show coordinates"
            desc="Display a–h and 1–8 labels on the board"
            value={settings.showCoords !== false}
            onChange={v => save('showCoords', v)}
          />
          <ToggleRow
            label="Animate moves"
            desc="Smooth piece movement animations"
            value={settings.animateMoves !== false}
            onChange={v => save('animateMoves', v)}
          />
          <ToggleRow
            label="Sound effects"
            desc="Play sounds on moves and captures"
            value={settings.sounds !== false}
            onChange={v => save('sounds', v)}
          />
        </div>
      </Section>

      {/* Study */}
      <Section title="📖 Study">
        <div className="space-y-3">
          <ToggleRow
            label="Auto-advance opponent moves"
            desc="Opponent moves play automatically in drill mode"
            value={settings.autoAdvance !== false}
            onChange={v => save('autoAdvance', v)}
          />
          <ToggleRow
            label="Show move hints"
            desc="Highlight legal squares when picking up a piece"
            value={settings.showHints !== false}
            onChange={v => save('showHints', v)}
          />
          <div>
            <label className="text-sm font-medium text-muted block mb-1.5">Daily review target</label>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map(n => (
                <button
                  key={n}
                  onClick={() => save('dailyTarget', n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    (settings.dailyTarget || 20) === n
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-border text-muted hover:text-white'
                  }`}
                >
                  {n}/day
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Stats — a bento grid (streak gets visual weight instead of every
          stat being treated equally). */}
      <Section title="📊 Your Stats">
        <div className="grid grid-cols-4 gap-2" style={{ gridAutoRows: '76px' }}>
          <BentoTile className="col-span-2 row-span-2" label="Day streak" value={progressManager.streak} sub="days" big />
          <BentoTile className="col-span-2" label="Total XP" value={progressManager.xpTotal} />
          <BentoTile label="Level" value={progressManager.level} />
          <BentoTile label="SRS cards" value={srsEngine.getStats().total} />
          <BentoTile label="Mastered" value={srsEngine.getStats().mastered} tone="sage" />
          <BentoTile label="Drills" value={progressManager.totalDrills} />
        </div>
      </Section>

      {/* Licenses & Credits */}
      <Section title="ℹ️ About & Licenses">
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-white mb-1">Chess Engine</div>
            <p className="text-muted">
              Includes <span className="text-white">Stockfish 18</span> (unmodified,{' '}
              <a href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">source</a>),
              licensed under the{' '}
              <a href="/stockfish/COPYING" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">GNU GPL v3</a>.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Chess Pieces</div>
            <p className="text-muted">
              The Fantasy and Skulls piece styles are the{' '}
              <a href="https://github.com/maurimo/chess-art" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">"Fantasy" and "Skulls" sets</a>{' '}
              by Maurizio Monge, licensed under the{' '}
              <a href="https://github.com/maurimo/chess-art/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">MIT License</a>.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Data Sources</div>
            <p className="text-muted">
              Game import uses the{' '}
              <a href="https://support.chess.com/en/articles/9650547-published-data-api" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Chess.com Published-Data API</a>{' '}
              and the{' '}
              <a href="https://lichess.org/api" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Lichess.org API</a>.
              MentorChess is not affiliated with, endorsed by, or sponsored by Chess.com or Lichess.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">AI Coach</div>
            <p className="text-muted">
              Powered by{' '}
              <a href="https://pollinations.ai" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Pollinations.ai</a>'s
              public text API (free tier). This is a third-party service and the feature may change if Pollinations updates their API access requirements.
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Open Source Libraries</div>
            <p className="text-muted">
              React, Vite, Tailwind CSS, chess.js, react-chessboard, Zustand, and Capacitor (all MIT licensed).
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Legal</div>
            <p className="text-muted">
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Privacy Policy</a>
              {' · '}
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Terms of Use</a>
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Feedback</div>
            <p className="text-muted">
              Got a suggestion or found a bug?{' '}
              <a href="mailto:MentorChessHelp@gmail.com?subject=MentorChess%20feedback" className="text-gold hover:underline">Send feedback</a>
            </p>
          </div>
          <div>
            <div className="font-medium text-white mb-1">Advertising &amp; Partnerships</div>
            <p className="text-muted">
              Interested in advertising or partnering with MentorChess?{' '}
              <a href="mailto:MentorChessHelp@gmail.com?subject=MentorChess%20advertising%20inquiry" className="text-gold hover:underline">Get in touch</a>
            </p>
          </div>
          <ToggleRow
            label="Analytics"
            desc="Google Analytics — visits and active users, no personal data. Off until you choose to enable it."
            value={analyticsConsent === 'accepted'}
            onChange={v => { setAnalyticsConsent(v); setAnalyticsConsentState(v ? 'accepted' : 'rejected') }}
          />
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="⚠️ Data" danger>
        <div className="space-y-3">
          <p className="text-sm text-muted">This will permanently delete all your progress, XP, badges, and SRS data.</p>
          <HoldButton onComplete={handleReset} className="px-4 py-2 rounded-lg text-sm font-bold border bg-bg3 text-danger border-danger/40 hover:border-danger">
            Hold to reset all progress
          </HoldButton>
        </div>
      </Section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────
function Section({ title, children, danger }) {
  return (
    <div className={`card space-y-4 ${danger ? 'border-danger/30' : ''}`}>
      <div className={`font-bold text-sm uppercase tracking-wide ${danger ? 'text-danger' : 'text-muted'}`}>
        {title}
      </div>
      {children}
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-gold' : 'bg-bg3 border border-border'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  )
}

// Irreversible actions ("Reset All Progress") require a 600ms press-and-hold
// with a filling ring instead of a tap-then-confirm dialog — fewer clicks,
// and physically harder to trigger by accident than a second tap.
function HoldButton({ onComplete, holdMs = 600, className = '', children }) {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef(null)

  const start = () => {
    setHolding(true)
    timerRef.current = setTimeout(() => {
      setHolding(false)
      onComplete()
    }, holdMs)
  }
  const cancel = () => {
    clearTimeout(timerRef.current)
    setHolding(false)
  }

  return (
    <button
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onContextMenu={e => e.preventDefault()}
      className={`relative overflow-hidden select-none transition-colors ${className}`}
    >
      <span
        className="absolute inset-0 bg-danger/40 origin-left pointer-events-none"
        style={{
          transform: `scaleX(${holding ? 1 : 0})`,
          transition: holding ? `transform ${holdMs}ms linear` : 'transform 100ms ease-out',
        }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}

function BentoTile({ label, value, sub, big, tone, className = '' }) {
  return (
    <div className={`bg-bg3 border border-border rounded-xl px-3 py-2.5 flex flex-col justify-between ${className}`}>
      <span className="text-[10px] font-mono uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-mono font-extrabold tabular-nums ${big ? 'text-3xl' : 'text-xl'} ${tone === 'sage' ? 'text-accent2' : 'text-white'}`}>
        {value}{sub && <span className="text-xs font-normal text-muted ml-1">{sub}</span>}
      </span>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { EvalBar } from '../components/ui/EvalBar'
import { Chess } from 'chess.js'
import { useAppStore } from '../store/useAppStore'
import { ReviewEngine } from '../core/ReviewEngine'
import {
  CLASSIFICATIONS,
  classifyMove,
  START_FEN,
  isMateScore,
  mateDistance,
  moveAccuracy,
  uciToSan,
  isGreatMove,
  isBrilliantMove,
  parsePgnToGame,
  parsePGN,
} from '../core/GameAnalysis'

// Each ReviewEngine is a fully independent Worker (single-threaded WASM), so a
// pool of them can evaluate different positions concurrently — evaluating a
// position never depends on any other position's result, only the later
// move-classification pass does. Capped at 4: beyond that, contention on a
// typical machine's cores stops paying off and just fights the UI thread.
const ENGINE_POOL_SIZE = Math.max(1, Math.min(4, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4))

// ── Main component ────────────────────────────────────────────────
export default function GameReviewPage() {
  const game    = useAppStore(s => s.reviewGame)
  const setGame = useAppStore(s => s.setReviewGame)
  const [moves, setMoves]         = useState([])  // parsed move objects
  const [currentIdx, setCurrentIdx] = useState(0)
  const [analysis, setAnalysis]   = useState([])  // per-move analysis
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [sfReady, setSfReady]     = useState(false)
  const [activeTab, setActiveTab] = useState('analysis')
  const engineRef = useRef(null)
  const showToast = useAppStore(s => s.showToast)
  // Deliberately not seeded from `game`: this page remounts fresh every time
  // it's navigated to (App.jsx's single-page switcher unmounts the previous
  // page), and reviewGame is often already set in the store by the time that
  // happens (e.g. ImportGamesPage sets it then navigates here). Seeding from
  // `game` would make the first render's `game !== prevGame` check false,
  // silently skipping the PGN parse forever.
  const [prevGame, setPrevGame] = useState(null)
  // Bumped every time the loaded game changes (including "Load New" back to
  // null) so an analyseGame() run started against the *previous* game can
  // tell it's been superseded and discard its results instead of writing a
  // stale/mismatched analysis array over the new game's moves — the actual
  // cause of "the eval bar doesn't change" / "stuck on loading": loading a
  // new game while a previous analysis was still running left `analyzing`
  // stuck true and, once it did resolve, applied the old game's eval numbers
  // to the new game's move list.
  const runIdRef = useRef(0)

  // Parse PGN into move list on load, adjusted during render rather than in
  // an effect (react-hooks/set-state-in-effect) since `game` is external store state.
  if (game !== prevGame) {
    setPrevGame(game)
    setAnalyzing(false)
    setProgress(0)
    if (game?.pgn) {
      setMoves(parsePGN(game.pgn))
      setCurrentIdx(0)
      setAnalysis([])
      setActiveTab('analysis')
    }
  }

  // Ref mutations can't happen during render (react-hooks/refs) — this
  // effect is the actual invalidation point for runIdRef/cancelQueued, kept
  // in sync with the render-time reset above via the same `game` dependency.
  useEffect(() => {
    runIdRef.current++
    engineRef.current?.forEach(e => e.cancelQueued())
  }, [game])

  // Init a pool of Stockfish workers
  useEffect(() => {
    const engines = Array.from({ length: ENGINE_POOL_SIZE }, () => new ReviewEngine())
    engineRef.current = engines
    Promise.all(engines.map(e => e.init())).then(results => {
      const ok = results.some(Boolean)
      setSfReady(ok)
      if (!ok) showToast('⚠️ Stockfish unavailable — analysis disabled', 'error', 5000)
    })
    return () => engines.forEach(e => e.terminate())
  }, [showToast])

  // Analyse all moves. Evaluation of each position is independent (only the
  // classification pass below needs them in order), so the expensive part —
  // asking Stockfish to evaluate every position — is spread across the whole
  // engine pool concurrently; classification then runs as a fast, synchronous
  // second pass over the already-computed results.
  const analyseGame = async () => {
    const engines = (engineRef.current || []).filter(e => e._ready)
    if (!sfReady || moves.length === 0 || engines.length === 0) return
    const myRunId = runIdRef.current
    setAnalyzing(true)
    setProgress(0)
    const DEPTH = 20

    const totalPositions = moves.length + 1
    const rawResults = new Array(totalPositions)
    let completed = 0
    let nextIndex = 0

    const runWorker = async (engine) => {
      while (nextIndex < totalPositions) {
        const i = nextIndex++
        const fen = i === 0 ? START_FEN : moves[i-1].fenAfter
        rawResults[i] = await engine.evaluate(fen, DEPTH)
        completed++
        // A newer game may have been loaded (and cancelQueued() called)
        // while this position was already in flight — don't let a stray
        // late completion move the progress bar for whatever game/run is
        // current now.
        if (runIdRef.current === myRunId) setProgress(Math.round((completed / totalPositions) * 100))
      }
    }
    await Promise.all(engines.map(runWorker))
    if (runIdRef.current !== myRunId) return // superseded — discard, don't touch state

    const results = []
    let prevEval = 0
    let prevRes  = null // full engine result for the position before the current move

    for (let i = 0; i <= moves.length; i++) {
      const res = rawResults[i]

      if (i > 0) {
        const move      = moves[i-1]
        const isWhite    = move.color === 'w'
        const evalNow    = res.eval
        const betterMove = prevRes?.bestMove || null
        const playedUci  = `${move.from}${move.to}${move.promotion}`
        const playedIsBest = betterMove === playedUci

        let classification = classifyMove(prevEval, evalNow, isWhite)

        // Book move (opening — first 10 plies). Only relabel moves that
        // graded GOOD or better: a blunder on move 4 is still a blunder,
        // and BOOK moves are excluded from the accuracy calculation.
        if (i <= 10 && ['BEST', 'EXCELLENT', 'GOOD'].includes(classification)) {
          classification = 'BOOK'
        }

        // Miss: had forced win last move but didn't play it
        if (Math.abs(prevEval) >= 500 && Math.abs(evalNow) < 200 && classification === 'BLUNDER') {
          classification = 'MISS'
        }

        // Brilliant/Great upgrades only apply to moves that were already the engine's top choice
        if (classification === 'BEST') {
          if (isBrilliantMove({ playedIsBest, fenAfter: move.fenAfter, toSquare: move.to, movedPiece: move.piece })) {
            classification = 'BRILLIANT'
          } else if (isGreatMove({ playedIsBest, eval1: prevRes?.eval, eval2: prevRes?.eval2 })) {
            classification = 'GREAT'
          }
        }

        results.push({
          move:        move.san,
          fen:         move.fenAfter,
          fenBefore:   i === 1 ? START_FEN : moves[i-2].fenAfter,
          classification,
          eval:        evalNow,
          evalBefore:  prevEval,
          bestMove:    res.bestMove,
          betterMove,
          color:       move.color,
          delta:       Math.round(isWhite ? evalNow - prevEval : prevEval - evalNow),
          moveNum:     move.moveNum,
        })

        prevEval = evalNow
        prevRes  = res
      } else {
        prevEval = res.eval
        prevRes  = res
      }
    }

    setAnalysis(results)
    setAnalyzing(false)
    setActiveTab('report')
    showToast('✅ Analysis complete!', 'success')
  }

  const currentFen  = currentIdx === 0
    ? START_FEN
    : moves[currentIdx - 1]?.fenAfter || START_FEN

  const currentAnalysis = analysis[currentIdx - 1] || null

  // Uses the same sage-green as the BEST/GREAT classification badges rather
  // than the theme's gold token — gold sits in the same warm brown/tan family
  // as the board squares (#F0D9B5/#B58863), so at any opacity it nearly
  // vanishes against the dark squares. The classification green is already
  // "best move" in this app's own visual language and reads clearly against
  // both square colors.
  const bestMoveArrow = currentAnalysis?.bestMove
    ? [{ startSquare: currentAnalysis.bestMove.slice(0, 2), endSquare: currentAnalysis.bestMove.slice(2, 4), color: `${CLASSIFICATIONS.BEST.color}CC` }]
    : []

  const betterSan = currentAnalysis && currentAnalysis.betterMove &&
    !['BEST', 'BRILLIANT', 'GREAT', 'BOOK'].includes(currentAnalysis.classification)
    ? uciToSan(currentAnalysis.fenBefore, currentAnalysis.betterMove)
    : null

  if (!game) return <ImportPanel onGameLoaded={g => setGame(g)} />

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 gap-2">
        {/* Eval bar */}
        <div className="w-full max-w-[min(calc(100vh_-_200px),86vw,940px)]">
          <EvalBar eval={currentAnalysis?.eval || 0} />
        </div>

        <div className="w-full max-w-[min(calc(100vh_-_200px),86vw,940px)]">
          <Chessboard
            position={currentFen}
            arePiecesDraggable={false}
            boardOrientation={game.color === 'Black' ? 'black' : 'white'}
            arrows={bestMoveArrow}
          />
        </div>

        {/* Nav controls */}
        <div className="flex items-center gap-2">
          <NavBtn onClick={() => setCurrentIdx(0)} disabled={currentIdx === 0} label="⏮" name="First move" />
          <NavBtn onClick={() => setCurrentIdx(i => Math.max(0, i-1))} disabled={currentIdx === 0} label="◀" name="Previous move" />
          <span className="text-sm text-muted px-3 min-w-20 text-center">
            {currentIdx === 0 ? 'Start' : `Move ${currentAnalysis?.moveNum || currentIdx}`}
          </span>
          <NavBtn onClick={() => setCurrentIdx(i => Math.min(moves.length, i+1))} disabled={currentIdx >= moves.length} label="▶" name="Next move" />
          <NavBtn onClick={() => setCurrentIdx(moves.length)} disabled={currentIdx >= moves.length} label="⏭" name="Last move" />
        </div>

        {/* Move classification badge */}
        {currentAnalysis && (
          <ClassificationBadge c={currentAnalysis.classification} eval={currentAnalysis.eval} delta={currentAnalysis.delta} betterSan={betterSan} />
        )}
      </div>

      {/* Right panel */}
      <div className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg2 flex flex-col overflow-hidden">
        {/* Game info */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-white truncate">vs {game.opponent} ({game.opponentRating})</div>
            <button
              onClick={() => { setGame(null); setMoves([]); setAnalysis([]) }}
              className="text-xs text-gold border border-gold/40 bg-gold/10 hover:bg-gold/20 px-2 py-0.5 rounded-lg shrink-0 transition-colors"
            >
              ← Load New
            </button>
          </div>
          <div className="text-xs text-muted mt-0.5">{game.timeControl} · {game.date} · {game.color}</div>
          <div className={`text-sm font-bold mt-1 ${
            game.result === 'Win' ? 'text-accent2' : game.result === 'Loss' ? 'text-danger' : 'text-muted'
          }`}>{game.result}</div>
        </div>

        {/* Analysis button */}
        {analysis.length === 0 && (
          <div className="p-4 border-b border-border shrink-0">
            {analyzing ? (
              <div className="space-y-2">
                <div className="text-sm text-muted" aria-live="polite">Analysing… {progress}%</div>
                <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-muted">Depth 20 · Stockfish 18 Lite × {ENGINE_POOL_SIZE}</div>
              </div>
            ) : (
              <button
                onClick={analyseGame}
                disabled={!sfReady || moves.length === 0}
                className="w-full btn-gold text-sm disabled:opacity-50"
              >
                {sfReady ? '🔍 Analyse Game' : '⏳ Loading…'}
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border px-3 pt-2.5 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`text-[11px] font-mono uppercase tracking-wider pb-2.5 border-b-2 transition-colors ${
                activeTab === t.id ? 'text-white border-gold' : 'text-muted border-transparent hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'report' && (
            analysis.length > 0
              ? <AnalysisSummary analysis={analysis} color={game.color} />
              : <TabPlaceholder text="Run analysis to see your report." />
          )}

          {activeTab === 'keyMoments' && (
            analysis.length > 0
              ? <KeyMoments analysis={analysis} onJump={setCurrentIdx} />
              : <TabPlaceholder text="Run analysis to see key moments." />
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-0.5">
              {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
                const wIdx = i * 2
                const bIdx = i * 2 + 1
                const wMove = moves[wIdx]
                const bMove = moves[bIdx]
                const wAn   = analysis[wIdx]
                const bAn   = analysis[bIdx]
                return (
                  <div key={i} className="flex items-center gap-1 text-xs font-mono">
                    <span className="text-muted w-6 text-right shrink-0">{i+1}.</span>
                    <MoveChip
                      move={wMove?.san} an={wAn}
                      active={currentIdx === wIdx + 1}
                      onClick={() => setCurrentIdx(wIdx + 1)}
                    />
                    <MoveChip
                      move={bMove?.san} an={bAn}
                      active={currentIdx === bIdx + 1}
                      onClick={() => setCurrentIdx(bIdx + 1)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Report / Key moments / Analysis — matches the Tempo design doc's
// "Tabs — game review" component (mono, uppercase, brass underline).
const TABS = [
  { id: 'report',     label: 'Report' },
  { id: 'keyMoments', label: 'Key moments' },
  { id: 'analysis',   label: 'Analysis' },
]

// ── Sub-components ────────────────────────────────────────────────

function NavBtn({ onClick, disabled, label, name }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={name}
      className="w-9 h-9 rounded-lg bg-bg3 border border-border text-white hover:bg-border transition-colors disabled:opacity-30 text-sm"
    >
      {label}
    </button>
  )
}

function MoveChip({ move, an, active, onClick }) {
  if (!move) return <div className="flex-1" />
  const cls = an ? CLASSIFICATIONS[an.classification] : null
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-1.5 py-0.5 rounded transition-colors ${
        active ? 'bg-gold/20 text-gold' : 'text-muted hover:bg-bg3'
      }`}
    >
      {move}
      {cls && <span className="ml-0.5 text-[10px]" style={{ color: cls.color }}>{cls.symbol}</span>}
    </button>
  )
}

function ClassificationBadge({ c, eval: ev, delta, betterSan }) {
  const cls = CLASSIFICATIONS[c]
  if (!cls) return null
  const evalDisplay = isMateScore(ev)
    ? `Mate in ${mateDistance(ev)}`
    : `${ev >= 0 ? '+' : ''}${(ev / 100).toFixed(2)}`

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border" style={{ borderColor: cls.color + '40', backgroundColor: cls.color + '15' }}>
      <span className="text-lg font-bold" style={{ color: cls.color }}>{cls.symbol}</span>
      <div>
        <div className="font-bold text-sm" style={{ color: cls.color }}>{cls.label}</div>
        <div className="text-xs text-muted">
          Eval: {evalDisplay}
          {delta != null && ` · ${delta >= 0 ? '+' : ''}${(delta / 100).toFixed(2)}`}
        </div>
        {betterSan && <div className="text-xs text-gold mt-0.5">Better: {betterSan}</div>}
      </div>
    </div>
  )
}

function AnalysisSummary({ analysis, color }) {
  const isWhite = color === 'White'
  const myMoves = analysis.filter(a => (a.color === 'w') === isWhite)
  const counts  = {}
  myMoves.forEach(m => { counts[m.classification] = (counts[m.classification] || 0) + 1 })

  const ORDER = ['BRILLIANT','GREAT','BEST','EXCELLENT','GOOD','BOOK','INACCURACY','MISTAKE','MISS','BLUNDER']

  // Accuracy score (0-100) — Lichess's win%-based per-move formula, averaged.
  // (Lichess additionally weights this average by positional volatility; that
  // extra layer is skipped here, but the core per-move formula is the real one.)
  const scored = myMoves.filter(m => m.classification !== 'BOOK')
  const accuracy = scored.length > 0
    ? Math.round(scored.reduce((acc, m) => acc + moveAccuracy(m.evalBefore, m.eval, m.color === 'w'), 0) / scored.length)
    : null

  return (
    <div>
      {accuracy != null && (
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-border">
          <span className="text-xs text-muted font-medium uppercase tracking-wide">Your accuracy</span>
          <span className={`text-lg font-extrabold font-mono tabular-nums ${accuracy >= 80 ? 'text-accent2' : accuracy >= 60 ? 'text-gold' : 'text-danger'}`}>
            {accuracy}%
          </span>
        </div>
      )}
      {/* Every tier is listed, best to worst, not just the ones this game
          hit — so the list doubles as a legend for the FL/SH/RL/... symbols
          shown on each move in the Analysis tab, not just a results tally.
          Tiers with a 0 count are dimmed rather than hidden, keeping the
          full scale visible as a reference. */}
      {ORDER.map(k => {
        const cls = CLASSIFICATIONS[k]
        return <QualityRow key={k} color={cls.color} symbol={cls.symbol} label={cls.label} count={counts[k] || 0} />
      })}
    </div>
  )
}

function QualityRow({ color, symbol, label, count }) {
  const achieved = count > 0
  return (
    <div className="flex items-center justify-between text-[13px] py-1.5 border-b border-border last:border-none" style={{ opacity: achieved ? 1 : 0.4 }}>
      <span className="flex items-center gap-2 text-muted">
        <span className="w-5 text-[10px] font-bold text-center shrink-0" style={{ color }}>{symbol}</span>
        {label}
      </span>
      <span className="text-white font-mono tabular-nums">{count}</span>
    </div>
  )
}

// Blunders, misses, and the standout moves worth revisiting — the
// classifications that mark a swing in the game, not routine good moves.
const KEY_MOMENT_TYPES = ['BRILLIANT', 'GREAT', 'BLUNDER', 'MISS', 'MISTAKE']

function KeyMoments({ analysis, onJump }) {
  const moments = analysis
    .map((a, i) => ({ ...a, idx: i + 1 }))
    .filter(a => KEY_MOMENT_TYPES.includes(a.classification))

  if (moments.length === 0) {
    return <TabPlaceholder text="No key moments — a clean, steady game." />
  }

  return (
    <div className="space-y-0.5">
      {moments.map(m => {
        const cls = CLASSIFICATIONS[m.classification]
        return (
          <button
            key={m.idx}
            onClick={() => onJump(m.idx)}
            className="w-full flex items-center gap-2 text-left px-1.5 py-1.5 rounded-lg hover:bg-bg3 transition-colors"
          >
            <span className="text-sm font-bold w-5 shrink-0 text-center" style={{ color: cls.color }}>{cls.symbol}</span>
            <span className="text-xs text-muted font-mono w-8 shrink-0">{m.moveNum}.</span>
            <span className="text-sm text-white font-mono flex-1 truncate">{m.move}</span>
            <span className="text-[10px] font-medium shrink-0" style={{ color: cls.color }}>{cls.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function TabPlaceholder({ text }) {
  return <div className="text-xs text-muted text-center py-6">{text}</div>
}

// ── Import panel (shown when no game is loaded) ───────────────────
//
// URL import (Lichess fetch + a Chess.com "doesn't allow direct URL import"
// help panel) was removed — Chess.com's Published-Data API has no way to
// look up a single game by URL/ID (only by username+month), so pasting a
// Chess.com link could never actually work, which was confusing next to the
// Lichess link that did. PGN paste covers every source (Chess.com, Lichess,
// or any database) uniformly, so it's the only import path now.

function ImportPanel({ onGameLoaded }) {
  return (
    <div className="flex items-start justify-center p-6 h-full overflow-y-auto">
      <div className="w-full max-w-lg space-y-5 pt-6">
        <div>
          <div className="text-4xl mb-3 opacity-20">♜</div>
          <h2 className="text-xl font-extrabold text-white font-heading">Load a Game</h2>
          <p className="text-sm text-muted mt-1">Paste a PGN to review</p>
        </div>
        <PgnImport onLoad={onGameLoaded} />
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">I played as:</span>
      {['White', 'Black'].map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
            value === c
              ? 'border-gold text-gold bg-gold/10'
              : 'border-border text-muted hover:text-white'
          }`}
        >
          {c === 'White' ? '♔' : '♚'} {c}
        </button>
      ))}
    </div>
  )
}

function PgnImport({ onLoad }) {
  const [pgn, setPgn]         = useState('')
  const [myColor, setMyColor] = useState('White')
  const [error, setError]     = useState('')
  const showToast = useAppStore(s => s.showToast)

  const handleLoad = () => {
    if (!pgn.trim()) { setError('Paste a PGN to continue'); return }
    try {
      const chess = new Chess()
      chess.loadPgn(pgn.trim())
      const game = parsePgnToGame(pgn.trim(), myColor)
      onLoad(game)
      showToast('✅ Game loaded', 'success')
    } catch {
      setError('Invalid PGN — check the format and try again')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Paste standard PGN from Chess.com, Lichess or any chess database</p>
      <textarea
        value={pgn}
        onChange={e => { setPgn(e.target.value); setError('') }}
        placeholder={'[White "Player"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
        rows={9}
        className="w-full bg-bg3 border border-border rounded-xl p-3 text-sm text-white font-mono placeholder-muted/40 outline-none focus:border-gold/50 resize-none"
      />
      <ColorPicker value={myColor} onChange={setMyColor} />
      {error && <div className="text-danger text-sm">{error}</div>}
      <button onClick={handleLoad} className="btn-gold w-full">Load Game →</button>
    </div>
  )
}



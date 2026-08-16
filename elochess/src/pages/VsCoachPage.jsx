import { useState, useEffect, useRef, useMemo } from 'react'
import { defaultArrowOptions } from 'react-chessboard'
import { Chessboard } from '../components/ui/Chessboard'
import MoveLedger from '../components/ui/MoveLedger'
import GameStatusBadge from '../components/ui/GameStatusBadge'
import ModeToggle from '../components/ui/ModeToggle'
import AnalysisPanel from '../components/ui/AnalysisPanel'
import PromotionPicker from '../components/ui/PromotionPicker'
import { useChessBoard } from '../hooks/useChessBoard'
import { useGameTimer } from '../hooks/useGameTimer'
import { useLiveEval } from '../hooks/useLiveEval'
import { useBookMove } from '../hooks/useBookMove'
import { usePendingPromotion } from '../hooks/usePendingPromotion'
import { useAppStore } from '../store/useAppStore'
import { aiCoach } from '../core/AICoach'
import { readThemeColor } from '../core/themeColor'
import { EASE_SETTLE } from '../styles/motion'

// The 3-tier arrow-color system react-chessboard's native drawing supports
// natively (color/secondaryColor/tertiaryColor picked by no-modifier/Shift/
// Ctrl held during a right-click-drag) — mapped onto green=plan/red=mistake/
// blue=idea. Red reuses the existing --color-danger token; green/blue are
// fixed literals since KnightPath's palette has no green/blue anywhere
// (board annotations are a different visual language from UI chrome, same
// as Lichess/Chess.com's own fixed annotation colors regardless of site
// theme). Spread onto the library's own defaultArrowOptions rather than
// replacing it outright — react-chessboard only falls back to its defaults
// when `arrowOptions` is entirely absent, so passing a colors-only object
// silently drops the numeric geometry fields (arrowWidthDenominator etc.)
// it also needs, producing NaN arrow paths (found live via Playwright).
const ARROW_COLORS = {
  color: '#2FA84F',
  tertiaryColor: '#1E7FD6',
}

// Bundled NNUE build served same-origin from public/stockfish/ (same engine
// GameReviewPage uses). A classic Worker cannot load a cross-origin script —
// the constructor throws synchronously — so a CDN URL here can never work.
const ENGINE_JS = 'stockfish/stockfish-18-lite-single.js'

const DIFFICULTIES = [
  { id:'beginner', label:'Beginner', depth:1,  elo:400,  desc:'Makes random blunders' },
  { id:'easy',     label:'Easy',     depth:3,  elo:700,  desc:'Occasional mistakes' },
  { id:'medium',   label:'Medium',   depth:6,  elo:1000, desc:'Plays solid chess' },
  { id:'hard',     label:'Hard',     depth:10, elo:1400, desc:'Strong tactical play' },
  { id:'expert',   label:'Expert',   depth:15, elo:1800, desc:'Near-perfect play' },
]

export default function VsCoachPage() {
  const [phase, setPhase]             = useState('setup')
  const [playerColor, setPlayerColor] = useState('w')
  const [difficulty, setDifficulty]   = useState(DIFFICULTIES[1])
  const [gameKey, setGameKey]         = useState(0)

  if (phase === 'setup') return <SetupScreen playerColor={playerColor} setPlayerColor={setPlayerColor} difficulty={difficulty} setDifficulty={setDifficulty} onStart={() => setPhase('game')} />
  return <GameScreen key={gameKey} playerColor={playerColor} difficulty={difficulty} onNewGame={() => { setGameKey(k=>k+1); setPhase('setup') }} />
}

function SetupScreen({ playerColor, setPlayerColor, difficulty, setDifficulty, onStart }) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6">
        <div className="text-center"><div className="text-4xl mb-2">🤖</div><h2 className="text-xl font-extrabold text-white font-heading">vs. Coach</h2><p className="text-muted text-sm mt-1">Play against the AI at your level</p></div>
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Play as</div>
          <div className="flex gap-2">
            {[{ v:'w', label:'♔ White', sub:'Move first' }, { v:'b', label:'♚ Black', sub:'Respond' }].map(o => (
              <button key={o.v} onClick={() => setPlayerColor(o.v)} className={`flex-1 p-3 rounded-xl border transition-all ${playerColor===o.v ? 'border-gold bg-gold/10 text-gold' : 'border-border bg-bg3 text-muted hover:text-white'}`}>
                <div className="font-bold text-lg">{o.label}</div><div className="text-xs mt-0.5">{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Difficulty</div>
          <div className="space-y-1.5">
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${difficulty.id===d.id ? 'border-gold bg-gold/10' : 'border-border bg-bg3 hover:border-border/80'}`}>
                <div className="text-left"><div className={`text-sm font-bold ${difficulty.id===d.id ? 'text-gold' : 'text-white'}`}>{d.label}</div><div className="text-xs text-muted">{d.desc}</div></div>
                <div className="text-xs text-muted">~{d.elo} ELO</div>
              </button>
            ))}
          </div>
        </div>
        <button onClick={onStart} className="w-full btn-gold text-base py-3">Start Game</button>
      </div>
    </div>
  )
}

function GameScreen({ playerColor, difficulty, onNewGame }) {
  const { fen, chessRef, move, tryMove } = useChessBoard()
  const promotion = usePendingPromotion(chessRef)
  const workerRef   = useRef(null)
  const isMountedRef = useRef(true)
  const [status, setStatus]   = useState('')
  const [thinking, setThinking] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [moveList, setMoveList] = useState([])
  const [tip, setTip]           = useState('')
  const [mode, setMode]         = useState('focus')
  const [lastMove, setLastMove] = useState(null)
  const showToast = useAppStore(s => s.showToast)
  const timer = useGameTimer(!gameOver)
  const { sfReady, evalResult, tactic, tacticArrows } = useLiveEval(fen, mode === 'analysis')
  const bookMove = useBookMove(fen, moveList, mode === 'analysis')
  const arrowOptions = useMemo(() => ({
    ...defaultArrowOptions,
    ...ARROW_COLORS,
    secondaryColor: readThemeColor('--color-danger', '#DC2626'),
  }), [])
  const boardArrows = useMemo(
    () => bookMove ? [...tacticArrows, bookMove] : tacticArrows,
    [tacticArrows, bookMove]
  )

  const getStatus = () => {
    const c = chessRef.current
    if (c.isCheckmate())  return `${c.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`
    if (c.isStalemate())  return 'Draw by stalemate'
    if (c.isDraw())       return 'Draw'
    if (c.inCheck())      return `${c.turn() === 'w' ? 'White' : 'Black'} is in check!`
    return c.turn() === 'w' ? "White's turn" : "Black's turn"
  }

  const getBestMove = (fen, depth) => {
    return new Promise(resolve => {
      if (!workerRef.current?.ready) { resolve(null); return }
      workerRef.current.resolver = resolve
      workerRef.current.worker.postMessage(`position fen ${fen}`)
      workerRef.current.worker.postMessage(`go depth ${depth}`)
    })
  }

  const makeAiMove = async () => {
    if (!isMountedRef.current || chessRef.current.isGameOver()) return
    setThinking(true)
    try {
      let mv = await getBestMove(chessRef.current.fen(), difficulty.depth)
      if (!isMountedRef.current) return
      if (!mv) {
        const legal = chessRef.current.moves({ verbose: true })
        if (legal.length === 0) return
        const pick = legal[Math.floor(Math.random() * legal.length)]
        mv = pick.from + pick.to
      }
      const result = move({ from: mv.slice(0,2), to: mv.slice(2,4), promotion: mv[4] || 'q' })
      if (result) {
        setLastMove({ from: result.from, to: result.to, captured: !!result.captured })
        setMoveList(chessRef.current.history())
        setStatus(getStatus())
        if (chessRef.current.isGameOver()) setGameOver(true)
      }
    } finally { if (isMountedRef.current) setThinking(false) }
  }

  // Init Stockfish
  useEffect(() => {
    // React StrictMode double-invokes this effect in dev (mount -> cleanup -> remount).
    // The cleanup below sets isMountedRef.current = false; without resetting it here,
    // the second (real) mount would stay permanently "unmounted" and makeAiMove would
    // no-op forever, freezing the AI in dev even though the component is live.
    isMountedRef.current = true
    let worker
    let handshakeTimer
    let handshakeDone = false
    try {
      worker = new Worker(new URL(ENGINE_JS, document.baseURI).href)
      let ready = false
      worker.onmessage = (e) => {
        const line = e.data
        if (line === 'uciok') {
          // Cap playing strength per difficulty tier; depth alone barely weakens
          // NNUE Stockfish. Note the engine clamps UCI_Elo to its supported
          // minimum (~1320), so the lowest tiers rely on depth 1-3 + this floor.
          worker.postMessage('setoption name UCI_LimitStrength value true')
          worker.postMessage(`setoption name UCI_Elo value ${difficulty.elo}`)
          worker.postMessage('isready')
          return
        }
        if (line === 'readyok') {
          handshakeDone = true
          clearTimeout(handshakeTimer)
          ready = true; workerRef.current = { worker, ready, resolver: null }
          if (playerColor === 'b') makeAiMove()
          return
        }
        if (line.startsWith('bestmove') && workerRef.current?.resolver) {
          const mv = line.split(' ')[1]
          workerRef.current.resolver(mv === '(none)' ? null : mv)
          workerRef.current.resolver = null
        }
      }
      worker.postMessage('uci')
      // If the UCI handshake never completes (worker fails to load, CDN blocked, etc.),
      // fall back to random moves rather than leaving the board frozen forever.
      handshakeTimer = setTimeout(() => {
        if (handshakeDone) return
        showToast('⚠️ Using random AI moves', 'info', 3000)
        if (playerColor === 'b') makeAiMove()
      }, 5000)
    } catch {
      showToast('⚠️ Using random AI moves', 'info', 3000)
      if (playerColor === 'b') makeAiMove()
    }
    return () => {
      isMountedRef.current = false
      clearTimeout(handshakeTimer)
      worker?.terminate()
    }
    // Deliberately run once per mount: playerColor/difficulty are fixed for the
    // life of a GameScreen (a new game remounts via the `key={gameKey}` in the
    // parent), so the mount-time makeAiMove/showToast closure is all this needs.
    // Re-running this on every render would tear down and recreate the worker
    // constantly (this shipped once and permanently froze the AI in dev).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (chessRef.current.turn() !== playerColor || thinking || gameOver) return false
    if (promotion.detect(from, to)) { promotion.request(from, to); return false }
    const result = tryMove(from, to)
    if (!result) return false
    setLastMove({ from, to, captured: !!result.captured })
    setMoveList(chessRef.current.history())
    setStatus(getStatus())
    if (chessRef.current.isGameOver()) { setGameOver(true); return true }
    setTimeout(() => makeAiMove(), 300)
    return true
  }

  const confirmPromotion = (piece) => {
    const { from, to } = promotion.pending
    promotion.cancel()
    const result = tryMove(from, to, piece)
    if (!result) return
    setLastMove({ from, to, captured: !!result.captured })
    setMoveList(chessRef.current.history())
    setStatus(getStatus())
    if (chessRef.current.isGameOver()) { setGameOver(true); return }
    setTimeout(() => makeAiMove(), 300)
  }

  const askTip = async () => {
    setTip('Thinking…')
    aiCoach.setContext({ elo: difficulty.elo, currentMoves: moveList.join(' ') })
    try {
      const reply = await aiCoach.send(`I'm playing as ${playerColor === 'w' ? 'White' : 'Black'}. FEN: ${chessRef.current.fen()}. Give me a quick tip for my next move in 2 sentences.`)
      setTip(reply)
    } catch { setTip('Coach unavailable right now.') }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full transition-[max-width] duration-300" style={{ maxWidth: mode === 'focus' ? 'min(calc(100vh - 190px),84vw,1080px)' : 'min(calc(100vh - 190px),72vw,900px)', transitionTimingFunction: `cubic-bezier(${EASE_SETTLE.join(',')})` }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-bg3 border border-border flex items-center justify-center text-sm">🤖</div>
            <div className="text-sm font-medium text-white">Coach · {difficulty.label}</div>
            {thinking && <div className="text-xs text-gold animate-pulse ml-auto">thinking…</div>}
          </div>
          <div className={`relative ${thinking ? 'opacity-90' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop}
              boardOrientation={playerColor === 'b' ? 'black' : 'white'}
              arePiecesDraggable={!gameOver && !thinking}
              lastMove={lastMove}
              arrows={boardArrows}
              allowDrawingArrows
              arrowOptions={arrowOptions}
              clearArrowsOnPositionChange
            />
            {promotion.pending && (
              <PromotionPicker color={promotion.pending.color} onSelect={confirmPromotion} onCancel={promotion.cancel} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-sm">♟</div>
            <div className="text-sm font-medium text-white">You · {playerColor === 'w' ? 'White' : 'Black'}</div>
          </div>
          <p className="text-[11px] text-muted text-center mt-2">
            Right-drag: <span style={{ color: '#2FA84F' }}>plan</span> · +Shift: <span className="text-danger">mistake</span> · +Ctrl: <span style={{ color: '#1E7FD6' }}>idea</span>
          </p>
        </div>
      </div>

      <div
        className="shrink-0 border-l border-border bg-bg2 flex flex-col p-4 gap-3 overflow-hidden transition-[width] duration-300"
        style={{ width: mode === 'analysis' ? 384 : 256, transitionTimingFunction: `cubic-bezier(${EASE_SETTLE.join(',')})` }}
      >
        <ModeToggle mode={mode} onChange={setMode} />
        <GameStatusBadge
          text={status || (fen.split(' ')[1] === 'w' ? "White's turn" : "Black's turn")}
          tone={gameOver ? 'over' : status.includes('is in check!') ? 'check' : 'default'}
        />
        <div className="text-xs text-muted font-mono tabular-nums shrink-0">
          <span key={timer.seconds} className="clock-tick">⏱</span> {timer.formatted}
        </div>
        {mode === 'analysis' && (
          <AnalysisPanel fen={fen} sanMoveList={moveList} sfReady={sfReady} evalResult={evalResult} tactic={tactic} />
        )}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="text-xs text-muted uppercase tracking-wide font-bold mb-2">Moves</div>
          <MoveLedger moveList={moveList} />
        </div>
        {tip && <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 text-xs text-muted leading-relaxed">💡 {tip}</div>}
        <div className="space-y-2 shrink-0">
          {!gameOver && <button onClick={askTip} className="w-full btn-ghost text-sm">💡 Ask Coach</button>}
          <button onClick={onNewGame} className="w-full btn-gold text-sm">{gameOver ? '🔄 New Game' : '↺ Resign'}</button>
        </div>
      </div>
    </div>
  )
}

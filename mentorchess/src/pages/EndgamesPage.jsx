import { useState, useRef, useEffect } from 'react'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'

// Bundled NNUE build served same-origin from public/stockfish/ (same engine
// VsCoachPage/GameReviewPage use — see VsCoachPage.jsx's comment for why a
// CDN URL can never work here: a classic Worker can't load a cross-origin
// script, the constructor throws synchronously).
const ENGINE_JS = 'stockfish/stockfish-18-lite-single.js'
const HINT_DEPTH = 14 // no strength limiting — a hint should be the real best move, not a weakened one

const SCENARIOS = [
  { id:'kqk', icon:'♛', name:'K+Q vs K', level:'Beginner', desc:'The most basic checkmate.', fen:'8/8/8/4k3/8/8/8/3QK3 w - - 0 1', variations:['8/8/8/4k3/8/8/8/3QK3 w - - 0 1','8/8/8/2k5/8/8/8/1QK5 w - - 0 1','8/8/8/6k1/8/8/8/5QK1 w - - 0 1'], playerColor:'w', task:'Checkmate the black king', par:10, maxMoves:20, lesson:'Drive the enemy king to the edge using your queen, then checkmate with king support. Key idea: use your king actively!', hints:['Drive the king to the edge first','Use queen to cut off escape squares','Bring your king closer','Avoid stalemate — leave the king one square'] },
  { id:'krk', icon:'♜', name:'K+R vs K', level:'Beginner', desc:'Rook and king checkmate.', fen:'8/8/8/4k3/8/8/8/3RK3 w - - 0 1', variations:['8/8/8/4k3/8/8/8/3RK3 w - - 0 1','8/8/8/2k5/8/8/8/1RK5 w - - 0 1','8/8/8/6k1/8/8/8/5RK1 w - - 0 1'], playerColor:'w', task:'Checkmate the black king', par:15, maxMoves:25, lesson:'Use the rook to cut off the king rank by rank. The king must support the rook to avoid stalemate.', hints:['Cut off the king with the rook','Use your king to push black king to the edge','Rook on the edge file delivers checkmate','Watch out for stalemate!'] },
  { id:'kpk', icon:'♟', name:'K+P vs K', level:'Beginner', desc:'Pawn promotion endgame.', fen:'8/8/2k5/8/2K5/2P5/8/8 w - - 0 1', variations:['8/8/2k5/8/2K5/2P5/8/8 w - - 0 1','8/8/4k3/8/4K3/4P3/8/8 w - - 0 1','8/8/6k1/8/6K1/6P1/8/8 w - - 0 1'], playerColor:'w', task:'Promote your pawn to a queen', par:10, maxMoves:20, lesson:'Your king must stay IN FRONT of the pawn. Use the opposition to push the black king aside and promote.', hints:['King must lead the pawn','Gain the opposition: Kc5 forces black aside','Never let black king blockade','Once clear, advance the pawn'] },
  { id:'opp', icon:'♔', name:'Opposition', level:'Intermediate', desc:'Master king opposition.', fen:'8/8/8/3k4/8/3K4/8/8 w - - 0 1', variations:['8/8/8/3k4/8/3K4/8/8 w - - 0 1','8/8/8/1k6/8/1K6/8/8 w - - 0 1','8/8/8/5k2/8/5K2/8/8 w - - 0 1'], playerColor:'w', task:'Gain the opposition and advance your king', par:8, maxMoves:15, lesson:'Opposition means kings face each other with one square between them. The player who does NOT have to move has the opposition.', hints:['Mirror the black king\'s moves','Gain opposition by placing kings face to face','Use opposition to push black king back','Advance your king once you have opposition'] },
  { id:'rook_cut', icon:'♖', name:'Rook Cutoff', level:'Intermediate', desc:'Use the rook to cut off the enemy king.', fen:'8/3P4/8/8/8/3k4/8/3K3R w - - 0 1', variations:['8/3P4/8/8/8/3k4/8/3K3R w - - 0 1','8/1P6/8/8/8/1k6/8/1K3R2 w - - 0 1','8/2P5/8/8/8/2k5/8/2K3R1 w - - 0 1'], playerColor:'w', task:'Promote the d7 pawn using your rook to cut off the black king', par:7, maxMoves:15, lesson:'A rook on the 3rd rank cuts the enemy king from reaching the pawn.', hints:['Rook to h3 cuts the black king','Push the pawn while king is cut off','Promote the pawn safely'] },
  { id:'lucena', icon:'♜', name:'Lucena Position', level:'Advanced', desc:'The most important rook endgame.', fen:'1K1k4/1P6/8/8/8/8/8/R3r3 w - - 0 1', variations:['1K1k4/1P6/8/8/8/8/8/R3r3 w - - 0 1','2K1k3/2P5/8/8/8/8/8/1R3r2 w - - 0 1','3K1k2/3P4/8/8/8/8/8/2R3r1 w - - 0 1'], playerColor:'w', task:'Win using the Lucena bridge-building technique', par:10, maxMoves:20, lesson:'Build a bridge! Use your rook to shield your king from checks, then promote.', hints:['Bring your rook to the 4th rank','Block enemy rook checks with your rook','March your king forward','Build the bridge: Ra4 shields the king'] },
  { id:'k2pk', icon:'♟', name:'Connected Passed Pawns', level:'Intermediate', desc:'Two pawns side by side overpower a lone king.', fen:'8/8/2k5/8/2PP4/2K5/8/8 w - - 0 1', variations:['8/8/2k5/8/2PP4/2K5/8/8 w - - 0 1','8/8/3k4/8/3PP3/3K4/8/8 w - - 0 1','8/8/5k2/8/5PP1/5K2/8/8 w - - 0 1'], playerColor:'w', task:'Promote a pawn and checkmate', par:15, maxMoves:25, lesson:'Connected passed pawns defend each other diagonally and can advance side by side — a lone king cannot stop both at once.', hints:['Advance the pawns together, not one at a time','Keep your king nearby to support them','One pawn can sacrifice itself to clear the way for the other','Once one queens, checkmate with king and queen'] },
  { id:'kbbk', icon:'♗', name:'K+2B vs K', level:'Intermediate', desc:'Checkmate with two bishops.', fen:'8/8/4k3/8/8/4K3/8/2B2B2 w - - 0 1', variations:['8/8/4k3/8/8/4K3/8/2B2B2 w - - 0 1','8/8/2k5/8/8/2K5/8/B2B4 w - - 0 1','8/8/6k1/8/8/6K1/8/4B2B w - - 0 1'], playerColor:'w', task:'Checkmate the black king', par:20, maxMoves:35, lesson:'Keep both bishops on connected diagonals to build a wall the king can\'t cross, then walk it toward any corner — unlike the bishop-and-knight mate, either corner color works.', hints:['Keep your bishops on adjacent diagonals, cutting off ranks or files together','Drive the king toward any edge, then any corner','Bring your king up to help finish it off','Watch for stalemate once the king is cornered'] },
  { id:'kbnk', icon:'♘', name:'K+B+N vs K', level:'Advanced', desc:'The trickiest of the basic checkmates — bishop and knight only.', fen:'8/8/3k4/8/8/3KB3/5N2/8 w - - 0 1', variations:['8/8/3k4/8/8/3KB3/5N2/8 w - - 0 1','8/8/1k6/8/8/1KB5/3N4/8 w - - 0 1','8/8/5k2/8/8/5KB1/7N/8 w - - 0 1'], playerColor:'w', task:"Checkmate the black king in the corner matching your bishop's square color", par:30, maxMoves:50, lesson:"This mate only works in the corner matching your bishop's color (here, a light-squared bishop means a8 or h1). Herd the king toward the wrong-colored corner first, then across to the right one.", hints:['Use the knight to cut off squares while the bishop controls a long diagonal','Push the king toward the corner matching your bishop\'s color','Bring your king in close — you can\'t mate without it','If the king reaches the wrong-colored corner, you\'ll need to shepherd it across the board'] },
]

export default function EndgamesPage() {
  const [selected, setSelected] = useState(null)
  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      <div className={`${selected ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-64 md:shrink-0 border-b md:border-b-0 md:border-r border-border bg-bg2 overflow-y-auto`}>
        <div className="p-4 border-b border-border shrink-0"><h2 className="font-bold text-white font-heading">Endgame Trainer</h2><p className="text-xs text-muted mt-1">Master the essential endings</p></div>
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => setSelected(s)} className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${selected?.id === s.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className={`text-sm font-semibold ${selected?.id === s.id ? 'text-gold' : 'text-white'}`}>{s.name}</div>
                <div className={`text-[10px] font-bold uppercase mt-0.5 ${s.level === 'Beginner' ? 'text-accent2' : s.level === 'Intermediate' ? 'text-gold' : 'text-danger'}`}>{s.level}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className={`${selected ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-hidden`}>
        {selected && (
          <button onClick={() => setSelected(null)} className="md:hidden shrink-0 flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-muted hover:text-white border-b border-border bg-bg2">
            ← Back to list
          </button>
        )}
        <div className="flex-1 overflow-hidden">
          {selected ? <EndgameBoard key={selected.id} scenario={selected} /> :
            <div className="flex items-center justify-center h-full"><div className="text-center"><div className="text-5xl mb-3 opacity-20">♔</div><div className="font-semibold text-white">Select an endgame</div></div></div>}
        </div>
      </div>
    </div>
  )
}

function EndgameBoard({ scenario }) {
  const variations = scenario.variations || [scenario.fen]
  const [variationIdx, setVariationIdx] = useState(0)
  const { fen, chessRef, tryMove, move, reset: resetBoard } = useChessBoard(variations[0])
  const movesRef = useRef(0)
  const [moves, setMoves]       = useState(0)
  const [complete, setComplete] = useState(false)
  const [flash, setFlash]       = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [hintIdx, setHintIdx]   = useState(0)
  const showToast       = useAppStore(s => s.showToast)
  const refreshProgress = useAppStore(s => s.refreshProgress)

  // Move-hint: a two-stage escalation on top of the existing strategic text
  // hints. Stage 1 glows the square of the engine's best move for the
  // *current* position (computed on demand, lazily — most hint clicks in a
  // session probably won't need this at all, so there's no reason to spin up
  // Stockfish until it's actually asked for). Stage 2 adds an arrow to the
  // destination. Capped at 2 — a third click just keeps cycling the existing
  // text hints, which already has its own cap.
  const workerRef    = useRef(null) // { worker, ready, resolver }
  const isMountedRef = useRef(true)
  const [hintStage, setHintStage]     = useState(0) // 0 none, 1 glow, 2 glow+arrow
  const [hintMove, setHintMove]       = useState(null) // { from, to } | null
  const [hintLoading, setHintLoading] = useState(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      workerRef.current?.worker.terminate()
    }
  }, [])

  // The best move for the position that's now behind us is meaningless — the
  // visual hint (not the text-hint index/cycling, which is still relevant
  // strategic guidance for the whole exercise) is cleared at every call site
  // below that actually changes the position, whichever side moved.
  const clearVisualHint = () => { setHintStage(0); setHintMove(null) }

  const ensureHintEngine = () => {
    if (workerRef.current) return Promise.resolve(workerRef.current.ready)
    return new Promise(resolve => {
      let worker
      let handshakeTimer
      try {
        worker = new Worker(new URL(ENGINE_JS, document.baseURI).href)
        worker.onmessage = (e) => {
          const line = e.data
          if (line === 'uciok') { worker.postMessage('isready'); return }
          if (line === 'readyok') {
            clearTimeout(handshakeTimer)
            if (isMountedRef.current) workerRef.current = { worker, ready: true, resolver: null }
            resolve(true)
            return
          }
          if (line.startsWith('bestmove') && workerRef.current?.resolver) {
            const mv = line.split(' ')[1]
            workerRef.current.resolver(mv === '(none)' ? null : mv)
            workerRef.current.resolver = null
          }
        }
        worker.postMessage('uci')
        handshakeTimer = setTimeout(() => resolve(false), 5000)
      } catch { resolve(false) }
    })
  }

  const getBestMove = (fenNow) => new Promise(resolve => {
    if (!workerRef.current?.ready) { resolve(null); return }
    workerRef.current.resolver = resolve
    workerRef.current.worker.postMessage(`position fen ${fenNow}`)
    workerRef.current.worker.postMessage(`go depth ${HINT_DEPTH}`)
  })

  const handleHint = async () => {
    setShowHint(true)
    setHintIdx(i => Math.min(i + 1, scenario.hints.length - 1))

    if (hintStage === 1 && hintMove) { setHintStage(2); return }
    if (hintStage >= 2) return

    setHintLoading(true)
    const ready = await ensureHintEngine()
    if (!isMountedRef.current) return
    if (!ready) {
      setHintLoading(false)
      showToast('⚠️ Hint engine unavailable — see the tip above instead', 'error')
      return
    }
    const mv = await getBestMove(chessRef.current.fen())
    if (!isMountedRef.current) return
    setHintLoading(false)
    if (mv) {
      setHintMove({ from: mv.slice(0, 2), to: mv.slice(2, 4) })
      setHintStage(1)
    }
  }

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (complete) return false
    if (!tryMove(from, to)) return false
    clearVisualHint()

    movesRef.current += 1
    const newMoves = movesRef.current
    setMoves(newMoves)

    if (chessRef.current.isCheckmate()) {
      setComplete(true); setFlash('correct')
      progressManager.awardXP('ENDGAME_COMPLETE')
      refreshProgress()
      showToast(newMoves <= scenario.par ? '🏆 Par or better!' : '✅ Endgame complete!', 'success')
    } else if (chessRef.current.isStalemate() || chessRef.current.isDraw()) {
      setFlash('wrong')
      showToast('⚠️ Stalemate! Reset and try again.', 'error')
      setTimeout(() => setFlash(null), 1000)
    } else if (newMoves >= scenario.maxMoves) {
      showToast('Too many moves — try restarting with a better plan', 'error')
    } else {
      setFlash('correct')
      setTimeout(() => setFlash(null), 400)
      setTimeout(() => {
        const legal = chessRef.current.moves({ verbose: true })
        if (legal.length > 0 && !chessRef.current.isGameOver()) {
          const pick = legal[Math.floor(Math.random() * legal.length)]
          move({ from: pick.from, to: pick.to, promotion: 'q' })
          movesRef.current += 1
          setMoves(m => m + 1)
          clearVisualHint()
        }
      }, 500)
    }
    return true
  }

  const reset = () => {
    resetBoard(variations[variationIdx])
    movesRef.current = 0
    setMoves(0); setComplete(false); setFlash(null); setHintIdx(0)
    clearVisualHint()
  }

  // Cycles to the next starting setup for this same technique (same pieces,
  // same relative geometry, shifted to a different part of the board) so
  // repeat practice isn't just memorizing one fixed move sequence.
  const newPosition = () => {
    const nextIdx = (variationIdx + 1) % variations.length
    setVariationIdx(nextIdx)
    resetBoard(variations[nextIdx])
    movesRef.current = 0
    setMoves(0); setComplete(false); setFlash(null); setHintIdx(0); setShowHint(false)
    clearVisualHint()
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full max-w-[min(calc(100vh_-_150px),90vw,1080px)]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : complete ? 'ring-2 ring-gold' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop}
              boardOrientation={scenario.playerColor === 'b' ? 'black' : 'white'}
              arePiecesDraggable={!complete}
              customSquareStyles={hintStage >= 1 && hintMove ? { [hintMove.from]: { animation: 'hint-glow 1.2s ease-in-out infinite' } } : undefined}
              arrows={hintStage >= 2 && hintMove ? [{ startSquare: hintMove.from, endSquare: hintMove.to, color: '#22c55e' }] : []} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Moves: <span className={moves > scenario.par ? 'text-danger' : 'text-white'}>{moves}</span></span>
            <span className="text-muted">Par: <span className="text-gold">{scenario.par}</span></span>
            <span className="text-muted">Max: {scenario.maxMoves}</span>
          </div>
        </div>
      </div>
      <div className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg2 flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="font-bold text-white text-lg">{scenario.name}</div><div className="text-sm text-muted mt-1">{scenario.task}</div></div>
        {complete ? <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 text-center"><div className="text-gold font-bold text-lg">🏆 Complete!</div><div className="text-muted text-sm mt-1">{moves <= scenario.par ? `Par! ${moves} moves` : `${moves} moves (par: ${scenario.par})`}</div></div> :
          <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-muted">🎯 {scenario.task}</div>}
        <div className="space-y-2">
          <button onClick={handleHint} disabled={hintLoading || complete} className="w-full btn-ghost text-sm disabled:opacity-50">
            {hintLoading ? '🤔 Thinking…' : hintStage >= 2 ? '💡 Hint' : hintStage === 1 ? '💡 Show the move' : '💡 Show the piece'}
            {hintIdx > 0 ? ` (${hintIdx}/${scenario.hints.length})` : ''}
          </button>
          {showHint && <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-muted">{scenario.hints[hintIdx] || scenario.hints[0]}</div>}
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Restart</button>
          {variations.length > 1 && (
            <button onClick={newPosition} className="w-full btn-ghost text-sm">🔀 New Position ({variationIdx + 1}/{variations.length})</button>
          )}
        </div>
        <div className="border-t border-border pt-3"><div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">💡 Key Concept</div><p className="text-sm text-muted leading-relaxed">{scenario.lesson}</p></div>
      </div>
    </div>
  )
}

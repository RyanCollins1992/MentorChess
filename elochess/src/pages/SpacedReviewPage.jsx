import { useState, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { progressManager } from '../core/ProgressManager'
import { getTrapById } from '../data/traps'
import { useAppStore } from '../store/useAppStore'

function buildSession() {
  return srsEngine.getDueCards().map(card => getTrapById(card.trapId)).filter(Boolean).slice(0, 20)
}

export default function SpacedReviewPage() {
  const [session]    = useState(() => buildSession())
  const [cardIndex, setCardIndex] = useState(0)
  const [phase, setPhase]         = useState('drill')
  const [results, setResults]     = useState([])
  const [mistakes, setMistakes]   = useState(0)
  const [key, setKey]             = useState(0)
  const refreshProgress = useAppStore(s => s.refreshProgress)

  if (session.length === 0) return <NothingDue />
  if (phase === 'done') return <SessionSummary results={results} total={session.length} onRestart={() => { setCardIndex(0); setPhase('drill'); setResults([]) }} />

  const trap = session[cardIndex]
  const handleRate = (quality) => {
    // Mistakes during the drill cap what gets recorded: fumbling the line shouldn't
    // earn the same SM-2 boost as a clean recall, whatever the self-rating says.
    // 2+ wrong attempts = true failure (quality 0, resets repetitions); exactly one
    // wrong attempt caps the rating at 2 (Good). The summary still shows the
    // self-rating, since that's what the user actually pressed.
    const recorded = mistakes >= 2 ? 0 : mistakes === 1 ? Math.min(quality, 2) : quality
    srsEngine.recordReview(trap.id, recorded)
    progressManager.awardXP('SRS_REVIEW')
    const next = [...results, { trap, quality }]
    setResults(next)
    refreshProgress()
    if (cardIndex + 1 >= session.length) setPhase('done')
    else { setCardIndex(i => i + 1); setPhase('drill'); setKey(k => k + 1) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-white">Card {cardIndex+1} of {session.length}</div>
          <div className="text-xs text-muted">{session.length - cardIndex - 1} remaining</div>
        </div>
        <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full transition-all" style={{ width:`${(cardIndex/session.length)*100}%` }} />
        </div>
      </div>
      {phase === 'drill'
        ? <DrillCard key={key} trap={trap} onComplete={(mistakeCount) => { setMistakes(mistakeCount); setPhase('rate') }} />
        : <RateCard trap={trap} onRate={handleRate} />}
    </div>
  )
}

function DrillCard({ trap, onComplete }) {
  // Array indices are always White's book moves at even positions regardless
  // of trap.color — for a black trap, the review only makes sense if it
  // drills BLACK's actual line, so the drill starts with White's first move
  // already played. Computed once via a lazy initializer, not an effect or
  // render-time ref mutation (both disallowed by this project's lint rules).
  const [primed] = useState(() => {
    if (trap.color !== 'black' || trap.moves.length === 0) return { fen: trap.fen, moveIdx: 0 }
    const c = new Chess(trap.fen)
    try {
      c.move(trap.moves[0])
      return { fen: c.fen(), moveIdx: 1 }
    } catch {
      return { fen: trap.fen, moveIdx: 0 }
    }
  })

  const { fen, tryMove, undo, move } = useChessBoard(primed.fen)
  const moveIdxRef = useRef(primed.moveIdx)
  const mistakesRef = useRef(0)
  const [moveIdx, setMoveIdx] = useState(primed.moveIdx)
  const [flash, setFlash]     = useState(null)

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    const expected = trap.moves[moveIdxRef.current]
    // Scripted underpromotions (e.g. Lasker Trap's "fxg1=N+") need the drag to
    // promote to that exact piece — tryMove defaults to queen otherwise.
    const expectedPromotion = expected?.match(/=([QRBN])/i)?.[1]?.toLowerCase() || 'q'
    const result = tryMove(from, to, expectedPromotion)
    if (!result) return false
    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(expected)) {
      setFlash('correct')
      const next = moveIdxRef.current + 1
      moveIdxRef.current = next
      setMoveIdx(next)
      if (next >= trap.moves.length) { setTimeout(() => onComplete(mistakesRef.current), 600) }
      else {
        setTimeout(() => {
          setFlash(null)
          if (move(trap.moves[next])) {
            const after = next + 1
            moveIdxRef.current = after
            setMoveIdx(after)
            // A drill can end on either side's move (a few traps end on the
            // opponent's reply, not the "hero" color's move) — check here too.
            if (after >= trap.moves.length) setTimeout(() => onComplete(mistakesRef.current), 600)
          }
        }, 500)
      }
    } else {
      undo(); setFlash('wrong'); mistakesRef.current += 1
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full max-w-[min(calc(100vh_-_130px),90vw,1080px)]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash==='correct'?'ring-2 ring-accent2':flash==='wrong'?'ring-2 ring-danger':''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop}
              boardOrientation={trap.color==='black'?'black':'white'} arePiecesDraggable />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {trap.moves.map((m,i) => (
              <span key={i} className={`text-xs font-mono px-1.5 py-0.5 rounded ${i<moveIdx?'text-accent2 bg-accent2/10':i===moveIdx?'text-gold bg-gold/10 font-bold':'text-muted'}`}>
                {i%2===0?`${Math.floor(i/2)+1}.`:''}{m}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="w-64 shrink-0 border-l border-border bg-bg2 p-4 flex flex-col gap-3">
        <div><div className="font-bold text-white">{trap.name}</div><div className="text-xs text-muted mt-0.5">{trap.opening}</div></div>
        <div className="text-xs text-muted uppercase tracking-wide font-bold">🎯 Play the moves from memory</div>
        <div className="text-sm text-muted">{trap.description}</div>
      </div>
    </div>
  )
}

function RateCard({ trap, onRate }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center space-y-6">
        <div><div className="text-4xl mb-3">✅</div><div className="font-bold text-white text-xl">{trap.name}</div><div className="text-muted text-sm mt-1">How well did you remember this?</div></div>
        <div className="grid grid-cols-3 gap-3">
          {[{label:'Hard',quality:1,color:'border-danger/40 hover:border-danger text-danger'},{label:'Good',quality:2,color:'border-accent/40 hover:border-accent text-accent'},{label:'Easy',quality:3,color:'border-accent2/40 hover:border-accent2 text-accent2'}].map(r => (
            <button key={r.quality} onClick={() => onRate(r.quality)} className={`p-4 rounded-xl border bg-bg3 transition-colors active:scale-95 ${r.color}`}>
              <div className="font-bold">{r.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function NothingDue() {
  const navigate = useAppStore(s => s.navigate)
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div><div className="text-xl font-bold text-white">All caught up!</div>
        <div className="text-muted text-sm">No cards due right now.</div>
        <button onClick={() => navigate('openings')} className="btn-gold">Study New Traps</button>
      </div>
    </div>
  )
}

function SessionSummary({ results, total, onRestart }) {
  const navigate = useAppStore(s => s.navigate)
  const easy = results.filter(r=>r.quality===3).length
  const good = results.filter(r=>r.quality===2).length
  const hard = results.filter(r=>r.quality===1).length
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6 text-center">
        <div><div className="text-5xl mb-3">🏆</div><div className="font-extrabold text-white text-2xl">Session Complete!</div><div className="text-muted text-sm mt-1">{total} cards · +{total*5} XP</div></div>
        <div className="grid grid-cols-3 gap-3">
          {[{label:'Easy',value:easy,color:'text-accent2'},{label:'Good',value:good,color:'text-accent'},{label:'Hard',value:hard,color:'text-danger'}].map(s=>(
            <div key={s.label} className="bg-bg3 rounded-xl p-3 border border-border"><div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div><div className="text-xs text-muted">{s.label}</div></div>
          ))}
        </div>
        <div className="flex gap-3"><button onClick={onRestart} className="flex-1 btn-ghost text-sm">Again</button><button onClick={()=>navigate('openings')} className="flex-1 btn-gold text-sm">Study More</button></div>
      </div>
    </div>
  )
}

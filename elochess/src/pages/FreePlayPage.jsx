import { useState, useMemo } from 'react'
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
import { readThemeColor } from '../core/themeColor'
import { EASE_SETTLE } from '../styles/motion'

// Same 3-tier arrow-color mapping as VsCoachPage.jsx (green=plan/red=mistake/
// blue=idea) — see that file's comment for why red is theme-sourced while
// green/blue are fixed literals.
const ARROW_COLORS = {
  color: '#2FA84F',
  tertiaryColor: '#1E7FD6',
}

export default function FreePlayPage() {
  const { fen, chessRef, tryMove, undo, reset } = useChessBoard()
  const [orientation, setOrientation] = useState('white')
  const [moveList, setMoveList]   = useState([])
  const [status, setStatus]       = useState('')
  const [gameOver, setGameOver]   = useState(false)
  const [customFen, setCustomFen] = useState('')
  const [fenError, setFenError]   = useState('')
  const [lastMove, setLastMove]   = useState(null)
  const [mode, setMode]           = useState('focus')
  const [gameKey, setGameKey]     = useState(0)
  const showToast = useAppStore(s => s.showToast)
  const timer = useGameTimer(!gameOver)
  const { sfReady, evalResult, tactic, tacticArrows } = useLiveEval(fen, mode === 'analysis')
  const bookMove = useBookMove(fen, moveList, mode === 'analysis')
  const promotion = usePendingPromotion(chessRef)
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
    if (c.isCheckmate())  return `${c.turn() === 'w' ? 'Black' : 'White'} wins by checkmate! 🎉`
    if (c.isStalemate())  return 'Draw by stalemate'
    if (c.isDraw())       return 'Draw'
    if (c.inCheck())      return `${c.turn() === 'w' ? 'White' : 'Black'} is in check!`
    return c.turn() === 'w' ? 'White to move' : 'Black to move'
  }

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (gameOver) return false
    if (promotion.detect(from, to)) { promotion.request(from, to); return false }
    const result = tryMove(from, to)
    if (!result) return false
    setMoveList(chessRef.current.history())
    setLastMove({ from, to, captured: !!result.captured })
    setStatus(getStatus())
    if (chessRef.current.isGameOver()) setGameOver(true)
    return true
  }

  const confirmPromotion = (piece) => {
    const { from, to } = promotion.pending
    promotion.cancel()
    const result = tryMove(from, to, piece)
    if (!result) return
    setMoveList(chessRef.current.history())
    setLastMove({ from, to, captured: !!result.captured })
    setStatus(getStatus())
    if (chessRef.current.isGameOver()) setGameOver(true)
  }

  const handleUndo = () => {
    undo()
    setMoveList(chessRef.current.history())
    setGameOver(false)
    setStatus(getStatus())
    setLastMove(null)
  }

  const handleReset = () => {
    reset()
    setMoveList([]); setGameOver(false); setStatus(''); setLastMove(null); setCustomFen('')
    timer.reset(); setGameKey(k => k + 1)
  }

  const handleLoadFen = () => {
    try {
      reset(customFen.trim())
      setMoveList([]); setGameOver(false); setStatus(getStatus()); setFenError(''); setLastMove(null)
      timer.reset(); setGameKey(k => k + 1)
    } catch { setFenError('Invalid FEN string') }
  }

  const copyFen = () => { navigator.clipboard.writeText(chessRef.current.fen()); showToast('FEN copied!', 'success', 1500) }

  const isCheck = status.includes('is in check!')

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full transition-[max-width] duration-300" style={{ maxWidth: mode === 'focus' ? 'min(calc(100vh - 190px),84vw,1080px)' : 'min(calc(100vh - 190px),72vw,900px)', transitionTimingFunction: `cubic-bezier(${EASE_SETTLE.join(',')})` }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-bg3 border border-border flex items-center justify-center text-sm">{orientation === 'white' ? '♚' : '♔'}</div>
            <div className="text-sm text-muted">{orientation === 'white' ? 'Black' : 'White'}</div>
          </div>
          <div className="relative">
            <Chessboard position={fen} onPieceDrop={handleDrop} boardOrientation={orientation}
              arePiecesDraggable={!gameOver}
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
            <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-sm">{orientation === 'white' ? '♔' : '♚'}</div>
            <div className="text-sm text-muted">{orientation === 'white' ? 'White' : 'Black'}</div>
            <div className="ml-auto text-xs text-muted">Move {Math.ceil(moveList.length / 2)}</div>
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
          text={status || 'White to move'}
          tone={gameOver ? 'over' : isCheck ? 'check' : 'default'}
        />
        <div className="text-xs text-muted font-mono tabular-nums shrink-0">
          <span key={timer.seconds} className="clock-tick">⏱</span> {timer.formatted}
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button onClick={handleUndo} disabled={moveList.length === 0} className="btn-ghost text-sm disabled:opacity-40">← Undo</button>
          <button onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')} className="btn-ghost text-sm">⇅ Flip</button>
          <button onClick={handleReset} className="btn-ghost text-sm col-span-2">↺ New Game</button>
        </div>

        {mode === 'analysis' && (
          <AnalysisPanel key={gameKey} fen={fen} sanMoveList={moveList} sfReady={sfReady} evalResult={evalResult} tactic={tactic} />
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="text-xs text-muted uppercase tracking-wide font-bold mb-2">Moves</div>
          <MoveLedger moveList={moveList} />
        </div>

        {mode === 'analysis' && (
          <div className="shrink-0 border-t border-border pt-3 space-y-2">
            <div className="text-xs text-muted uppercase tracking-wide font-bold">Load Position (FEN)</div>
            <textarea value={customFen} onChange={e => { setCustomFen(e.target.value); setFenError('') }}
              placeholder="Paste FEN string…" rows={2}
              className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-xs text-white placeholder-muted outline-none focus:border-gold/50 resize-none font-mono" />
            {fenError && <div className="text-xs text-danger">{fenError}</div>}
            <div className="flex gap-2">
              <button onClick={handleLoadFen} disabled={!customFen.trim()} className="flex-1 btn-ghost text-xs py-1.5 disabled:opacity-40">Load</button>
              <button onClick={copyFen} className="flex-1 btn-ghost text-xs py-1.5">Copy FEN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

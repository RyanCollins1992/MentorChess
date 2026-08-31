import { useState, useMemo, useEffect } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from '../components/ui/Chessboard'
import { useChessBoard } from '../hooks/useChessBoard'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'
import { PUZZLES } from '../data/puzzles'

const THEMES = ['All', 'Fork', 'Checkmate', 'Tactics', 'Pin', 'Discovery', 'Sacrifice', 'Endgame']
const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Real per-day puzzle-solve counts for the last 7 days (today included),
// from ProgressManager's own xpHistory log — not fabricated placeholder
// data, matching this app's established rule (see DashboardPage/ProgressPage)
// of substituting real tracked numbers for any reference-design widget that
// assumed data this app doesn't collect.
function dailyPuzzleActivity(xpHistory) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ key: d.toDateString(), dow: d.getDay(), count: 0 })
  }
  const byKey = Object.fromEntries(days.map(d => [d.key, d]))
  for (const entry of xpHistory) {
    if (entry.action !== 'PUZZLE_CORRECT' && entry.action !== 'PUZZLE_STREAK_5') continue
    const key = new Date(entry.date).toDateString()
    if (byKey[key]) byKey[key].count++
  }
  return days
}

export default function PuzzlesPage() {
  // Restores whichever puzzle was open on the last visit — a refresh
  // (or navigating away and back) shouldn't drop you back on the
  // "Select a puzzle" placeholder.
  const [selectedPuzzle, setSelectedPuzzle] = useState(() => {
    const savedId = localStorage.getItem('mentorchess-selected-puzzle')
    return savedId ? PUZZLES.find(p => p.id === savedId) || null : null
  })
  useEffect(() => {
    if (selectedPuzzle) localStorage.setItem('mentorchess-selected-puzzle', selectedPuzzle.id)
    else localStorage.removeItem('mentorchess-selected-puzzle')
  }, [selectedPuzzle])
  const [theme, setTheme]         = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const solved = useAppStore(s => s.solvedPuzzles)
  const markPuzzleSolved = useAppStore(s => s.markPuzzleSolved)
  const resetSolvedPuzzles = useAppStore(s => s.resetSolvedPuzzles)
  const [streak, setStreak]       = useState(0)
  const showToast     = useAppStore(s => s.showToast)
  const refreshProgress = useAppStore(s => s.refreshProgress)
  const filtered = useMemo(() => PUZZLES.filter(p => (theme === 'All' || p.theme === theme) && (difficulty === 'All' || p.difficulty === difficulty)), [theme, difficulty])
  // Real per-day puzzle-solve counts from ProgressManager's own xpHistory
  // log, not fabricated placeholder bars. `progressManager.xpHistory` isn't
  // itself reactive, so `solved` (which changes on every handleSolved) is
  // listed as a deliberate recompute trigger rather than a real dependency
  // of the function body — same "external store, not React state" shape as
  // DashboardPage.jsx's eloHistory read.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyActivity = useMemo(() => dailyPuzzleActivity(progressManager.xpHistory), [solved])

  const pickRandomPuzzle = (excludeIds) => {
    const pool = PUZZLES.filter(p => !excludeIds.includes(p.id))
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const handleSolved = (id) => {
    markPuzzleSolved(id)
    const ns = streak + 1; setStreak(ns)
    progressManager.awardXP('PUZZLE_CORRECT')
    if (ns % 5 === 0) progressManager.awardXP('PUZZLE_STREAK_5')
    refreshProgress()
    showToast(ns % 5 === 0 ? `🔥 ${ns} streak! +25 XP` : '✅ Puzzle solved! +15 XP', 'success')
  }

  // Advances only when the user clicks "Next Puzzle" — solving no longer
  // auto-advances the board, which used to yank the next puzzle in before
  // there was time to look at the solved position.
  const handleNext = () => {
    if (solved.length >= PUZZLES.length) {
      resetSolvedPuzzles()
      showToast('🎉 All puzzles completed! Reshuffling...', 'success')
      setSelectedPuzzle(pickRandomPuzzle([]))
    } else {
      setSelectedPuzzle(pickRandomPuzzle(solved))
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      <div className="w-full md:w-64 md:shrink-0 max-h-[45vh] md:max-h-none border-b md:border-b-0 md:border-r border-border bg-bg2 flex flex-col">
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none">
            {THEMES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Themes' : t}</option>)}
          </select>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full bg-bg3 border border-border rounded-lg px-2 py-1.5 text-sm text-white outline-none">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d === 'All' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <div className="text-xs text-muted">{solved.length}/{PUZZLES.length} solved · Streak: {streak}</div>
          <ActivityHeatmap days={dailyActivity} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelectedPuzzle(p)} className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-bg3 transition-colors ${selectedPuzzle?.id === p.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div><div className={`text-sm font-semibold ${selectedPuzzle?.id === p.id ? 'text-gold' : 'text-white'}`}>{p.title}</div><div className="text-xs text-muted mt-0.5">{p.theme}</div></div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold uppercase ${p.difficulty === 'beginner' ? 'text-accent2' : p.difficulty === 'intermediate' ? 'text-gold' : 'text-danger'}`}>{p.difficulty}</span>
                  {solved.includes(p.id) && <span className="text-accent2 text-xs">✓</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedPuzzle
          ? <PuzzleBoard key={selectedPuzzle.id} puzzle={selectedPuzzle} isSolved={solved.includes(selectedPuzzle.id)} onSolved={() => handleSolved(selectedPuzzle.id)} onNext={handleNext} />
          : <div className="flex items-center justify-center h-full"><div className="text-center"><div className="text-5xl mb-3 opacity-20">🧩</div><div className="font-semibold text-white">Select a puzzle</div></div></div>}
      </div>
    </div>
  )
}

// 7-day activity strip — bar height/opacity scales with that day's real
// solve count (capped visually at 3+ so one big day doesn't flatten the
// rest of the week to invisible).
function ActivityHeatmap({ days }) {
  const max = Math.max(1, ...days.map(d => d.count))
  return (
    <div className="pt-1">
      <div className="flex gap-1 items-end" style={{ height: 24 }}>
        {days.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gold transition-all"
            style={{
              height: d.count === 0 ? 4 : `${Math.max(30, (d.count / max) * 100)}%`,
              opacity: d.count === 0 ? 0.15 : 0.4 + 0.2 * Math.min(3, d.count),
            }}
            title={`${d.count} puzzle${d.count === 1 ? '' : 's'} solved`}
          />
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {days.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-muted">{DAY_LABELS[d.dow]}</span>
        ))}
      </div>
    </div>
  )
}

function PuzzleBoard({ puzzle, isSolved, onSolved, onNext }) {
  const { fen, tryMove, undo, reset: resetBoard } = useChessBoard(puzzle.fen)
  const [solved, setSolved] = useState(isSolved)
  const [failed, setFailed] = useState(false)
  const [flash, setFlash]   = useState(null)
  const [showHint, setShowHint] = useState(false)
  const showToast = useAppStore(s => s.showToast)

  // Parsed from puzzle.solution[0] against a scratch Chess instance (same
  // approach as MatePatternsPage's hint) so Show Hint can glow the source
  // square of the piece to move, not just show the hint text.
  const hintMove = useMemo(() => {
    if (!puzzle.solution?.length) return null
    try {
      const mv = new Chess(puzzle.fen).move(puzzle.solution[0])
      return mv ? { from: mv.from, to: mv.to } : null
    } catch { return null }
  }, [puzzle])

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (solved) return false
    const result = tryMove(from, to)
    if (!result) return false
    const normalize = s => s.replace(/[+#!?]/g, '')
    if (normalize(result.san) === normalize(puzzle.solution[0])) {
      setFlash('correct'); setSolved(true); onSolved()
      showToast('✅ Solved! +15 XP', 'success')
    } else {
      undo()
      setFlash('wrong'); setFailed(true)
      showToast('Not the right move — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => {
    resetBoard(puzzle.fen)
    setFlash(null)
    setSolved(false)
    setFailed(false)
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full max-w-[min(calc(100vh_-_130px),90vw,1080px)]">
          <div className={`rounded-xl overflow-hidden transition-all duration-200 ${flash === 'correct' || solved ? 'ring-2 ring-accent2' : flash === 'wrong' ? 'ring-2 ring-danger' : ''}`}>
            <Chessboard position={fen} onPieceDrop={handleDrop} arePiecesDraggable={!solved}
              customSquareStyles={showHint && !solved && hintMove ? { [hintMove.from]: { animation: 'hint-glow 1.2s ease-in-out infinite' } } : undefined} />
          </div>
        </div>
      </div>
      <div className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg2 flex flex-col p-4 gap-4 overflow-y-auto">
        <div><div className="font-bold text-white text-lg">{puzzle.title}</div><div className="text-xs text-muted">{puzzle.theme}</div></div>
        {solved
          ? <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-4 text-center space-y-3">
              <div><div className="text-accent2 font-bold text-lg">✅ Solved!</div>{!failed && <div className="text-xs text-muted mt-1">First try!</div>}</div>
              <button onClick={onNext} className="w-full btn-gold text-sm">Next Puzzle →</button>
            </div>
          : <div className="bg-bg3 border border-border rounded-xl p-3 text-sm text-muted">🎯 Find the best move for {fen.split(' ')[1] === 'w' ? 'White' : 'Black'}</div>}
        <div className="space-y-2">
          <button onClick={() => setShowHint(!showHint)} className="w-full btn-ghost text-sm">💡 {showHint ? 'Hide' : 'Show'} Hint</button>
          {showHint && <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-sm text-muted">{puzzle.hint}</div>}
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Reset</button>
        </div>
      </div>
    </div>
  )
}

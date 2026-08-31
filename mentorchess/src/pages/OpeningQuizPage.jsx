import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from '../components/ui/Chessboard'
import { TRAPS } from '../data/traps'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'
import { useGameTimer } from '../hooks/useGameTimer'

// trap.fen is the drill's *starting* position (usually the initial position) —
// the recognizable position for a "what opening/trap is this?" quiz is the one
// reached after playing out trap.moves, not the position it starts from.
function finalPositionFen(trap) {
  const chess = new Chess(trap.fen)
  for (const move of trap.moves) {
    try { chess.move(move, { sloppy: true }) } catch { break }
  }
  return chess.fen()
}

function buildQuiz(count = 10) {
  const shuffled = [...TRAPS].sort(() => Math.random() - 0.5).slice(0, count)
  return shuffled.map(trap => {
    // Pick 3 random wrong answers from other traps
    const others = TRAPS.filter(t => t.id !== trap.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(t => t.name)
    const options = [...others, trap.name].sort(() => Math.random() - 0.5)
    return { trap, options, correct: trap.name, fen: finalPositionFen(trap) }
  })
}

export default function OpeningQuizPage() {
  const [phase, setPhase]     = useState('setup')
  const [quizSize, setQuizSize] = useState(10)
  const [quiz, setQuiz]       = useState([])
  const [index, setIndex]     = useState(0)
  const [score, setScore]     = useState(0)
  const [answers, setAnswers] = useState([]) // { correct, chosen }
  const [selected, setSelected] = useState(null) // chosen answer
  const [revealed, setRevealed] = useState(false)
  // Per-question elapsed timer — stops the moment an answer is revealed
  // (matching the reference design's per-question "0:42" timer), reset
  // explicitly whenever a new question starts rather than auto-resetting
  // on every render.
  const questionTimer = useGameTimer(phase === 'quiz' && !revealed)

  const startQuiz = () => {
    setQuiz(buildQuiz(quizSize))
    setIndex(0)
    setScore(0)
    setAnswers([])
    setSelected(null)
    setRevealed(false)
    setPhase('quiz')
    questionTimer.reset()
  }

  const handleAnswer = (option) => {
    if (revealed) return
    setSelected(option)
    setRevealed(true)
    const isCorrect = option === quiz[index].correct
    if (isCorrect) setScore(s => s + 1)
  }

  const handleNext = () => {
    setAnswers(prev => [...prev, { correct: quiz[index].correct, chosen: selected }])
    if (index + 1 >= quiz.length) {
      // Award XP
      progressManager.awardXP('PUZZLE_CORRECT', Math.ceil(score / 3))
      useAppStore.getState().refreshProgress()
      setPhase('results')
    } else {
      setIndex(i => i + 1)
      setSelected(null)
      setRevealed(false)
      questionTimer.reset()
    }
  }

  if (phase === 'setup') return (
    <SetupScreen quizSize={quizSize} setQuizSize={setQuizSize} onStart={startQuiz} />
  )

  if (phase === 'results') return (
    <ResultsScreen score={score} total={quiz.length} answers={answers} quiz={quiz} onRestart={() => setPhase('setup')} onRetry={startQuiz} />
  )

  const q = quiz[index]

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      {/* Board */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full max-w-[min(calc(100vh_-_170px),86vw,960px)]">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-muted shrink-0">{index + 1}/{quiz.length}</span>
            <div className="flex-1 h-1.5 bg-bg3 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all duration-500"
                   style={{ width: `${((index) / quiz.length) * 100}%` }} />
            </div>
            <span className="text-xs text-muted font-mono tabular-nums shrink-0">⏱ {questionTimer.formatted}</span>
            <span className="text-sm font-bold text-gold shrink-0">{score} ✓</span>
          </div>

          <div className="rounded-xl overflow-hidden">
            <Chessboard
              position={q.fen}
              arePiecesDraggable={false}
              boardOrientation={q.trap.color === 'black' ? 'black' : 'white'}
            />
          </div>

          <div className="mt-3 text-center text-sm text-muted">
            Playing as <span className="text-white font-medium">{q.trap.color === 'black' ? 'Black' : 'White'}</span>
            {' · '}{q.trap.opening}
          </div>
        </div>
      </div>

      {/* Right — question + options */}
      <div className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg2 flex flex-col p-4 gap-4">
        <div>
          <div className="text-xs text-muted uppercase tracking-wide font-bold mb-1">Question {index + 1}</div>
          <div className="font-bold text-white text-base">What opening/trap is this?</div>
        </div>

        {/* Options */}
        <div className="space-y-2 flex-1">
          {q.options.map(option => {
            let style = 'border-border bg-bg3 text-white hover:border-gold/50'
            if (revealed) {
              if (option === q.correct) style = 'border-accent2 bg-accent2/15 text-accent2'
              else if (option === selected) style = 'border-danger bg-danger/15 text-danger'
              else style = 'border-border bg-bg3 text-muted opacity-60'
            }
            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={revealed}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${style}`}
              >
                {option}
              </button>
            )
          })}
        </div>

        {/* Explanation after reveal */}
        {revealed && (
          <div className={`rounded-xl p-3 text-sm ${
            selected === q.correct
              ? 'bg-accent2/10 border border-accent2/30 text-accent2'
              : 'bg-danger/10 border border-danger/30 text-danger'
          }`}>
            {selected === q.correct
              ? `✅ Correct! ${q.trap.description}`
              : `❌ It was ${q.correct}. ${q.trap.description}`
            }
          </div>
        )}

        <button
          onClick={revealed ? handleNext : undefined}
          disabled={!revealed}
          className="w-full btn-gold text-sm disabled:opacity-40"
        >
          {index + 1 >= quiz.length ? 'See Results →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ── Setup ─────────────────────────────────────────────────────────
function SetupScreen({ quizSize, setQuizSize, onStart }) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">❓</div>
          <h2 className="text-xl font-extrabold text-white font-heading">Opening Quiz</h2>
          <p className="text-muted text-sm mt-1">Identify the opening from the board position</p>
        </div>

        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Number of questions</div>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map(n => (
              <button
                key={n}
                onClick={() => setQuizSize(n)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-colors ${
                  quizSize === n ? 'bg-gold text-bg border-gold' : 'bg-bg3 text-muted border-border hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="card bg-bg3 space-y-2 text-sm text-muted">
          <div className="font-bold text-white text-xs uppercase tracking-wide">How it works</div>
          <p>You'll see a board position from a trap or opening. Pick the correct name from 4 options. The faster you recognise patterns, the better your opening knowledge!</p>
        </div>

        <button onClick={onStart} className="w-full btn-gold text-base py-3">
          Start Quiz
        </button>
      </div>
    </div>
  )
}

// ── Results ───────────────────────────────────────────────────────
function ResultsScreen({ score, total, answers, quiz, onRestart, onRetry }) {
  const pct = Math.round((score / total) * 100)
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'}</div>
          <div className="text-3xl font-extrabold text-white">{score}/{total}</div>
          <div className="text-muted mt-1">{pct}% correct</div>
          {pct >= 80 && <div className="text-gold text-sm mt-1 font-medium">Excellent opening knowledge!</div>}
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto">
          {quiz.map((q, i) => {
            const a = answers[i]
            const correct = a?.chosen === q.correct
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={correct ? 'text-accent2' : 'text-danger'}>{correct ? '✓' : '✗'}</span>
                <span className="text-white flex-1 truncate">{q.correct}</span>
                {!correct && a && (
                  <span className="text-muted text-xs truncate">you said: {a.chosen}</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onRestart} className="flex-1 btn-ghost">New Quiz</button>
          <button onClick={onRetry}   className="flex-1 btn-gold">Try Again</button>
        </div>
      </div>
    </div>
  )
}

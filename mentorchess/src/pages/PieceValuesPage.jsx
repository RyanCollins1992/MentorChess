import { useState } from 'react'

const PIECES = [
  {
    id: 'pawn', symbol: '♟', name: 'Pawn', value: 1, color: '#d4bc8c',
    desc: 'The backbone of chess. Pawns are worth 1 point each. Though weak individually, they are powerful in groups and can promote to any piece when they reach the other side.',
    tips: ['Pawns protect each other in chains', 'Passed pawns are very strong', 'Connected pawns are better than isolated ones', 'A promoted pawn becomes a queen!'],
    exchanges: ['A pawn for a pawn is equal', 'Never give up 2 pawns for nothing', 'Pawn + tempo can win endgames'],
  },
  {
    id: 'knight', symbol: '♞', name: 'Knight', value: 3, color: '#7a5232',
    desc: 'Worth about 3 pawns. Knights are the only pieces that can jump over others. They are strongest in closed positions and weakest near the edges of the board.',
    tips: ['Knights on the rim are dim!', 'Outposts make knights very powerful', 'Knights shine in closed positions', 'Takes 4+ moves to cross the board'],
    exchanges: ['Knight ≈ Bishop (3 points)', 'Bishop pair beats 2 knights in open positions', 'Knight beats bishop in closed positions'],
  },
  {
    id: 'bishop', symbol: '♝', name: 'Bishop', value: 3, color: '#d4bc8c',
    desc: 'Also worth about 3 pawns. Bishops cover long diagonals and excel in open positions. Having two bishops (the "bishop pair") is a significant advantage.',
    tips: ['Bishops love open diagonals', 'Two bishops are very powerful together', 'A bad bishop is blocked by its own pawns', 'Always try to keep your bishop pair'],
    exchanges: ['Bishop ≈ Knight (3 points)', 'Bishop pair = +0.5 bonus', 'Bad bishop for good knight can be worth it'],
  },
  {
    id: 'rook', symbol: '♜', name: 'Rook', value: 5, color: '#7a5232',
    desc: 'Worth 5 pawns — a major piece. Rooks need open files to be effective. They are most powerful in the endgame where they can dominate open boards.',
    tips: ['Rooks belong on open files', 'Double rooks on the 7th rank is devastating', 'Rooks behind passed pawns are ideal', 'Connect your rooks early'],
    exchanges: ['Rook vs Bishop+Pawn is roughly equal', 'Two rooks often beat a queen', 'Exchanging into a rook endgame is often a good technique'],
  },
  {
    id: 'queen', symbol: '♛', name: 'Queen', value: 9, color: '#d4bc8c',
    desc: 'The most powerful piece, worth about 9 pawns. Combines the power of rook and bishop. Be careful — a queen alone cannot checkmate; she needs support.',
    tips: ['Don\'t develop the queen too early', 'A queen can be harassed by minor pieces', 'Queen + knight often works well together', 'Queen alone cannot force checkmate'],
    exchanges: ['Queen vs 3 minor pieces is roughly equal', 'Queen vs 2 rooks depends on the position', 'Winning the queen for a rook is "winning the exchange"'],
  },
  {
    id: 'king', symbol: '♔', name: 'King', value: null, color: '#7a5232',
    desc: 'The king has infinite value — losing it means losing the game! In the endgame, the king becomes a powerful attacking piece worth roughly 4 points of activity.',
    tips: ['Castle early to keep your king safe', 'In the endgame, activate your king!', 'The king is a fighting piece in the endgame', 'Opposition is the key king concept'],
    exchanges: ['King cannot be traded', 'King safety > material in the middlegame', 'King activity is crucial in the endgame'],
  },
]

const QUIZ = [
  { q: 'A rook is worth how many pawns?', options: ['3', '5', '7', '9'], answer: '5' },
  { q: 'Which is usually worth more in an open position?', options: ['Knight', 'Bishop', 'They\'re equal', 'Depends on colour'], answer: 'Bishop' },
  { q: 'What is the "exchange" in chess?', options: ['Trading queens', 'Rook for minor piece', 'Pawn for pawn', 'Any trade'], answer: 'Rook for minor piece' },
  { q: 'A queen is worth approximately how many pawns?', options: ['7', '8', '9', '10'], answer: '9' },
  { q: 'Where are knights weakest?', options: ['Centre', 'Edge of the board', 'Outposts', 'Closed positions'], answer: 'Edge of the board' },
  { q: 'What does "bishop pair" mean?', options: ['Two bishops on same colour', 'Having both your bishops', 'Two pawns and a bishop', 'Bishop on 7th rank'], answer: 'Having both your bishops' },
]

export default function PieceValuesPage() {
  const [selected, setSelected] = useState(PIECES[0])
  const [quizMode, setQuizMode] = useState(false)
  const [qIdx, setQIdx]         = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [picked, setPicked]     = useState(null)
  const [quizDone, setQuizDone] = useState(false)

  const handleQuizAnswer = (opt) => {
    if (picked) return
    setPicked(opt)
    const correct = opt === QUIZ[qIdx].answer
    setQuizAnswers(prev => [...prev, { correct, picked: opt }])
  }

  const nextQ = () => {
    if (qIdx + 1 >= QUIZ.length) { setQuizDone(true) }
    else { setQIdx(i => i + 1); setPicked(null) }
  }

  const resetQuiz = () => {
    setQIdx(0); setQuizAnswers([]); setPicked(null); setQuizDone(false)
  }

  if (quizMode) return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="card max-w-lg w-full space-y-6">
        {quizDone ? (
          <>
            <div className="text-center">
              <div className="text-4xl mb-2">{quizAnswers.filter(a => a.correct).length >= 5 ? '🏆' : '📚'}</div>
              <div className="text-2xl font-extrabold text-white">
                {quizAnswers.filter(a => a.correct).length} / {QUIZ.length}
              </div>
              <div className="text-muted text-sm mt-1">Piece values quiz complete!</div>
            </div>
            <div className="flex gap-3">
              <button onClick={resetQuiz} className="flex-1 btn-ghost">Try Again</button>
              <button onClick={() => setQuizMode(false)} className="flex-1 btn-gold">Back to Learn</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Question {qIdx + 1} of {QUIZ.length}</span>
              <span className="text-gold font-bold">{quizAnswers.filter(a => a.correct).length} correct</span>
            </div>
            <div className="font-bold text-white text-lg">{QUIZ[qIdx].q}</div>
            <div className="space-y-2">
              {QUIZ[qIdx].options.map(opt => {
                let style = 'border-border bg-bg3 text-white hover:border-gold/50'
                if (picked) {
                  if (opt === QUIZ[qIdx].answer) style = 'border-accent2 bg-accent2/15 text-accent2'
                  else if (opt === picked) style = 'border-danger bg-danger/15 text-danger'
                  else style = 'border-border bg-bg3 text-muted opacity-50'
                }
                return (
                  <button key={opt} onClick={() => handleQuizAnswer(opt)} disabled={!!picked}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${style}`}>
                    {opt}
                  </button>
                )
              })}
            </div>
            <button onClick={nextQ} disabled={!picked} className="w-full btn-gold disabled:opacity-40">
              {qIdx + 1 >= QUIZ.length ? 'See Results' : 'Next →'}
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — piece selector */}
      <div className="w-48 shrink-0 border-r border-border bg-bg2 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="font-bold text-white text-sm">Piece Values</div>
          <div className="text-xs text-muted mt-0.5">Tap to learn</div>
        </div>
        {PIECES.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-bg3 text-left ${
              selected.id === p.id ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''
            }`}
          >
            <span className="text-2xl">{p.symbol}</span>
            <div>
              <div className={`text-sm font-semibold ${selected.id === p.id ? 'text-gold' : 'text-white'}`}>{p.name}</div>
              <div className="text-xs text-muted">{p.value ? `${p.value} point${p.value !== 1 ? 's' : ''}` : 'Priceless'}</div>
            </div>
          </button>
        ))}
        <button onClick={() => setQuizMode(true)} className="m-3 btn-gold text-sm">
          Take Quiz
        </button>
      </div>

      {/* Right — detail */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl space-y-6">
          {/* Hero */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-bg3 border border-border flex items-center justify-center">
              <span className="text-6xl">{selected.symbol}</span>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-white font-heading">{selected.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {selected.value ? (
                  <>
                    <div className="flex gap-1">
                      {Array.from({ length: selected.value }).map((_, i) => (
                        <span key={i} className="text-gold text-lg">♟</span>
                      ))}
                    </div>
                    <span className="text-muted text-sm">= {selected.value} pawn{selected.value !== 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <span className="text-gold font-bold">Infinite value</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card">
            <p className="text-muted leading-relaxed">{selected.desc}</p>
          </div>

          {/* Tips */}
          <div className="card space-y-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wide">💡 Key Tips</div>
            <ul className="space-y-2">
              {selected.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <span className="text-gold mt-0.5 shrink-0">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Exchanges */}
          <div className="card space-y-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wide">⚖️ Trading Guidelines</div>
            <ul className="space-y-2">
              {selected.exchanges.map((ex, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <span className="text-accent mt-0.5 shrink-0">•</span>
                  {ex}
                </li>
              ))}
            </ul>
          </div>

          {/* Point chart */}
          <div className="card space-y-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wide">📊 All Piece Values</div>
            <div className="space-y-2">
              {PIECES.filter(p => p.value).map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-6 text-center">{p.symbol}</span>
                  <span className="text-sm text-white w-16">{p.name}</span>
                  <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${selected.id === p.id ? 'bg-gold' : 'bg-accent/60'}`}
                      style={{ width: `${(p.value / 9) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white w-4">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { Chess } from 'chess.js'
import { Lightbulb, Eye, Target, Sparkles, ArrowRight } from 'lucide-react'
import { Chessboard } from './Chessboard'
import Badge from './Badge'
import { getTrapOrdinal, TOTAL_TRAPS } from '../../data/traps'

const LEVEL_TONE = { beginner: 'sage', intermediate: 'brass', advanced: 'oxblood' }

const SECTIONS = [
  { key: 'lesson',  label: 'The Lesson',      icon: Lightbulb },
  { key: 'lookFor', label: 'What to Look For', icon: Eye },
  { key: 'goal',    label: 'Your Goal',        icon: Target },
  { key: 'takeaway', label: 'Key Takeaway',    icon: Sparkles },
]

// Standalone teaching-card view for a trap — a single instructive position
// (the critical moment right before the trap springs) plus the four
// lessonCard fields authored in data/traps.js. Deliberately its own
// self-contained layout rather than a reskin of the drill/browse board, so
// it reads as "study material" at a glance.
export default function TrapLessonCard({ trap, onPracticeClick }) {
  const { criticalFen, lastMove } = useMemo(() => {
    const c = new Chess(trap.fen)
    for (let i = 0; i < trap.moves.length - 1; i++) {
      try { c.move(trap.moves[i]) } catch { /* invalid move in trap data, skip */ }
    }
    const beforeFinal = c.fen()
    const finalSan = trap.moves[trap.moves.length - 1]
    let move = null
    try { move = c.move(finalSan) } catch { /* leave move null, show pre-move position */ }
    return {
      criticalFen: move ? beforeFinal : (trap.moves.length ? beforeFinal : trap.fen),
      lastMove: move ? { from: move.from, to: move.to, captured: !!move.captured } : null,
    }
  }, [trap])

  const ordinal = getTrapOrdinal(trap.id)
  const card = trap.lessonCard

  return (
    <div className="h-full overflow-y-auto flex justify-center p-6">
      <div className="w-full max-w-[560px]">
        <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gold">
                Trap Training · #{ordinal} of {TOTAL_TRAPS}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge tone={LEVEL_TONE[trap.level] || 'muted'}>{trap.level}</Badge>
                <Badge tone="muted">{trap.color}</Badge>
              </div>
            </div>
            <h2 className="font-heading text-2xl font-extrabold text-white leading-tight">{trap.opening}</h2>
            <div className="text-muted text-sm mt-0.5">{trap.name}</div>
          </div>

          {/* Board */}
          <div className="p-5 flex justify-center bg-bg3/40">
            <div className="w-full max-w-[380px]">
              <Chessboard
                position={criticalFen}
                boardOrientation={trap.color === 'black' ? 'black' : 'white'}
                arePiecesDraggable={false}
                lastMove={lastMove}
                customBoardStyle={{ borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Lesson sections */}
          <div className="p-5 grid sm:grid-cols-2 gap-3">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="bg-bg3 border border-border rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={14} className="text-gold shrink-0" />
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-sm text-white leading-relaxed">{card?.[key] ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          {onPracticeClick && (
            <div className="px-5 pb-5">
              <button
                onClick={onPracticeClick}
                className="w-full flex items-center justify-center gap-2 bg-gold text-bg font-bold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Practice this trap <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

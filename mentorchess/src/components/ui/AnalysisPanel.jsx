import { useState, useMemo } from 'react'
import { EvalBar } from './EvalBar'
import { identifyOpening } from '../../core/openingIdentifier'
import { pvToSan } from '../../core/GameAnalysis'

/**
 * AnalysisPanel — the Analysis Mode sidebar content. Purely presentational:
 * the engine lifecycle/evaluation/tactic-detection all live in the parent
 * page's useLiveEval() hook (src/hooks/useLiveEval.js) — this component
 * just renders whatever it's handed. Notes are the one piece of local state
 * (session-only per the brief), reset for free whenever the parent remounts
 * this component via a game-scoped `key`.
 */
export default function AnalysisPanel({ fen, sanMoveList, sfReady, evalResult, tactic }) {
  const [notes, setNotes] = useState('')

  const openingName = useMemo(() => identifyOpening(sanMoveList), [sanMoveList])
  const bestLine   = useMemo(() => evalResult?.pv?.length  ? pvToSan(fen, evalResult.pv, 3)  : [], [fen, evalResult])
  const secondLine = useMemo(() => evalResult?.pv2?.length ? pvToSan(fen, evalResult.pv2, 3) : [], [fen, evalResult])

  const formatLine = (line) => line.map(p => `${p.moveNum}${p.san}`).join(' ')

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Evaluation</div>
        {sfReady
          ? <EvalBar eval={evalResult?.eval || 0} />
          : <div className="text-xs text-muted">⏳ Loading engine…</div>}
      </div>

      {openingName && (
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-1">Opening</div>
          <div className="text-sm text-white font-medium">{openingName}</div>
        </div>
      )}

      {tactic && tactic.length > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 space-y-1.5">
          <div className="text-sm font-bold text-gold">🔥 Tactical opportunity</div>
          <div className="font-mono text-xs text-white space-y-0.5">
            {tactic.map((ply, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted" aria-hidden="true">↓</span>}
                <span>{ply.moveNum} {ply.san}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(bestLine.length > 0 || secondLine.length > 0) && (
        <div>
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Variations</div>
          <div className="space-y-1 font-mono text-xs">
            {bestLine.length > 0 && (
              <div className="text-white truncate"><span className="text-gold font-bold">Best</span> {formatLine(bestLine)}</div>
            )}
            {secondLine.length > 0 && (
              <div className="text-muted truncate"><span className="font-bold">Alt</span> {formatLine(secondLine)}</div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Scratch notes for this game…"
          rows={4}
          className="w-full bg-bg3 border border-border rounded-lg px-2.5 py-2 text-xs text-white placeholder-muted outline-none focus:border-gold/50 resize-none"
        />
      </div>
    </div>
  )
}

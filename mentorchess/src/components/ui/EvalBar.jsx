import { winPercent, isMateScore, mateDistance } from '../../core/GameAnalysis'

// Extracted from GameReviewPage.jsx (its own private EvalBar) once
// AnalysisPanel.jsx needed the exact same eval-bar rendering for live play —
// shared rather than duplicated.
export function EvalBar({ eval: ev }) {
  // Sigmoid win-probability (same formula as Lichess) — small advantages are clearly visible
  const whitePct = winPercent(ev)
  const isMate   = isMateScore(ev)
  const display  = isMate
    ? `M${mateDistance(ev)}`
    : (Math.abs(ev) / 100).toFixed(1)
  const sign = ev >= 0 ? '+' : '-'

  return (
    <div className="flex items-center gap-2 h-5">
      <div className="flex-1 h-3 bg-bg3 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gold transition-all duration-500 ease-out absolute left-0 top-0"
          style={{ width: `${whitePct}%` }}
        />
      </div>
      <div className={`text-xs font-bold font-mono w-14 text-right tabular-nums ${ev >= 0 ? 'text-gold' : 'text-muted'}`}>
        {sign}{display}
      </div>
    </div>
  )
}

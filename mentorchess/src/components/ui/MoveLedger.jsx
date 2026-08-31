/**
 * Shared move-list component — a ruled, numbered White|Black ledger, the
 * same shape a paper tournament scoresheet already has. Extracted from the
 * near-identical markup that used to be duplicated in FreePlayPage.jsx and
 * VsCoachPage.jsx.
 *
 * Theme-reactive through the existing --color-* tokens.
 */
export default function MoveLedger({ moveList, className = '', activeIdx, onMoveClick }) {
  if (!moveList || moveList.length === 0) {
    return <div className="text-xs text-muted italic">No moves yet</div>
  }

  const rows = Math.ceil(moveList.length / 2)
  const lastIdx = moveList.length - 1
  // OpeningsPage's drill/browse mode steps through a fixed line and can sit
  // at any move, not just the last one — activeIdx opts into that 3-way
  // played/current/upcoming styling. Omitted (FreePlayPage/VsCoachPage),
  // behavior is pixel-identical to before: only the last move is ever gold.
  const stepping = activeIdx != null

  const cellClass = (idx, isWhite) => {
    if (stepping) {
      if (idx === activeIdx) return 'text-gold font-bold'
      if (idx < activeIdx) return 'text-accent2'
      return 'text-muted'
    }
    return idx === lastIdx ? 'text-gold font-bold' : (isWhite ? 'text-white' : 'text-muted')
  }

  return (
    <div className={`font-mono text-xs border border-border rounded-lg overflow-hidden ${className}`}>
      {Array.from({ length: rows }, (_, i) => {
        const wIdx = i * 2
        const bIdx = i * 2 + 1
        return (
          <div
            key={i}
            className={`flex gap-2 px-3 py-1.5 border-b border-border last:border-b-0 ${i % 2 === 1 ? 'bg-bg3/40' : ''}`}
          >
            <span className="text-muted w-5 tabular-nums">{i + 1}.</span>
            <span
              className={`flex-1 tabular-nums ${cellClass(wIdx, true)} ${onMoveClick && moveList[wIdx] ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => moveList[wIdx] && onMoveClick?.(wIdx)}
            >
              {moveList[wIdx] || ''}
            </span>
            <span
              className={`flex-1 tabular-nums ${cellClass(bIdx, false)} ${onMoveClick && moveList[bIdx] ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => moveList[bIdx] && onMoveClick?.(bIdx)}
            >
              {moveList[bIdx] || ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

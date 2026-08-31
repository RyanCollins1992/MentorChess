import { motion, useReducedMotion } from 'framer-motion'
import { DURATION, EASE_SETTLE } from '../../styles/motion'
import { useHoverCapable } from '../../hooks/useHoverCapable'

// Same Unicode piece glyphs Chessboard.jsx's Classic set renders (kept as a
// small local copy rather than importing GLYPHS, which Chessboard.jsx
// doesn't export — these are standard Unicode chess symbols, not the
// component's own asset).
const GLYPHS = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞' },
}

const CHOICES = [
  { piece: 'q', label: 'Queen' },
  { piece: 'r', label: 'Rook' },
  { piece: 'b', label: 'Bishop' },
  { piece: 'n', label: 'Knight' },
]

// Fan angle per card, center-weighted (queen/rook lean left, bishop/knight
// lean right) — this is the "card-fan promotion" interaction from the
// original Tempo design doc's "Premium interactions" list, never picked up
// until now (see project memory). Every promotion elsewhere in the app
// (scripted drill lines) already knows its promotion piece ahead of time and
// never shows this — it only appears where the user is actually choosing,
// i.e. Free Play and vs. Coach.
const FAN_ANGLES = [-18, -6, 6, 18]

/**
 * Renders as an absolutely-positioned overlay — the parent page is
 * responsible for wrapping its <Chessboard> in a `relative` container so
 * `inset-0` lands correctly over the board, not the whole page.
 */
export default function PromotionPicker({ color, onSelect, onCancel }) {
  const reduceMotion = useReducedMotion()
  const hoverCapable = useHoverCapable()
  const glyphs = GLYPHS[color] ?? GLYPHS.w

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded"
      onClick={onCancel}
      role="dialog"
      aria-label="Choose promotion piece"
    >
      <div className="flex items-end gap-2" onClick={(e) => e.stopPropagation()}>
        {CHOICES.map(({ piece, label }, i) => (
          <motion.button
            key={piece}
            type="button"
            aria-label={`Promote to ${label}`}
            onClick={() => onSelect(piece)}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.5, rotate: 0, y: 12 }}
            animate={{ opacity: 1, scale: 1, rotate: reduceMotion ? 0 : FAN_ANGLES[i], y: 0 }}
            transition={{ duration: DURATION.settle, ease: EASE_SETTLE, delay: reduceMotion ? 0 : i * 0.04 }}
            whileHover={reduceMotion || !hoverCapable ? undefined : { scale: 1.12, rotate: 0, y: -6 }}
            className="w-16 h-20 rounded-lg bg-bg2 border border-border shadow-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gold transition-colors"
            style={{ transformOrigin: 'bottom center' }}
          >
            <span className="text-3xl leading-none">{glyphs[piece]}</span>
            <span className="text-[10px] text-muted uppercase tracking-wide">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

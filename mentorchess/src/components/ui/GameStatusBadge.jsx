import { motion, useReducedMotion } from 'framer-motion'
import { DURATION, EASE_SETTLE } from '../../styles/motion'

const TONE_CLASSES = {
  over:    'bg-gold/15 text-gold border border-gold/30',
  check:   'bg-danger/15 text-danger border border-danger/30',
  default: 'bg-bg3 text-muted border border-border',
}

/**
 * The inline win/check/turn indicator shared by FreePlayPage and
 * VsCoachPage. Transitioning into tone="over" plays a "reveal" (420ms)
 * game-complete beat — the app's only "game complete" UI today is this
 * badge, not a modal (see project memory), so reveal is scoped to this
 * rather than a component that doesn't exist yet.
 */
export default function GameStatusBadge({ text, tone }) {
  const reduceMotion = useReducedMotion()
  const className = `rounded-xl px-3 py-2 text-sm font-medium text-center ${TONE_CLASSES[tone]}`

  if (tone !== 'over' || reduceMotion) {
    return <div className={className}>{text}</div>
  }

  return (
    <motion.div
      key="over"
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.reveal, ease: EASE_SETTLE }}
    >
      {text}
    </motion.div>
  )
}

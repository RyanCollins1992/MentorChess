import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

/**
 * Animates a number counting up (or down) to `value` on mount and whenever
 * `value` changes — e.g. an ELO rating updating after a game, or a streak
 * ticking over. Inspired by Magic UI's Number Ticker pattern (see
 * `Ryan's Brain/Magic UI/Text Animations.md`), reimplemented on Framer
 * Motion (already a dependency here, no new package) rather than ported,
 * so it follows this app's own spring/reduced-motion conventions instead
 * of Magic UI's.
 *
 * Renders as a plain number under prefers-reduced-motion — a counting
 * animation is decorative, not informational, so there's nothing lost by
 * skipping it (same rationale as every other DURATION-gated motion in
 * this app, see styles/motion.js).
 */
export default function NumberTicker({ value, decimalPlaces = 0, className = '' }) {
  const prefersReducedMotion = useReducedMotion()
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { stiffness: 120, damping: 22, mass: 0.6 })
  const display = useTransform(spring, (v) => v.toFixed(decimalPlaces))
  const firstRender = useRef(true)

  useEffect(() => {
    if (prefersReducedMotion) {
      motionValue.jump(value)
      return
    }
    // Jump straight to the value on first mount (nothing to animate
    // "from" yet) — only animate on subsequent changes.
    if (firstRender.current) {
      motionValue.jump(value)
      firstRender.current = false
      return
    }
    motionValue.set(value)
  }, [value, prefersReducedMotion, motionValue])

  return <motion.span className={className}>{display}</motion.span>
}

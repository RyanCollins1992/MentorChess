/**
 * Motion tokens — see "Motion language" in the Tempo design doc. Four
 * durations, one easing curve ("settle") for almost everything; instant
 * feedback (button press, already handled by the .btn-* active:scale-95
 * classes in globals.css) is linear instead.
 *
 * Page-switcher transition (settle) and Chessboard.jsx's piece-slide/
 * selection-ring (quick) both consume these — see Chessboard.jsx for the
 * quick usage (react-chessboard's own animationDurationInMs/showAnimations
 * options, plus a CSS transition on the selection-ring highlight).
 *
 * reveal is used by GameStatusBadge.jsx's game-complete beat — there's no
 * dedicated "game complete" modal anywhere in the app (FreePlayPage and
 * VsCoachPage both just recolor an inline status badge), so reveal is
 * scoped to that badge's tone="over" transition rather than a component
 * that doesn't exist. "Board mount" (the other reveal use case named in
 * the design doc) is deliberately not separately animated — it would
 * double up with the page-switcher's own settle fade, which already
 * covers a board's first appearance.
 */

export const EASE_SETTLE = [0.22, 1, 0.36, 1]

export const DURATION = {
  instant: 0.1,
  quick: 0.18,
  settle: 0.28,
  reveal: 0.42,
}

export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.settle, ease: EASE_SETTLE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.settle, ease: EASE_SETTLE } },
}

// Instant, no-motion variant swapped in under prefers-reduced-motion.
export const pageTransitionReduced = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0, transition: { duration: 0 } },
  exit: { opacity: 1, y: 0, transition: { duration: 0 } },
}

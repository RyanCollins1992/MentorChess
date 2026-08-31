import { useState, useEffect } from 'react'

const QUERY = '(hover: hover) and (pointer: fine)'

/**
 * Detects whether the current input actually supports hover (a mouse/
 * trackpad), as opposed to touch-only — the same gotcha called out in
 * several of the component registries ingested into the vault (SmoothUI's
 * Magnetic Button/Scramble Hover docs both disable their hover effect on
 * touch devices to avoid a "stuck hover" after tap, since a `whileHover`
 * animation has nothing to reverse it without a real pointer leaving the
 * element). Relevant here specifically because this app ships to Android/
 * iOS via Capacitor, not just desktop browsers.
 *
 * Deliberately capability-based (`hover`/`pointer` media features) rather
 * than viewport-width-based ("useIsMobile") — a touchscreen laptop with a
 * mouse attached should keep hover effects; a narrow desktop browser window
 * shouldn't lose them just for being narrow.
 */
export function useHoverCapable() {
  const [hoverCapable, setHoverCapable] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : true
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setHoverCapable(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return hoverCapable
}

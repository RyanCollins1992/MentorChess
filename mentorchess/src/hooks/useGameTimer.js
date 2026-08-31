import { useState, useEffect, useCallback } from 'react'

const format = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * useGameTimer — a plain elapsed-time stopwatch for live play (Focus Mode's
 * "Timer + moves only" brief). Not a real chess clock (no per-player time
 * controls/increment/flag-fall) — the app has no such concept anywhere yet,
 * and none was asked for; this is just "how long has this game been going."
 */
export function useGameTimer(running) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const reset = useCallback(() => setSeconds(0), [])

  return { seconds, formatted: format(seconds), reset }
}

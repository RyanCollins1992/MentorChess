import { useState, useEffect, useRef, useMemo } from 'react'
import { LiveEvalEngine } from '../core/LiveEvalEngine'
import { isMateScore, pvToSan } from '../core/GameAnalysis'
import { readThemeColor } from '../core/themeColor'

// Between isGreatMove's 70cp bar ("clearly the best move") and the BLUNDER
// classification's 200cp bar, both already defined in GameAnalysis.js —
// reuses that file's own established scale rather than an arbitrary number.
const TACTIC_GAP_THRESHOLD = 150
const TACTIC_ARROW_STAGGER_MS = 500

/**
 * useLiveEval — owns the always-on live Stockfish evaluation for Analysis
 * Mode: engine lifecycle, per-position evaluation, tactic-opportunity
 * detection, and the staggered arrow reveal for a found tactic. Lives in the
 * PARENT page (VsCoachPage/FreePlayPage), not inside AnalysisPanel itself,
 * because the tactic arrows need to reach the sibling <Chessboard> — a
 * sidebar-only component can't reach across to it without prop-drilling
 * back through the parent anyway, so the parent owns the source of truth
 * and passes evalResult/tactic down to AnalysisPanel as plain props.
 */
export function useLiveEval(fen, active) {
  const engineRef    = useRef(null)
  const isMountedRef  = useRef(true)
  const [sfReady, setSfReady]       = useState(false)
  const [evalResult, setEvalResult] = useState(null)
  const [tacticArrows, setTacticArrows] = useState([])

  // `active` flipping off should clear sfReady/evalResult immediately, not
  // wait for the engine-teardown effect below — adjusted during render
  // (guarded), same pattern OpeningsPage.jsx uses for resetting its study
  // panel when a prop/tab changes, rather than a synchronous setState call
  // inside an effect body (react-hooks/set-state-in-effect).
  const [prevActive, setPrevActive] = useState(active)
  if (active !== prevActive) {
    setPrevActive(active)
    if (!active) { setSfReady(false); setEvalResult(null) }
  }

  // Engine lifecycle — created lazily only while `active`, matching
  // EndgamesPage.jsx's "don't spin up Stockfish nobody asked for" precedent.
  // The only setState here is inside the async init().then() callback,
  // which is the explicitly-sanctioned "subscribe to an external system"
  // shape, not a synchronous call in the effect body.
  useEffect(() => {
    isMountedRef.current = true
    if (!active) return
    const engine = new LiveEvalEngine()
    engineRef.current = engine
    engine.init().then(ok => { if (isMountedRef.current) setSfReady(ok) })
    return () => {
      isMountedRef.current = false
      engine.terminate()
      engineRef.current = null
    }
  }, [active])

  // Re-evaluate on every position change while active and ready.
  useEffect(() => {
    if (!active || !sfReady || !engineRef.current) return
    let cancelled = false
    engineRef.current.evaluate(fen).then(result => {
      if (cancelled || !isMountedRef.current) return
      setEvalResult(result)
    })
    return () => { cancelled = true }
  }, [fen, active, sfReady])

  const tactic = useMemo(() => {
    if (!evalResult || evalResult.eval2 == null || !evalResult.pv?.length) return null
    const gap = Math.abs(evalResult.eval - evalResult.eval2)
    const topIsMate    = isMateScore(evalResult.eval)
    const secondIsMate = isMateScore(evalResult.eval2)
    if (gap >= TACTIC_GAP_THRESHOLD || (topIsMate && !secondIsMate)) {
      return pvToSan(fen, evalResult.pv, 4)
    }
    return null
  }, [evalResult, fen])

  // Clear the revealed arrows synchronously whenever the detected tactic
  // changes (render-time, guarded — same reasoning as the active-reset
  // above), then let the effect below repopulate it via a real async timer.
  const [prevTactic, setPrevTactic] = useState(tactic)
  if (tactic !== prevTactic) {
    setPrevTactic(tactic)
    setTacticArrows([])
  }

  // Reveal the tactic's arrows onto the board one ply at a time rather than
  // all at once — the "animate the arrows" ask.
  useEffect(() => {
    if (!tactic || tactic.length === 0) return
    const timers = tactic.map((ply, i) => setTimeout(() => {
      setTacticArrows(prev => [...prev, { startSquare: ply.from, endSquare: ply.to, color: readThemeColor('--color-gold', '#f5b731') }])
    }, i * TACTIC_ARROW_STAGGER_MS))
    return () => timers.forEach(clearTimeout)
  }, [tactic])

  return { sfReady, evalResult, tactic, tacticArrows }
}

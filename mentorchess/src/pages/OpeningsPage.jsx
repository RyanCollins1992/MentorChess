import { useState, useRef, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Chessboard } from '../components/ui/Chessboard'
import MoveLedger from '../components/ui/MoveLedger'
import TrapLessonCard from '../components/ui/TrapLessonCard'
import { Chess } from 'chess.js'
import { useChessBoard } from '../hooks/useChessBoard'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { OPENING_REPERTOIRE } from '../data/openingsRepertoire'

export default function OpeningsPage() {
  const { activeColor, setActiveColor, searchQuery, setSearchQuery, selectedTrap, selectTrap, getFilteredTraps } = useOpeningsStore()
  const showToast = useAppStore(s => s.showToast)
  const traps = getFilteredTraps()
  const [selectedRepertoire, setSelectedRepertoire] = useState(null)
  const [selectedLine, setSelectedLine] = useState(null)
  const [prevActiveColor, setPrevActiveColor] = useState(activeColor)
  const [prevSelectedTrap, setPrevSelectedTrap] = useState(selectedTrap)
  // "Openings"/"Traps" sections start open so the 3 level headers are
  // visible immediately; each level still needs its own click to reveal
  // lines. Each toggle is independent so any combination can be
  // expanded/minimized at once.
  const [expandedSections, setExpandedSections] = useState({ openings: true, traps: true })
  const [expandedLevels, setExpandedLevels] = useState({})
  const toggleSection = (key) => setExpandedSections(s => ({ ...s, [key]: !s[key] }))
  const toggleLevel = (key) => setExpandedLevels(s => ({ ...s, [key]: !s[key] }))

  const filteredRepertoire = OPENING_REPERTOIRE
    .filter(r => activeColor !== 'mates' ? r.color === activeColor : false)
    .map(group => ({
      ...group,
      lines: searchQuery
        ? group.lines.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : group.lines,
    }))
    .filter(group => group.lines.length > 0)

  const openingsByLevel = ['beginner', 'intermediate', 'advanced']
    .map(level => ({
      level,
      lines: filteredRepertoire.flatMap(group =>
        group.lines.filter(l => l.level === level).map(l => ({ ...l, group }))
      ),
    }))
    .filter(g => g.lines.length > 0)

  // Reset the study panel whenever the color tab or the selected trap changes,
  // adjusted during render rather than in an effect (react-hooks/set-state-in-effect).
  if (activeColor !== prevActiveColor) {
    setPrevActiveColor(activeColor)
    setSelectedRepertoire(null)
    setSelectedLine(null)
  }
  if (selectedTrap !== prevSelectedTrap) {
    setPrevSelectedTrap(selectedTrap)
    if (selectedTrap) {
      setSelectedRepertoire(null)
      setSelectedLine(null)
    }
  }

  const chooseLine = (line, group) => {
    selectTrap(null)
    setSelectedRepertoire(group)
    setSelectedLine(line)
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      <div className={`${selectedTrap || selectedLine ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-72 md:shrink-0 border-b md:border-b-0 md:border-r border-border bg-bg2 overflow-hidden`}>
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <div className="flex gap-1">
            {[{ id: 'white', label: 'White' }, { id: 'black', label: 'Black' }, { id: 'mates', label: 'Mates' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveColor(tab.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeColor === tab.id ? 'bg-gold text-bg' : 'bg-bg3 text-muted hover:text-white border border-border'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search traps, openings…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {openingsByLevel.length > 0 && (
            <>
              <button
                onClick={() => toggleSection('openings')}
                className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border bg-bg3/40 hover:text-white transition-colors"
              >
                <span>Openings</span>
                {expandedSections.openings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedSections.openings && openingsByLevel.map(({ level, lines }) => {
                const levelKey = `openings-${level}`
                const levelOpen = !!expandedLevels[levelKey]
                return (
                  <div key={level}>
                    <button
                      onClick={() => toggleLevel(levelKey)}
                      className={`w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b border-border/50 transition-colors ${
                        level === 'beginner' ? 'text-accent2 bg-accent2/5' :
                        level === 'intermediate' ? 'text-gold bg-gold/5' :
                        'text-danger bg-danger/5'
                      }`}
                    >
                      <span>{level}</span>
                      {levelOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {levelOpen && lines.map(({ group, ...line }) => (
                      <button
                        key={line.name}
                        onClick={() => chooseLine(line, group)}
                        className={`w-full text-left px-4 py-2.5 border-b border-border/40 transition-colors hover:bg-bg3 ${
                          selectedLine?.name === line.name && !selectedTrap ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''
                        }`}
                      >
                        <div className={`text-sm font-semibold truncate ${
                          selectedLine?.name === line.name && !selectedTrap ? 'text-gold' : 'text-white'
                        }`}>
                          {line.name}
                        </div>
                        <div className="text-xs text-muted font-mono mt-0.5 truncate">
                          {line.moves.slice(0, 5).join(' ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </>
          )}
          {(activeColor === 'mates' || traps.length > 0) && (
            <>
              {openingsByLevel.length > 0 && (
                <button
                  onClick={() => toggleSection('traps')}
                  className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border bg-bg3/40 hover:text-white transition-colors"
                >
                  <span>Traps</span>
                  {expandedSections.traps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {traps.length === 0
                ? <div className="text-center text-muted py-10 text-sm">No traps found</div>
                : (openingsByLevel.length === 0 || expandedSections.traps) && ['beginner', 'intermediate', 'advanced'].map(level => {
                    const group = traps.filter(t => t.level === level)
                    if (!group.length) return null
                    const levelKey = `traps-${level}`
                    const levelOpen = !!expandedLevels[levelKey]
                    return (
                      <div key={level}>
                        <button
                          onClick={() => toggleLevel(levelKey)}
                          className={`w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b border-border/50 transition-colors ${
                            level === 'beginner' ? 'text-accent2 bg-accent2/5' :
                            level === 'intermediate' ? 'text-gold bg-gold/5' :
                            'text-danger bg-danger/5'
                          }`}
                        >
                          <span>{level}</span>
                          {levelOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        {levelOpen && group.map(trap => (
                          <TrapListItem key={trap.id} trap={trap} active={selectedTrap?.id === trap.id}
                            onClick={() => selectTrap(trap)}
                            studyCount={progressManager.getTrapStudyCount(trap.id)}
                            inSRS={srsEngine.isEnrolled(trap.id)} />
                        ))}
                      </div>
                    )
                  })
              }
            </>
          )}
          {openingsByLevel.length === 0 && traps.length === 0 && (
            <div className="text-center text-muted py-10 text-sm">No results found</div>
          )}
        </div>
      </div>
      <div className={`${selectedTrap || selectedLine ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 overflow-hidden`}>
        {(selectedTrap || selectedLine) && (
          <button onClick={() => { selectTrap(null); setSelectedLine(null) }} className="md:hidden shrink-0 flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-muted hover:text-white border-b border-border bg-bg2">
            ← Back to list
          </button>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          {selectedTrap
            ? <TrapStudy key={selectedTrap.id} trap={selectedTrap} showToast={showToast} />
            : selectedLine
              ? <RepertoireStudy key={selectedLine.name} line={selectedLine} group={selectedRepertoire} showToast={showToast} />
              : <TrapEmpty />}
        </div>
      </div>
    </div>
  )
}

function TrapListItem({ trap, active, onClick, studyCount, inSRS }) {
  const levelColors = { beginner: 'text-accent2', intermediate: 'text-gold', advanced: 'text-danger' }
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-bg3 ${active ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-sm font-semibold truncate ${active ? 'text-gold' : 'text-white'}`}>{trap.name}</div>
          <div className="text-xs text-muted truncate mt-0.5">{trap.opening}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold uppercase ${levelColors[trap.level] || 'text-muted'}`}>{trap.level}</span>
          {studyCount > 0 && <span className="text-[10px] text-accent2">✓ {studyCount}x</span>}
          {inSRS && <span className="text-[10px] text-accent">🔁</span>}
        </div>
      </div>
    </button>
  )
}

function TrapEmpty() {
  return (
    <div className="flex-1 flex items-center justify-center h-full text-muted">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-20">♟</div>
        <div className="text-lg font-semibold">Select a trap to study</div>
        <div className="text-sm mt-1">Choose from the list on the left</div>
      </div>
    </div>
  )
}

function TrapStudy({ trap, showToast }) {
  // Array indices are always White's book moves at even positions regardless
  // of trap.color — for a black trap, the whole point is drilling BLACK's
  // winning line, so the drill starts with White's first move already
  // played rather than making the user input White's move first (which is
  // what starting at index 0 would otherwise hand them for every black
  // trap). Computed once via a lazy initializer (same pattern as
  // browseFens/startPreviewFens below) rather than an effect/render-time ref
  // mutation, both of which this project's lint config disallows.
  const [primed] = useState(() => {
    if (trap.color !== 'black' || trap.moves.length === 0) return { fen: trap.fen, moveIdx: 0 }
    const c = new Chess(trap.fen)
    try {
      c.move(trap.moves[0])
      return { fen: c.fen(), moveIdx: 1 }
    } catch {
      return { fen: trap.fen, moveIdx: 0 }
    }
  })

  // Chess instance + fen sync live in the hook; move index stays in a ref
  // (not state) to avoid stale closures
  const { fen, tryMove, undo, move, reset: resetBoard } = useChessBoard(primed.fen)
  const moveIdxRef = useRef(primed.moveIdx)

  const [moveIdx, setMoveIdx]   = useState(primed.moveIdx)   // for UI only
  const [mistakes, setMistakes] = useState(0)
  const [complete, setComplete] = useState(false)
  const [flash, setFlash]       = useState(null)
  // 'drill' | 'browse' | 'lesson' — browseMode kept as a derived boolean so
  // the existing drill/browse logic below (which all reads `browseMode`)
  // stays untouched; lesson mode short-circuits the render entirely instead.
  const [viewMode, setViewMode] = useState('drill')
  const browseMode = viewMode === 'browse'
  const [browseFens] = useState(() => {
    // Pre-compute all FENs for prev/next navigation
    const c = new Chess(trap.fen)
    const fens = [trap.fen]
    for (const m of trap.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in trap data, skip */ }
    }
    return fens
  })
  const [browseIdx, setBrowseIdx] = useState(0)

  // Preview FENs computed from a fresh game start (standard chess initial position)
  const [startPreviewFens] = useState(() => {
    const c = new Chess()
    const fens = [c.fen()]
    for (const m of trap.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in trap data, skip */ }
    }
    return fens
  })
  // When previewing in Drill mode, prefer the trap's start position by default
  const drillPreviewFromStart = false

  // When in Drill mode the user can step through moves visually
  // without switching to Browse mode. `drillPreviewIdx` is null
  // when showing the live drill `fen`, otherwise it indexes into
  // `browseFens` for a visual preview of that ply.
  const [drillPreviewIdx, setDrillPreviewIdx] = useState(null)

  const [inSRS, setInSRS]       = useState(srsEngine.isEnrolled(trap.id))
  const refreshProgress         = useAppStore(s => s.refreshProgress)
  const mistakesRef             = useRef(0)

  // A drill can end on either side's move (most traps end on the "hero"
  // color's move, but a few — e.g. budapest-white, petrov-trap — happen to
  // end on the opponent's reply instead), so completion has to be checked
  // after BOTH a user move and an auto-played reply, not just the former.
  const finishDrill = () => {
    setComplete(true)
    progressManager.recordTrapStudy(trap.id, mistakesRef.current === 0)
    progressManager.awardXP(mistakesRef.current === 0 ? 'TRAP_DRILL_PERFECT' : 'TRAP_DRILL_COMPLETE')
    srsEngine.enroll(trap.id)
    setInSRS(true)
    refreshProgress()
    showToast(mistakesRef.current === 0 ? '🎉 Perfect drill!' : '✅ Drill complete!', mistakesRef.current === 0 ? 'gold' : 'success')
    setTimeout(() => setFlash(null), 800)
  }

  const handleDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (complete || browseMode) return false

    const expected  = trap.moves[moveIdxRef.current]
    // Scripted underpromotions (e.g. Lasker Trap's "fxg1=N+") need the drag to
    // promote to that exact piece — tryMove defaults to queen otherwise, which
    // would never match the expected line.
    const expectedPromotion = expected?.match(/=([QRBN])/i)?.[1]?.toLowerCase() || 'q'
    const result = tryMove(from, to, expectedPromotion)
    if (!result) return false

    const normalize = s => s.replace(/[+#!?]/g, '')

    if (normalize(result.san) === normalize(expected)) {
      setDrillPreviewIdx(null)
      setFlash('correct')
      const next = moveIdxRef.current + 1
      moveIdxRef.current = next
      setMoveIdx(next)

      if (next >= trap.moves.length) {
        finishDrill()
      } else {
        // Auto-play opponent move after delay
        setTimeout(() => {
          setFlash(null)
          if (move(trap.moves[next])) {
            const after = next + 1
            moveIdxRef.current = after
            setMoveIdx(after)
            setDrillPreviewIdx(null)
            if (after >= trap.moves.length) finishDrill()
          }
        }, 500)
      }
    } else {
      undo()
      setFlash('wrong')
      mistakesRef.current += 1
      setMistakes(m => m + 1)
      showToast('Not the right move — try again!', 'error', 1500)
      setTimeout(() => setFlash(null), 800)
    }
    return true
  }

  const reset = () => {
    resetBoard(primed.fen)
    moveIdxRef.current = primed.moveIdx
    mistakesRef.current = 0
    setMoveIdx(primed.moveIdx)
    setMistakes(0)
    setComplete(false)
    setFlash(null)
    setViewMode('drill')
    setBrowseIdx(0)
    setDrillPreviewIdx(null)
  }

  const toggleSRS = () => {
    if (inSRS) { srsEngine.unenroll(trap.id); setInSRS(false) }
    else { srsEngine.enroll(trap.id); setInSRS(true) }
    refreshProgress()
  }

  // Browse mode: prev/next through moves
  const handlePrev = () => {
    if (browseMode) {
      const next = Math.max(0, browseIdx - 1)
      setBrowseIdx(next)
    } else {
      const next = Math.max(0, (drillPreviewIdx ?? 0) - 1)
      setDrillPreviewIdx(next)
    }
  }
  const handleNext = () => {
    if (browseMode) {
      const next = Math.min(browseFens.length - 1, browseIdx + 1)
      setBrowseIdx(next)
    } else {
      const len = drillPreviewFromStart ? startPreviewFens.length : browseFens.length
      const next = Math.min(len - 1, (drillPreviewIdx ?? 0) + 1)
      setDrillPreviewIdx(next)
    }
  }
  const selectMode = (mode) => {
    setViewMode(mode)
    // Always start Browse mode from the beginning of the line rather than
    // wherever the live drill currently sits — Browse exists to review the
    // whole trap, and seeding from moveIdx meant finishing a drill (or
    // switching mid-drill) dropped you on the last move instead of the
    // first. browseIdx/drillPreviewIdx aren't read outside Browse/Drill, so
    // resetting them unconditionally here is safe for every mode switch.
    setBrowseIdx(0)
    setDrillPreviewIdx(null)
  }

  const displayFen   = drillPreviewIdx != null
    ? (drillPreviewFromStart ? startPreviewFens[drillPreviewIdx] : browseFens[drillPreviewIdx])
    : (browseMode ? browseFens[browseIdx] : fen)
  const studyCount   = progressManager.getTrapStudyCount(trap.id)
  const currentMoveNum = browseMode ? browseIdx : (drillPreviewIdx != null ? drillPreviewIdx : moveIdx)

  if (viewMode === 'lesson') {
    return <TrapLessonCard trap={trap} onPracticeClick={() => selectMode('drill')} />
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      {/* Board area */}
      <div className="flex flex-col items-center justify-center p-2 flex-1">
        <div className="w-full max-w-[min(calc(100vh_-_260px),86vw,940px)]">

          {/* Mode toggle */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${browseMode ? 'bg-accent/20 text-accent' : 'bg-gold/20 text-gold'}`}>
              {browseMode ? '📖 Browse Mode' : '🎯 Drill Mode'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => selectMode('lesson')} className="text-xs text-muted hover:text-white border border-border rounded-lg px-3 py-1 transition-colors">
                📇 Lesson Card
              </button>
              <button onClick={() => selectMode(browseMode ? 'drill' : 'browse')} className="text-xs text-muted hover:text-white border border-border rounded-lg px-3 py-1 transition-colors">
                {browseMode ? 'Switch to Drill' : 'Switch to Browse'}
              </button>
            </div>
          </div>

          {/* Board */}
          <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
            flash === 'correct' ? 'ring-2 ring-accent2' :
            flash === 'wrong'   ? 'ring-2 ring-danger'  : ''
          }`}>
            <Chessboard
              position={displayFen}
              onPieceDrop={handleDrop}
              boardOrientation={trap.color === 'black' ? 'black' : 'white'}
              customBoardStyle={{ borderRadius: '8px' }}
              arePiecesDraggable={!complete && !browseMode}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-3 bg-bg3 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gold transition-all duration-500 rounded-full"
              style={{ width: `${(currentMoveNum / trap.moves.length) * 100}%` }} />
          </div>

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between mt-3 gap-2">
            <button
              onClick={handlePrev}
              disabled={browseMode ? browseIdx === 0 : (drillPreviewIdx ?? 0) === 0}
              className="flex-1 btn-ghost text-sm disabled:opacity-30"
            >
              ◀ Prev
            </button>
            <span className="text-xs text-muted px-2 text-center min-w-20">
              {currentMoveNum === 0 ? 'Start' : `Move ${Math.ceil(currentMoveNum / 2)} of ${Math.ceil(trap.moves.length / 2)}`}
            </span>
            <button
              onClick={handleNext}
              disabled={browseMode ? browseIdx >= browseFens.length - 1 : (drillPreviewIdx ?? 0) >= ((drillPreviewFromStart ? startPreviewFens.length : browseFens.length) - 1)}
              className="flex-1 btn-ghost text-sm disabled:opacity-30"
            >
              Next ▶
            </button>
          </div>

          {/* Move notation — a scoresheet ledger you step through, not a
              slideshow (Tempo design doc, "Openings / Learn" brief) */}
          <MoveLedger
            moveList={trap.moves}
            activeIdx={currentMoveNum - 1}
            onMoveClick={i => browseMode ? setBrowseIdx(i + 1) : setDrillPreviewIdx(i + 1)}
            className="mt-2"
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg2 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-extrabold text-white text-lg font-heading">{trap.name}</h2>
          <div className="text-muted text-sm mt-0.5">{trap.opening}</div>
          {studyCount > 0 && (
            <span className="text-xs bg-accent2/15 text-accent2 border border-accent2/30 px-2 py-0.5 rounded-full font-medium mt-2 inline-block">
              Studied {studyCount}×
            </span>
          )}
        </div>

        <div className="p-4 border-b border-border">
          {complete ? (
            <div className="bg-accent2/15 border border-accent2/30 rounded-xl p-3 text-center">
              <div className="text-accent2 font-bold text-base">✅ Complete!</div>
              <div className="text-muted text-xs mt-1">
                {mistakes === 0 ? 'Perfect run! +20 XP' : `${mistakes} mistake${mistakes !== 1 ? 's' : ''}. +10 XP`}
              </div>
            </div>
          ) : browseMode ? (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-sm text-muted">
              📖 Browsing moves — click Prev/Next or tap a move
            </div>
          ) : (
            <div className="text-sm text-white font-medium">
              {complete ? 'Done!' : `Move ${Math.floor(moveIdx/2)+1} of ${Math.ceil(trap.moves.length/2)}`}
              {mistakes > 0 && <span className="text-danger text-xs ml-2">({mistakes} mistake{mistakes !== 1 ? 's' : ''})</span>}
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <button onClick={reset} className="w-full btn-ghost text-sm">↺ Restart</button>
          <button onClick={toggleSRS}
            className={`w-full text-sm px-4 py-2 rounded-lg font-medium border transition-colors ${inSRS ? 'bg-accent/15 text-accent border-accent/30' : 'bg-bg3 text-muted border-border hover:text-white'}`}>
            {inSRS ? '🔁 In Spaced Review ✓' : '+ Add to Spaced Review'}
          </button>
        </div>

        <div className="p-4 border-t border-border">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">💡 Key Concept</div>
          <p className="text-sm text-muted leading-relaxed">{trap.description}</p>
        </div>
      </div>
    </div>
  )
}

// Wrong-move mistake count for the CURRENT expected move maps directly to
// hint level — no separate "hintLevel" state needed, it's a pure function of
// mistakesForCurrentMove (see PRACTICE_MAX_MISTAKES below for the reset
// threshold). Keeping this as a derivation rather than parallel state is
// what keeps the reset-on-correct-move logic trivial (just zero one number).
const PRACTICE_MAX_MISTAKES = 4 // on the 4th wrong attempt, reset the whole line
const normalizeSan = (s) => s.replace(/[+#!?]/g, '')

function RepertoireStudy({ line, group, showToast }) {
  const [browseFens] = useState(() => {
    const c = new Chess()
    const fens = [c.fen()]
    for (const m of line.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in line data, skip */ }
    }
    return fens
  })
  // Starts at the beginning of the line (Ryan asked to stop landing on the
  // fully-played-out final position by default) — was `browseFens.length - 1`.
  const [browseIdx, setBrowseIdx] = useState(0)
  const atEnd = browseIdx >= browseFens.length - 1

  // 'browse' | 'practice' | 'complete'
  const [mode, setMode] = useState('browse')

  // A black-repertoire line's `moves` array still starts with White's move 1
  // (the array represents the whole game, not just Black's replies) — same
  // shape as TRAPS. So practice for a black line auto-plays White's first
  // move and the user only ever inputs Black's side, exactly like TrapStudy's
  // `primed` pattern for black traps.
  // The user only ever plays their own repertoire color — the other side's
  // replies are the computer's, auto-played after a short delay (same
  // pattern TrapStudy already uses for black traps' auto-played White
  // moves). Ply 0 is always White, so "is this the user's ply" is just
  // parity against which color the line belongs to.
  const isUsersMove = (idx) => (group?.color === 'black' ? idx % 2 === 1 : idx % 2 === 0)

  // If the computer moves first (a black-repertoire line), that opening move
  // has to be primed into the board's INITIAL fen via a lazy useState
  // initializer, not a mount-time effect — this project's lint config
  // (react-hooks/set-state-in-effect) forbids driving it with useEffect, and
  // TrapStudy hit this exact wall solving the same problem for black traps.
  const [primed] = useState(() => {
    if (isUsersMove(0) || line.moves.length === 0) return { fen: undefined, moveIdx: 0 }
    const c = new Chess()
    try {
      c.move(line.moves[0])
      return { fen: c.fen(), moveIdx: 1 }
    } catch {
      return { fen: undefined, moveIdx: 0 }
    }
  })

  const { fen: practiceFen, tryMove, move, undo, reset: resetPracticeBoard } = useChessBoard(primed.fen)
  const [expectedMoveIndex, setExpectedMoveIndex] = useState(primed.moveIdx)
  const [mistakesForCurrentMove, setMistakesForCurrentMove] = useState(0)
  const [flash, setFlash] = useState(null)

  const startPractice = () => {
    resetPracticeBoard(primed.fen)
    setExpectedMoveIndex(primed.moveIdx)
    setMistakesForCurrentMove(0)
    setFlash(null)
    setMode('practice')
  }

  const resetPractice = () => {
    resetPracticeBoard(primed.fen)
    setExpectedMoveIndex(primed.moveIdx)
    setMistakesForCurrentMove(0)
    setFlash(null)
  }

  // The move chess.js resolves the expected SAN to in the CURRENT position —
  // gives real {from,to} squares for the hint highlight/arrow without
  // re-implementing SAN disambiguation by hand.
  const expectedMove = useMemo(() => {
    if (mode !== 'practice') return null
    const expectedSan = line.moves[expectedMoveIndex]
    if (!expectedSan) return null
    // Built from the `practiceFen` STATE (not chessRef, which the project's
    // lint rules forbid reading during render) — a fresh Chess instance is
    // cheap and lets chess.js resolve the expected SAN's real {from,to}
    // without hand-rolling disambiguation.
    return new Chess(practiceFen).moves({ verbose: true })
      .find(m => normalizeSan(m.san) === normalizeSan(expectedSan)) || null
  }, [mode, expectedMoveIndex, practiceFen, line.moves])

  const handlePracticeDrop = ({ sourceSquare: from, targetSquare: to }) => {
    if (mode !== 'practice') return false
    const expectedSan = line.moves[expectedMoveIndex]
    const expectedPromotion = expectedSan?.match(/=([QRBN])/i)?.[1]?.toLowerCase() || 'q'
    const result = tryMove(from, to, expectedPromotion)
    if (!result) return false // not even a legal chess move — no mistake counted

    if (normalizeSan(result.san) === normalizeSan(expectedSan)) {
      setFlash('correct')
      setTimeout(() => setFlash(null), 500)
      // Correct move: hints/mistakes for the move just played are done with —
      // reset for whatever comes next, per "hints should never persist after
      // a correct move."
      setMistakesForCurrentMove(0)
      const next = expectedMoveIndex + 1
      setExpectedMoveIndex(next)

      if (next >= line.moves.length) {
        setMode('complete')
      } else if (!isUsersMove(next)) {
        // The computer plays the other color — auto-play its reply after a
        // beat, same delay TrapStudy uses for its own auto-played moves.
        setTimeout(() => {
          setFlash(null)
          if (move(line.moves[next])) {
            const after = next + 1
            setExpectedMoveIndex(after)
            if (after >= line.moves.length) setMode('complete')
          }
        }, 500)
      }
      return true
    }

    undo()
    setFlash('wrong')
    setTimeout(() => setFlash(null), 500)
    const mistakes = mistakesForCurrentMove + 1
    if (mistakes >= PRACTICE_MAX_MISTAKES) {
      showToast?.('❌ Reset — starting the line over', 'error', 1800)
      resetPractice()
    } else {
      showToast?.('Incorrect — try again', 'error', 1200)
      setMistakesForCurrentMove(mistakes)
    }
    return true
  }

  const showSquareHint = mode === 'practice' && mistakesForCurrentMove >= 2 && expectedMove
  const showArrowHint = mode === 'practice' && mistakesForCurrentMove >= 3 && expectedMove
  const practiceSquareStyles = showSquareHint
    ? { [expectedMove.from]: { backgroundColor: 'rgba(255, 215, 0, 0.4)' } }
    : undefined
  const practiceArrows = showArrowHint
    ? [{ startSquare: expectedMove.from, endSquare: expectedMove.to, color: 'rgba(255, 165, 0, 0.8)' }]
    : []

  const practiceMoveNum = expectedMoveIndex // ply count already played correctly, for the ledger

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
      <div className="flex flex-col items-center justify-center p-2 flex-1">
        <div className="w-full max-w-[min(calc(100vh_-_260px),86vw,940px)]">
          {mode === 'browse' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-accent/20 text-accent">
                  📖 Opening Theory
                </span>
                <span className="text-xs text-muted">{group?.name}</span>
              </div>

              <div className="rounded-xl overflow-hidden">
                <Chessboard
                  position={browseFens[browseIdx]}
                  boardOrientation={group?.color === 'black' ? 'black' : 'white'}
                  arePiecesDraggable={false}
                  customBoardStyle={{ borderRadius: '8px' }}
                />
              </div>

              <div className="mt-3 bg-bg3 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gold transition-all duration-500 rounded-full"
                  style={{ width: browseFens.length > 1 ? `${(browseIdx / (browseFens.length - 1)) * 100}%` : '0%' }} />
              </div>

              <div className="flex items-center justify-between mt-3 gap-2">
                <button onClick={() => setBrowseIdx(i => Math.max(0, i - 1))}
                  disabled={browseIdx === 0}
                  className="flex-1 btn-ghost text-sm disabled:opacity-30">
                  ◀ Prev
                </button>
                <span className="text-xs text-muted px-2 text-center min-w-20">
                  {browseIdx === 0 ? 'Start' : `Move ${Math.ceil(browseIdx / 2)} of ${Math.ceil(line.moves.length / 2)}`}
                </span>
                <button onClick={() => setBrowseIdx(i => Math.min(browseFens.length - 1, i + 1))}
                  disabled={atEnd}
                  className="flex-1 btn-ghost text-sm disabled:opacity-30">
                  Next ▶
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {line.moves.map((m, i) => (
                  <span key={i}
                    onClick={() => setBrowseIdx(i + 1)}
                    className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      i + 1 === browseIdx
                        ? 'text-gold bg-gold/20 font-bold'
                        : i < browseIdx
                          ? 'text-accent2 bg-accent2/10'
                          : 'text-muted hover:text-white'
                    }`}>
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{m}
                  </span>
                ))}
              </div>

              {atEnd && (
                <div className="mt-4 bg-gold/10 border border-gold/30 rounded-xl p-4 text-center">
                  <div className="text-white font-semibold text-sm">Now your turn — try this out.</div>
                  <div className="text-muted text-xs mt-1 mb-3">Replay this line from memory. Wrong moves get progressively bigger hints.</div>
                  <button onClick={startPractice} className="w-full bg-gold text-bg font-bold text-sm py-2 rounded-lg hover:opacity-90 transition-opacity">
                    Try it yourself →
                  </button>
                </div>
              )}
            </>
          )}

          {(mode === 'practice' || mode === 'complete') && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${mode === 'complete' ? 'bg-accent2/20 text-accent2' : 'bg-gold/20 text-gold'}`}>
                  {mode === 'complete' ? '✅ Complete' : '🎯 Practice'}
                </span>
                <button onClick={() => setMode('browse')} className="text-xs text-muted hover:text-white border border-border rounded-lg px-3 py-1 transition-colors">
                  Back to Browse
                </button>
              </div>

              <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
                flash === 'correct' ? 'ring-2 ring-accent2' :
                flash === 'wrong'   ? 'ring-2 ring-danger'  : ''
              }`}>
                <Chessboard
                  position={mode === 'complete' ? browseFens[browseFens.length - 1] : practiceFen}
                  onPieceDrop={handlePracticeDrop}
                  boardOrientation={group?.color === 'black' ? 'black' : 'white'}
                  customBoardStyle={{ borderRadius: '8px' }}
                  customSquareStyles={practiceSquareStyles}
                  arrows={practiceArrows}
                  arePiecesDraggable={mode === 'practice'}
                />
              </div>

              <div className="mt-3 bg-bg3 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gold transition-all duration-500 rounded-full"
                  style={{ width: `${(practiceMoveNum / line.moves.length) * 100}%` }} />
              </div>

              <div className="mt-3 text-center">
                {mode === 'complete' ? (
                  <div className="text-accent2 text-sm font-semibold">🎉 Nailed it from memory!</div>
                ) : (
                  <span className="text-xs text-muted">
                    Move {Math.floor(expectedMoveIndex / 2) + 1} of {Math.ceil(line.moves.length / 2)}
                    {mistakesForCurrentMove > 0 && <span className="text-danger ml-2">({mistakesForCurrentMove} miss{mistakesForCurrentMove !== 1 ? 'es' : ''} on this move)</span>}
                  </span>
                )}
              </div>

              <MoveLedger moveList={line.moves} activeIdx={practiceMoveNum - 1} className="mt-2" />

              <div className="flex items-center gap-2 mt-3">
                {mode === 'complete' ? (
                  <button onClick={startPractice} className="flex-1 btn-ghost text-sm">↺ Practice Again</button>
                ) : (
                  <button onClick={resetPractice} className="flex-1 btn-ghost text-sm">↺ Restart</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg2 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-extrabold text-white text-lg leading-tight font-heading">{line.name}</h2>
            {line.level && (
              <span className={`text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded-full border mt-1 ${
                line.level === 'beginner' ? 'text-accent2 border-accent2/30 bg-accent2/10' :
                line.level === 'intermediate' ? 'text-gold border-gold/30 bg-gold/10' :
                'text-danger border-danger/30 bg-danger/10'
              }`}>
                {line.level}
              </span>
            )}
          </div>
          <div className="text-muted text-sm mt-0.5">{group?.name}</div>
        </div>
        <div className="p-4 border-b border-border">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">💡 Main Idea</div>
          <p className="text-sm text-muted leading-relaxed">{line.idea}</p>
        </div>
        {line.pros && (
          <div className="p-4 border-b border-border space-y-1">
            <div className="text-xs font-bold text-accent2 uppercase tracking-wide">✅ Pros</div>
            {line.pros.map((p, i) => (
              <div key={i} className="text-xs text-muted flex gap-1.5">
                <span className="text-accent2 shrink-0">+</span>{p}
              </div>
            ))}
          </div>
        )}
        {line.cons && (
          <div className="p-4 border-b border-border space-y-1">
            <div className="text-xs font-bold text-danger uppercase tracking-wide">⚠️ Cons</div>
            {line.cons.map((c, i) => (
              <div key={i} className="text-xs text-muted flex gap-1.5">
                <span className="text-danger shrink-0">−</span>{c}
              </div>
            ))}
          </div>
        )}
        <div className="p-4">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Move Order</div>
          <div className="flex flex-wrap gap-1">
            {line.moves.map((m, i) => (
              <span key={i} className="text-xs font-mono text-accent2 bg-accent2/10 px-1.5 py-0.5 rounded">
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

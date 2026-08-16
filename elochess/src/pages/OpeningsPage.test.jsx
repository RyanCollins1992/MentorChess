import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Chess } from 'chess.js'
import OpeningsPage from './OpeningsPage'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { useAppStore } from '../store/useAppStore'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { TRAPS } from '../data/traps'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

// The sidebar is a two-level accordion (section -> level -> line/trap) —
// "Openings"/"Traps" sections are open by default, but each level
// ("beginner"/"intermediate"/"advanced") still needs its own click to reveal
// its lines. The same level label can appear twice at once (once under
// Openings, once under Traps, for whichever color/search is active), so this
// clicks every match rather than a single ambiguous getByText.
const expandLevel = (level) => screen.getAllByText(level).forEach(el => fireEvent.click(el))

// Fried Liver Attack (color: 'white') — the "hero" side is White, so only
// White's own plies (even indices) ever need dragging; Black's replies
// auto-play via the component's own 500ms timeout. Clicking Black's squares
// too (relying on a fixed short delay to land before the auto-play does) was
// flaky under full-suite CPU contention, so this only clicks White's moves
// and waits out the full auto-play delay between each one.
function solveFriedLiverWhiteMoves() {
  const trap = TRAPS.find(t => t.id === 'fried-liver')
  const chess = new Chess(trap.fen)
  const plies = trap.moves.map(san => {
    const move = chess.move(san)
    return { from: move.from, to: move.to }
  })
  return plies.filter((_, i) => i % 2 === 0)
}

describe('OpeningsPage', () => {
  beforeEach(() => {
    useOpeningsStore.setState({ activeColor: 'white', searchQuery: '', selectedTrap: null })
    srsEngine._cards = {}
  })

  it('defaults to the White tab showing both openings and traps', () => {
    render(<OpeningsPage />)
    expandLevel('beginner') // both sample items below are beginner-level
    expect(screen.getByText('Italian Game: Giuoco Piano')).toBeInTheDocument()
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.getByText('Select a trap to study')).toBeInTheDocument()
  })

  it('switching to the Black tab shows black-side content only', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Black'))
    expect(screen.queryByText('Fried Liver Attack')).not.toBeInTheDocument()
    expect(screen.queryByText('Italian Game: Giuoco Piano')).not.toBeInTheDocument()
  })

  it('switching to the Mates tab shows only the Traps section', () => {
    render(<OpeningsPage />)
    fireEvent.click(screen.getByText('Mates'))
    expandLevel('beginner')
    expect(screen.getByText("Scholar's Mate")).toBeInTheDocument()
    expect(screen.queryByText('Openings')).not.toBeInTheDocument()
  })

  it('search narrows both the openings and traps lists', () => {
    render(<OpeningsPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps, openings…'), { target: { value: 'fried liver' } })
    expandLevel('beginner')
    expect(screen.getByText('Fried Liver Attack')).toBeInTheDocument()
    expect(screen.queryByText('Italian Game: Giuoco Piano')).not.toBeInTheDocument()
  })

  it('an unmatched search shows the empty state', () => {
    render(<OpeningsPage />)
    fireEvent.change(screen.getByPlaceholderText('Search traps, openings…'), { target: { value: 'zzznotreal' } })
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('selecting a repertoire line starts at the beginning of the line, not the fully-played-out end', () => {
    render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    expect(screen.getByText('📖 Opening Theory')).toBeInTheDocument()
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('◀ Prev')).toBeDisabled()
  })

  it('Next in the repertoire browser steps forward one ply from the start', () => {
    render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    fireEvent.click(screen.getByText('Next ▶'))
    expect(screen.getByText('Move 1 of 8')).toBeInTheDocument()
  })

  it('shows pros and cons for the selected repertoire line', () => {
    render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    expect(screen.getByText('Natural, easy development')).toBeInTheDocument()
    expect(screen.getByText('Less forcing than sharper Italian tries')).toBeInTheDocument()
  })

  it('selecting a trap shows Drill mode with the trap name and key concept', () => {
    render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Fried Liver Attack'))
    expect(screen.getByText('🎯 Drill Mode')).toBeInTheDocument()
    expect(screen.getByText('Nxf7!! sacrifice — aggressive knight sacrifice for a devastating attack')).toBeInTheDocument()
  })

  it('selecting a trap after a line clears the repertoire view', () => {
    render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Italian Game: Giuoco Piano'))
    fireEvent.click(screen.getByText('Fried Liver Attack'))
    expect(screen.queryByText('📖 Opening Theory')).not.toBeInTheDocument()
    expect(screen.getByText('🎯 Drill Mode')).toBeInTheDocument()
  })

  it('a wrong move flashes an error and does not advance', async () => {
    const { container } = render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    // e2-e3 is legal but not the trap's scripted first move (e4).
    click(container, 'e2')
    click(container, 'e3')

    // Toast UI isn't rendered inside OpeningsPage's own tree, so the toast
    // is verified via the store showToast() actually wrote to.
    expect(useAppStore.getState().toast?.message).toBe('Not the right move — try again!')
    expect(await screen.findByText('(1 mistake)', { exact: false })).toBeInTheDocument()
  })

  // Fake timers make the auto-played opponent reply (a real setTimeout
  // inside the component) deterministic and instant instead of racing
  // against a fixed real-clock delay, which was flaky under full-suite CPU
  // contention (and slow: 7 real 600ms waits pushed this well past
  // vitest's default 5000ms test timeout under load).
  describe('with the auto-played opponent reply', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('playing the correct line completes the drill and auto-enrolls in SRS', () => {
      const { container } = render(<OpeningsPage />)
      expandLevel('beginner')
      fireEvent.click(screen.getByText('Fried Liver Attack'))

      const whiteMoves = solveFriedLiverWhiteMoves()
      whiteMoves.forEach(({ from, to }, i) => {
        click(container, from)
        click(container, to)
        if (i < whiteMoves.length - 1) {
          act(() => { vi.advanceTimersByTime(600) }) // let Black's auto-played reply land
        }
      })

      expect(screen.getByText('✅ Complete!')).toBeInTheDocument()
      expect(screen.getByText('🔁 In Spaced Review ✓')).toBeInTheDocument()
      expect(srsEngine.isEnrolled('fried-liver')).toBe(true)
    })

    it('Switch to Browse resets the board to the start of the line, not wherever the drill left off', () => {
      const { container } = render(<OpeningsPage />)
      expandLevel('beginner')
      fireEvent.click(screen.getByText('Fried Liver Attack'))

      click(container, 'e2') // e4, the trap's actual first move
      click(container, 'e4')
      act(() => { vi.advanceTimersByTime(600) }) // let the auto-played Black reply land

      fireEvent.click(screen.getByText('Switch to Browse'))
      expect(screen.getByText('📖 Browse Mode')).toBeInTheDocument()
      expect(screen.getByText('Start')).toBeInTheDocument()
    })
  })

  it('Restart resets a partially-played drill', () => {
    const { container } = render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    click(container, 'e2')
    click(container, 'e4')

    fireEvent.click(screen.getByText('↺ Restart'))
    expect(screen.getByText('Start')).toBeInTheDocument()
  })

  it('manually toggling Spaced Review enrolls and unenrolls without completing the drill', () => {
    render(<OpeningsPage />)
    expandLevel('beginner')
    fireEvent.click(screen.getByText('Fried Liver Attack'))

    fireEvent.click(screen.getByText('+ Add to Spaced Review'))
    expect(srsEngine.isEnrolled('fried-liver')).toBe(true)
    expect(screen.getByText('🔁 In Spaced Review ✓')).toBeInTheDocument()

    fireEvent.click(screen.getByText('🔁 In Spaced Review ✓'))
    expect(srsEngine.isEnrolled('fried-liver')).toBe(false)
    expect(screen.getByText('+ Add to Spaced Review')).toBeInTheDocument()
  })

  describe('repertoire line practice mode (progressive hints)', () => {
    // Italian Game: Giuoco Piano, 15 plies, group color 'white' — practice
    // starts on move 1 (e4) directly, no black-side auto-play priming.
    const LINE_NAME = 'Italian Game: Giuoco Piano'
    const PLY_COUNT = 15

    function openLineAndStartPractice() {
      expandLevel('beginner')
      fireEvent.click(screen.getByText(LINE_NAME))
      for (let i = 0; i < PLY_COUNT; i++) fireEvent.click(screen.getByText('Next ▶'))
      fireEvent.click(screen.getByText('Try it yourself →'))
    }

    it('reaching the end of Next shows the "try it yourself" prompt, not before', () => {
      render(<OpeningsPage />)
      expandLevel('beginner')
      fireEvent.click(screen.getByText(LINE_NAME))
      expect(screen.queryByText('Now your turn — try this out.')).not.toBeInTheDocument()

      for (let i = 0; i < PLY_COUNT; i++) fireEvent.click(screen.getByText('Next ▶'))
      expect(screen.getByText('Now your turn — try this out.')).toBeInTheDocument()
    })

    it('starting practice shows the practice board at move 1, no mistakes yet', () => {
      render(<OpeningsPage />)
      openLineAndStartPractice()

      expect(screen.getByText('🎯 Practice')).toBeInTheDocument()
      expect(screen.getByText('Move 1 of 8')).toBeInTheDocument()
      expect(screen.queryByText(/miss/)).not.toBeInTheDocument()
    })

    it('1st wrong move: shows "Incorrect", counts one mistake, no square hint yet', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      // d2-d3 is a legal move but not the line's scripted e4.
      click(container, 'd2')
      click(container, 'd3')

      expect(useAppStore.getState().toast?.message).toBe('Incorrect — try again')
      expect(screen.getByText('(1 miss on this move)')).toBeInTheDocument()
      // Still move 1 — the wrong move must not have advanced the line.
      expect(screen.getByText('Move 1 of 8')).toBeInTheDocument()
      // No hint yet: e2 (the correct piece to move) has no highlight style.
      const e2 = container.querySelector('[data-square="e2"]')
      expect(e2.innerHTML).not.toMatch(/255, 215, 0/)
    })

    it('2nd wrong move (same expected move): highlights the correct piece, no arrow yet', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      click(container, 'd2'); click(container, 'd3') // mistake 1
      click(container, 'd2'); click(container, 'd3') // mistake 2

      expect(screen.getByText('(2 misses on this move)')).toBeInTheDocument()
      const e2 = container.querySelector('[data-square="e2"]')
      expect(e2.innerHTML).toMatch(/255, 215, 0/) // gold highlight on the correct source square
    })

    it('3rd wrong move: keeps the square hint and adds an arrow, still lets the user move', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      click(container, 'd2'); click(container, 'd3') // mistake 1
      click(container, 'd2'); click(container, 'd3') // mistake 2
      click(container, 'd2'); click(container, 'd3') // mistake 3

      expect(screen.getByText('(3 misses on this move)')).toBeInTheDocument()
      const e2 = container.querySelector('[data-square="e2"]')
      expect(e2.innerHTML).toMatch(/255, 215, 0/) // hint square hint persists
      // An arrow layer should now be present on the board.
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('4th wrong move: resets the whole line back to move 1 and clears all hints', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      click(container, 'd2'); click(container, 'd3') // mistake 1
      click(container, 'd2'); click(container, 'd3') // mistake 2
      click(container, 'd2'); click(container, 'd3') // mistake 3
      click(container, 'd2'); click(container, 'd3') // mistake 4 -> reset

      expect(useAppStore.getState().toast?.message).toBe('❌ Reset — starting the line over')
      expect(screen.getByText('Move 1 of 8')).toBeInTheDocument()
      expect(screen.queryByText(/miss/)).not.toBeInTheDocument()
      const e2 = container.querySelector('[data-square="e2"]')
      expect(e2.innerHTML).not.toMatch(/255, 215, 0/) // hint cleared too
    })

    it('a correct move resets the mistake counter and clears hints for the next move', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      click(container, 'd2'); click(container, 'd3') // mistake 1
      click(container, 'd2'); click(container, 'd3') // mistake 2 (hint now showing on e2)

      click(container, 'e2'); click(container, 'e4') // the actual correct move

      // The move-pair counter only advances once BOTH plies of a pair are
      // played (same convention TrapStudy's own status line uses) — after
      // just White's e4, it correctly still reads "Move 1 of 8" (Black's
      // reply is still pending). What must be true is that the mistake
      // count/hint for the ply just played are gone.
      expect(screen.getByText('Move 1 of 8')).toBeInTheDocument()
      expect(screen.queryByText(/miss/)).not.toBeInTheDocument()
      // Old hint (on e2, last move's source square) must not still be shown.
      const e2 = container.querySelector('[data-square="e2"]')
      expect(e2.innerHTML).not.toMatch(/255, 215, 0/)

      // Playing Black's reply too should now advance the pair counter,
      // confirming the correct move genuinely progressed the line rather
      // than merely resetting the mistake count without advancing.
      click(container, 'e7'); click(container, 'e5')
      expect(screen.getByText('Move 2 of 8')).toBeInTheDocument()
    })

    it('mistakes are tracked per expected move, not globally — 3 mistakes on 3 different plies never trigger a reset', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      // One mistake (always on White's turn, so it's unambiguously legal
      // regardless of board state — h2-h3 is legal at every point in this
      // sequence), then the correct move, for each of White's first 3 plies.
      // 3 total mistakes across the session, but never more than 1 on any
      // single expected move — a global (non-per-move) counter would have
      // reset after the 3rd wrong attempt if the bug were present; a correct
      // per-move counter must not have reset anything.
      click(container, 'h2'); click(container, 'h3') // mistake on move 1 (expected e4)
      click(container, 'e2'); click(container, 'e4') // correct
      click(container, 'e7'); click(container, 'e5') // Black's reply, no mistake here
      click(container, 'h2'); click(container, 'h3') // mistake on move 2 (expected Nf3)
      click(container, 'g1'); click(container, 'f3') // correct
      click(container, 'b8'); click(container, 'c6') // Black's reply, no mistake here
      click(container, 'h2'); click(container, 'h3') // mistake on move 3 (expected Bc4)
      click(container, 'f1'); click(container, 'c4') // correct

      expect(screen.getByText('Move 3 of 8')).toBeInTheDocument()
      expect(useAppStore.getState().toast?.message).not.toBe('❌ Reset — starting the line over')
    })

    it('completing the full line from memory shows the Complete state', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      const chess = new Chess()
      const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Bb3', 'a6', 'Nbd2']
      for (const san of line) {
        const move = chess.move(san)
        click(container, move.from)
        click(container, move.to)
      }

      expect(screen.getByText('✅ Complete')).toBeInTheDocument()
      expect(screen.getByText('🎉 Nailed it from memory!')).toBeInTheDocument()
    })

    it('Restart during practice goes back to move 1', () => {
      const { container } = render(<OpeningsPage />)
      openLineAndStartPractice()

      click(container, 'e2'); click(container, 'e4') // correct move 1 (White)
      click(container, 'e7'); click(container, 'e5') // correct move 1 (Black) — completes the pair
      expect(screen.getByText('Move 2 of 8')).toBeInTheDocument()

      fireEvent.click(screen.getByText('↺ Restart'))
      expect(screen.getByText('Move 1 of 8')).toBeInTheDocument()
    })

    it('Back to Browse returns to the browse view without losing the line', () => {
      render(<OpeningsPage />)
      openLineAndStartPractice()

      fireEvent.click(screen.getByText('Back to Browse'))
      expect(screen.getByText('📖 Opening Theory')).toBeInTheDocument()
    })

    // Fake timers so the auto-played opponent reply (a real setTimeout) is
    // deterministic instead of racing a fixed real-clock delay — same
    // rationale as the Trap-drill auto-play tests above.
    describe('the computer plays the other color automatically', () => {
      beforeEach(() => { vi.useFakeTimers() })
      afterEach(() => { vi.useRealTimers() })

      it('a white-repertoire line auto-plays Black\'s reply — the user never touches Black\'s pieces', () => {
        const { container } = render(<OpeningsPage />)
        openLineAndStartPractice()

        click(container, 'e2'); click(container, 'e4') // the user's own move only
        expect(screen.getByText('Move 1 of 8')).toBeInTheDocument() // pair not done yet

        act(() => { vi.advanceTimersByTime(600) }) // let Black's auto-played e5 land
        expect(screen.getByText('Move 2 of 8')).toBeInTheDocument()
        expect(screen.queryByText(/miss/)).not.toBeInTheDocument() // no mistake was possible — the user never moved
      })

      it('a black-repertoire line auto-plays White\'s opening move before the user does anything', () => {
        const { container } = render(<OpeningsPage />)
        fireEvent.click(screen.getByText('Black'))
        expandLevel('beginner')
        fireEvent.click(screen.getByText('Philidor Defence'))
        for (let i = 0; i < 16; i++) fireEvent.click(screen.getByText('Next ▶'))
        fireEvent.click(screen.getByText('Try it yourself →'))

        // White's e4 must already be on the board with no user input at all —
        // e2 empty, e4 holds a white pawn.
        expect(container.querySelector('[data-square="e2"] [data-piece]')).not.toBeInTheDocument()
        expect(container.querySelector('[data-square="e4"] [data-piece="wP"]')).toBeInTheDocument()

        // The user only ever plays Black's replies from here. If White's Nf3
        // hadn't actually auto-played internally, it would still be White's
        // turn and this d7-d6 click would silently fail to register at all
        // (clicking a piece on the wrong side to move is a no-op — see the
        // click-to-move mechanics covered elsewhere in this file) — so
        // reaching "Move 3 of 8" is itself proof the auto-play landed.
        click(container, 'e7'); click(container, 'e5')
        act(() => { vi.advanceTimersByTime(600) }) // White's Nf3 auto-plays
        click(container, 'd7'); click(container, 'd6')
        expect(screen.getByText('Move 3 of 8')).toBeInTheDocument()
      })
    })
  })
})

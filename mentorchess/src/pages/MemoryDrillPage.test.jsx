import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Chess } from 'chess.js'
import MemoryDrillPage from './MemoryDrillPage'
import { TRAPS } from '../data/traps'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

// The session is randomly shuffled from the trap pool, so which trap ends
// up on screen isn't controllable directly — read its name off the DOM,
// look it up in TRAPS, and replay its own moves through chess.js to get
// real (from, to) squares for each ply, rather than hardcoding one trap
// and hoping the shuffle picks it. Filtered to White traps (colorFilter:
// 'white' below) means the "hero" color is always White here, so only the
// even-indexed plies are ever user-drilled — Black's replies auto-play via
// the component's own 500ms setTimeout, same as OpeningsPage's TrapStudy.
function solveDrillCard(container) {
  const nameEl = container.querySelector('.w-56 .font-bold.text-white')
  const trap = TRAPS.find(t => t.name === nameEl.textContent)
  const chess = new Chess(trap.fen)
  const plies = trap.moves.map(san => {
    const move = chess.move(san)
    return { from: move.from, to: move.to }
  })
  return { trap, whiteMoves: plies.filter((_, i) => i % 2 === 0) }
}

describe('MemoryDrillPage', () => {
  it('shows the setup screen by default', () => {
    render(<MemoryDrillPage />)
    expect(screen.getByText('Remember Moves')).toBeInTheDocument()
    expect(screen.getByText('Start Drill')).toBeInTheDocument()
  })

  it('the trap-count stepper increments/decrements through the fixed size list', () => {
    render(<MemoryDrillPage />)
    expect(screen.getByText('10')).toBeInTheDocument() // default
    fireEvent.click(screen.getByText('+'))
    expect(screen.getByText('20')).toBeInTheDocument()
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('−'))
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('the stepper does not go below the smallest size', () => {
    render(<MemoryDrillPage />)
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('−'))
    expect(screen.getByText('5')).toBeInTheDocument()
    fireEvent.click(screen.getByText('−')) // one click past the minimum
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('starting a drill filtered to White traps at the smallest size (5) shows 1/5', () => {
    render(<MemoryDrillPage />)
    fireEvent.click(screen.getByText('♔ White'))
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('−')) // step down to 5, the smallest preset
    fireEvent.click(screen.getByText('Start Drill'))
    expect(screen.getByText('1/5')).toBeInTheDocument()
  })

  // Fake timers make the auto-played Black reply (a real setTimeout inside
  // the component) deterministic and instant instead of racing a fixed
  // real-clock delay, which was flaky under full-suite CPU contention.
  describe('with the auto-played opponent reply', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('playing the correct moves for the shown trap completes the card', () => {
      const { container } = render(<MemoryDrillPage />)
      fireEvent.click(screen.getByText('♔ White'))
      fireEvent.click(screen.getByText('−'))
      fireEvent.click(screen.getByText('−')) // size 5
      fireEvent.click(screen.getByText('Start Drill'))

      const { trap, whiteMoves } = solveDrillCard(container)
      whiteMoves.forEach(({ from, to }, i) => {
        click(container, from)
        click(container, to)
        if (i < whiteMoves.length - 1) {
          act(() => { vi.advanceTimersByTime(500) }) // let Black's auto-played reply land
        }
      })
      // A drill can end on either side's move — an even total move count
      // means the last ply is Black's, still pending as one final
      // auto-played reply after the last White click above.
      if (trap.moves.length % 2 === 0) {
        act(() => { vi.advanceTimersByTime(500) })
      }

      // "Perfect" renders as soon as `done` is set — no need to advance the
      // trailing 700ms timer that only schedules onResult() (which would
      // advance to the next card/results screen and blow away this assertion).
      expect(screen.getByText('Perfect')).toBeInTheDocument()
    })
  })

  it('Skip advances to the next card and records a non-passed result', () => {
    render(<MemoryDrillPage />)
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('−')) // size 5
    fireEvent.click(screen.getByText('Start Drill'))

    expect(screen.getByText('1/5')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Skip →'))
    expect(screen.getByText('2/5')).toBeInTheDocument()
  })

  it('skipping every card reaches the results screen', () => {
    render(<MemoryDrillPage />)
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('−')) // size 5
    fireEvent.click(screen.getByText('Start Drill'))

    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('Skip →'))

    expect(screen.getByText('Your Results')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 of 5 correct from memory')).toBeInTheDocument()
  })

  it('New Setup from results returns to the setup screen', () => {
    render(<MemoryDrillPage />)
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('−'))
    fireEvent.click(screen.getByText('Start Drill'))
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('Skip →'))
    fireEvent.click(screen.getByText('New Setup'))
    expect(screen.getByText('Start Drill')).toBeInTheDocument()
  })
})

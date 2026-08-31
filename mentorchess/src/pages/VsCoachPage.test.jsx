import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VsCoachPage from './VsCoachPage'

// Minimal mock of the Stockfish Worker. Captures the latest instance and every message
// posted to it, so a test can drive its onmessage handler directly — simulating a UCI
// handshake/bestmove reply arriving asynchronously, including (deliberately) after the
// component has unmounted and called worker.terminate(). Real Worker.terminate() doesn't
// retroactively cancel a message that already arrived/queued, so this reproduces that
// race rather than the (already-handled-by-clearTimeout) handshake-timeout path.
//
// Note: React 19 no longer warns on setState-after-unmount (state updates on a detached
// fiber are simply no-ops), so a "did it throw/warn" assertion can't detect this bug.
// Instead we assert on an observable side effect of makeAiMove() actually running:
// whether it posts 'go depth ...' to the worker to request a move evaluation.
//
// GameScreen now constructs a SECOND worker (LiveEvalEngine, for Analysis Mode) once
// mode flips to 'analysis' — `workerInstances` captures every instance in construction
// order (index 0 is always the AI-opponent's, created on mount; index 1, when it exists,
// is the live-eval one), while `lastWorkerInstance` keeps its original meaning for the
// pre-existing tests below (which never touch Analysis Mode, so only one worker ever
// exists in them).
let lastWorkerInstance = null
let workerInstances = []
class FakeWorker {
  constructor() {
    this.onmessage = null
    this.terminated = false
    this.postedMessages = []
    lastWorkerInstance = this
    workerInstances.push(this)
  }
  postMessage(msg) {
    this.postedMessages.push(msg)
  }
  terminate() {
    this.terminated = true
  }
}

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe('VsCoachPage', () => {
  let originalWorker

  beforeEach(() => {
    originalWorker = globalThis.Worker
    globalThis.Worker = FakeWorker
    lastWorkerInstance = null
    workerInstances = []
  })

  afterEach(() => {
    cleanup()
    globalThis.Worker = originalWorker
    vi.useRealTimers()
  })

  it('mounts into the setup screen without throwing', () => {
    render(<VsCoachPage />)
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })

  it('does not throw or update state after unmount when the AI-moves-first path is pending', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)

    // Play as Black so the AI (white) moves first via the worker handshake.
    await user.click(screen.getByText('♚ Black'))
    await user.click(screen.getByText('Start Game'))

    expect(screen.getByText(/Coach ·/)).toBeInTheDocument()

    // Unmount before the worker ever replies to the 'uci' handshake message.
    expect(() => cleanup()).not.toThrow()
  })

  it('does not run the AI-move pipeline (or touch game state) when a worker reply arrives after unmount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<VsCoachPage />)

    await user.click(screen.getByText('♚ Black'))
    await user.click(screen.getByText('Start Game'))

    const worker = lastWorkerInstance
    expect(worker).not.toBeNull()

    unmount()
    worker.postedMessages.length = 0 // clear the initial handshake's 'uci' message

    // Simulate the worker's UCI handshake completing AFTER the component has
    // unmounted — a real race, since worker.terminate() does not retroactively cancel
    // an in-flight/queued message. The 'readyok' handler is what calls makeAiMove();
    // with the isMounted guard, makeAiMove() should bail out immediately and never
    // reach getBestMove(), so no 'go depth ...' message should ever be posted.
    expect(() => {
      worker.onmessage({ data: 'uciok' })
      worker.onmessage({ data: 'readyok' })
    }).not.toThrow()

    // Let the makeAiMove() promise chain settle before asserting.
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(worker.postedMessages.some(m => m.startsWith('go depth'))).toBe(false)
  })

  it('defaults to Focus mode, with the sidebar showing status/moves but no analysis content', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)
    await user.click(screen.getByText('Start Game')) // default White

    expect(screen.getByText('🎯 Focus')).toHaveClass('bg-gold')
    expect(screen.getByText('No moves yet')).toBeInTheDocument() // MoveLedger stays visible
    expect(screen.queryByText('Scratch notes for this game…')).not.toBeInTheDocument()
  })

  it('switching to Analysis mode reveals the notes textarea', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)
    await user.click(screen.getByText('Start Game'))

    fireEvent.click(screen.getByText('🔍 Analysis'))
    expect(screen.getByPlaceholderText('Scratch notes for this game…')).toBeInTheDocument()
  })

  it('Analysis mode shows the live eval bar once the mocked engine responds', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)
    await user.click(screen.getByText('Start Game'))
    fireEvent.click(screen.getByText('🔍 Analysis'))

    const liveEvalWorker = workerInstances[1]
    expect(liveEvalWorker).toBeTruthy()
    act(() => {
      liveEvalWorker.onmessage({ data: 'uciok' })
      liveEvalWorker.onmessage({ data: 'readyok' })
    })
    await flush() // let sfReady propagate and the evaluate() effect post its request
    act(() => {
      liveEvalWorker.onmessage({ data: 'info depth 16 multipv 1 score cp 45 pv e2e4 e7e5' })
      liveEvalWorker.onmessage({ data: 'bestmove e2e4' })
    })

    expect(await screen.findByText('+0.5')).toBeInTheDocument()
  })

  it('a large eval gap between the top two lines triggers the tactical-opportunity callout', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)
    await user.click(screen.getByText('Start Game'))
    fireEvent.click(screen.getByText('🔍 Analysis'))

    const liveEvalWorker = workerInstances[1]
    act(() => {
      liveEvalWorker.onmessage({ data: 'uciok' })
      liveEvalWorker.onmessage({ data: 'readyok' })
    })
    await flush()
    act(() => {
      liveEvalWorker.onmessage({ data: 'info depth 16 multipv 1 score cp 500 pv e2e4 e7e5' })
      liveEvalWorker.onmessage({ data: 'info depth 16 multipv 2 score cp 20 pv d2d4 d7d5' })
      liveEvalWorker.onmessage({ data: 'bestmove e2e4' })
    })

    expect(await screen.findByText('🔥 Tactical opportunity')).toBeInTheDocument()
  })

  it('a completed move glows the last-move squares on the board', async () => {
    const user = userEvent.setup()
    const { container } = render(<VsCoachPage />)
    await user.click(screen.getByText('Start Game')) // White plays first

    const square = (id) => container.querySelector(`[data-square="${id}"]`)
    fireEvent.click(square('e2'))
    fireEvent.click(square('e4'))

    const e4Inner = square('e4').querySelector('div')
    expect(e4Inner.style.animation).toContain('last-move-glow')
  })

  it('notes persist within a game and clear when a new game starts', async () => {
    const user = userEvent.setup()
    render(<VsCoachPage />)
    await user.click(screen.getByText('Start Game'))
    fireEvent.click(screen.getByText('🔍 Analysis'))

    const textarea = screen.getByPlaceholderText('Scratch notes for this game…')
    fireEvent.change(textarea, { target: { value: 'watch e5' } })
    expect(textarea).toHaveValue('watch e5')

    fireEvent.click(screen.getByText('↺ Resign')) // back to setup — GameScreen unmounts
    await user.click(screen.getByText('Start Game')) // fresh GameScreen, notes reset for free
    fireEvent.click(screen.getByText('🔍 Analysis'))

    expect(screen.getByPlaceholderText('Scratch notes for this game…')).toHaveValue('')
  })

  it('the elapsed-time timer increments while a game is in progress', () => {
    vi.useFakeTimers()
    render(<VsCoachPage />)
    fireEvent.click(screen.getByText('Start Game')) // default White, no AI-first-move complexity
    act(() => { vi.advanceTimersByTime(3000) })

    // The ⏱ glyph now lives in its own (ambient clock-tick) span, so the
    // full "⏱ 00:03" string is split across elements — match on either
    // piece individually rather than the combined text.
    expect(screen.getByText('⏱')).toBeInTheDocument()
    expect(screen.getByText('00:03', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('⏱')).toHaveClass('clock-tick')
  })
})

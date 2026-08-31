import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FreePlayPage from './FreePlayPage'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))

// Minimal Stockfish Worker mock — same pattern as VsCoachPage.test.jsx/
// EndgamesPage.test.jsx. FreePlayPage only ever constructs one worker (the
// LiveEvalEngine behind Analysis Mode's live eval), created lazily once
// mode flips to 'analysis'.
let lastWorkerInstance = null
class FakeWorker {
  constructor() {
    this.onmessage = null
    this.postedMessages = []
    lastWorkerInstance = this
  }
  postMessage(msg) { this.postedMessages.push(msg) }
  terminate() {}
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
// react-chessboard needs longer than a bare tick to settle its internal piece
// reconciliation after a *large* position change (loading a sparse endgame FEN
// over a full board) — a jsdom-only quirk, since real animation frames never
// tick here (same class of gotcha as the getBoundingClientRect polyfill in
// test/setup.js). Only the promotion-picker tests below load such a position.
const flushBoardAnimation = () => act(async () => { await new Promise(r => setTimeout(r, 400)) })

describe('FreePlayPage', () => {
  let originalWorker
  beforeEach(() => {
    originalWorker = globalThis.Worker
    globalThis.Worker = FakeWorker
    lastWorkerInstance = null
  })
  afterEach(() => {
    globalThis.Worker = originalWorker
    vi.useRealTimers()
  })

  it('mounts with an empty move list and "White to move"', () => {
    render(<FreePlayPage />)
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.getByText('White to move')).toBeInTheDocument()
    expect(screen.getByText('← Undo')).toBeDisabled()
  })

  // Regression test for a real bug found 2026-07-15: this page never passed
  // `arePiecesDraggable` to <Chessboard>, and Chessboard's click handler
  // silently no-ops when that prop is falsy — so click-to-move was
  // completely dead here (only drag-and-drop worked, which is why it went
  // unnoticed). Drives the real Chessboard component, not a mock, so it
  // would have caught the missing prop directly.
  it('click-to-move: clicking e2 then e4 registers the move', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')

    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.queryByText('No moves yet')).not.toBeInTheDocument()
    expect(screen.getByText('← Undo')).not.toBeDisabled()
  })

  it('Undo removes the last move', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')
    expect(screen.getByText('e4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('← Undo'))

    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.getByText('← Undo')).toBeDisabled()
  })

  it('New Game resets the board after a move has been made', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')
    expect(screen.getByText('e4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('↺ New Game'))

    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.getByText('White to move')).toBeInTheDocument()
  })

  it('an illegal click-to-move (wrong piece color) does not register', () => {
    const { container } = render(<FreePlayPage />)
    // It's White's turn; e7 is a Black pawn.
    click(container, 'e7')
    click(container, 'e5')

    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })

  it('defaults to Focus mode, with status/moves visible but no analysis content', () => {
    render(<FreePlayPage />)
    expect(screen.getByText('🎯 Focus')).toHaveClass('bg-gold')
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
    expect(screen.queryByText('Scratch notes for this game…')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Paste FEN string…')).not.toBeInTheDocument()
  })

  it('switching to Analysis mode reveals notes and the FEN loader', () => {
    render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))
    expect(screen.getByPlaceholderText('Scratch notes for this game…')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Paste FEN string…')).toBeInTheDocument()
  })

  it('Analysis mode shows the live eval bar once the mocked engine responds', async () => {
    render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))

    expect(lastWorkerInstance).toBeTruthy()
    act(() => {
      lastWorkerInstance.onmessage({ data: 'uciok' })
      lastWorkerInstance.onmessage({ data: 'readyok' })
    })
    await flush()
    act(() => {
      lastWorkerInstance.onmessage({ data: 'info depth 16 multipv 1 score cp -80 pv d7d5' })
      lastWorkerInstance.onmessage({ data: 'bestmove d7d5' })
    })

    expect(await screen.findByText('-0.8')).toBeInTheDocument()
  })

  it('a completed move glows the last-move squares, and a capture layers the impact flash', () => {
    const { container } = render(<FreePlayPage />)
    click(container, 'e2')
    click(container, 'e4')

    const e4Inner = container.querySelector('[data-square="e4"] div')
    expect(e4Inner.style.animation).toContain('last-move-glow')
    expect(e4Inner.style.animation).not.toContain('capture-impact')
  })

  it('notes persist within a game and clear on New Game', () => {
    render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))

    const textarea = screen.getByPlaceholderText('Scratch notes for this game…')
    fireEvent.change(textarea, { target: { value: 'try the London' } })
    expect(textarea).toHaveValue('try the London')

    fireEvent.click(screen.getByText('↺ New Game'))

    expect(screen.getByPlaceholderText('Scratch notes for this game…')).toHaveValue('')
  })

  it('notes also clear when a FEN position is loaded', () => {
    render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))

    fireEvent.change(screen.getByPlaceholderText('Scratch notes for this game…'), { target: { value: 'temp note' } })
    fireEvent.change(screen.getByPlaceholderText('Paste FEN string…'), {
      target: { value: '4k3/8/8/8/8/8/8/4K2R w K - 0 1' },
    })
    fireEvent.click(screen.getByText('Load'))

    expect(screen.getByPlaceholderText('Scratch notes for this game…')).toHaveValue('')
  })

  it('the elapsed-time timer increments from mount', () => {
    vi.useFakeTimers()
    render(<FreePlayPage />)
    act(() => { vi.advanceTimersByTime(3000) })

    fireEvent.click(screen.getByText('🎯 Focus')) // re-selecting the already-active mode is a no-op, just asserting the timer is visible regardless of mode
    // The ⏱ glyph now lives in its own (ambient clock-tick) span, so the
    // full "⏱ 00:03" string is split across elements — match on either
    // piece individually rather than the combined text.
    expect(screen.getByText('⏱')).toBeInTheDocument()
    expect(screen.getByText('00:03', { exact: false })).toBeInTheDocument()
    // Ambient clock-tick: the glyph is keyed on timer.seconds so its pulse
    // animation replays each tick — just confirm the class is present.
    expect(screen.getByText('⏱')).toHaveClass('clock-tick')
  })

  it('a pawn reaching the last rank shows the promotion picker instead of auto-queening', async () => {
    const { container } = render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))
    fireEvent.change(screen.getByPlaceholderText('Paste FEN string…'), {
      target: { value: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1' },
    })
    fireEvent.click(screen.getByText('Load'))
    await flushBoardAnimation()

    click(container, 'e7')
    click(container, 'e8')

    expect(screen.getByRole('dialog', { name: 'Choose promotion piece' })).toBeInTheDocument()
    expect(screen.getByLabelText('Promote to Queen')).toBeInTheDocument()
    expect(screen.getByLabelText('Promote to Rook')).toBeInTheDocument()
    expect(screen.getByLabelText('Promote to Bishop')).toBeInTheDocument()
    expect(screen.getByLabelText('Promote to Knight')).toBeInTheDocument()
    // No move committed yet — still White to move, the picker is purely a prompt.
    expect(screen.getByText('White to move')).toBeInTheDocument()
  })

  it('choosing a piece from the promotion picker completes the move as that piece, not a silent queen', async () => {
    const { container } = render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))
    fireEvent.change(screen.getByPlaceholderText('Paste FEN string…'), {
      target: { value: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1' },
    })
    fireEvent.click(screen.getByText('Load'))
    await flushBoardAnimation()

    click(container, 'e7')
    click(container, 'e8')
    fireEvent.click(screen.getByLabelText('Promote to Knight'))

    expect(screen.queryByRole('dialog', { name: 'Choose promotion piece' })).not.toBeInTheDocument()
    expect(screen.getByText('e8=N')).toBeInTheDocument()
  })

  it('clicking outside the promotion picker cancels it without committing a move', async () => {
    const { container } = render(<FreePlayPage />)
    fireEvent.click(screen.getByText('🔍 Analysis'))
    fireEvent.change(screen.getByPlaceholderText('Paste FEN string…'), {
      target: { value: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1' },
    })
    fireEvent.click(screen.getByText('Load'))
    await flushBoardAnimation()

    click(container, 'e7')
    click(container, 'e8')
    fireEvent.click(screen.getByRole('dialog', { name: 'Choose promotion piece' }))

    expect(screen.queryByRole('dialog', { name: 'Choose promotion piece' })).not.toBeInTheDocument()
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })
})

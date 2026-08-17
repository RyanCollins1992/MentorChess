import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import EndgamesPage from './EndgamesPage'
import { useAppStore } from '../store/useAppStore'

const click = (container, id) => fireEvent.click(container.querySelector(`[data-square="${id}"]`))
// "Moves: N" is split across a parent span and a nested count span, and
// board coordinate labels ("1"–"8") make plain getByText('1')-style
// assertions ambiguous — read the dedicated stats line's own textContent.
const movesLine = (container) => container.querySelector('.mt-3.flex.items-center.justify-between.text-sm').textContent

// Same minimal Stockfish Worker fake VsCoachPage.test.jsx uses — captures the
// latest instance so a test can drive its onmessage handler directly to
// simulate the UCI handshake + bestmove reply.
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
const flush = () => act(() => new Promise(resolve => setTimeout(resolve, 0)))

describe('EndgamesPage', () => {
  let originalWorker
  beforeEach(() => {
    originalWorker = globalThis.Worker
    globalThis.Worker = FakeWorker
    lastWorkerInstance = null
  })
  afterEach(() => {
    globalThis.Worker = originalWorker
  })

  it('shows a placeholder until a scenario is selected', () => {
    render(<EndgamesPage />)
    expect(screen.getByText('Select an endgame')).toBeInTheDocument()
  })

  it('selecting a scenario shows the board, task, par and max moves', () => {
    const { container } = render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))
    expect(screen.getAllByText('Checkmate the black king').length).toBeGreaterThan(0)
    expect(movesLine(container)).toContain('Par: 10')
    expect(movesLine(container)).toContain('Max: 20')
  })

  it('a legal move increments the move counter, and the opponent auto-replies', async () => {
    const { container } = render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))

    // Queen d1 -> d3: legal, non-capturing, not check, not a mating move.
    click(container, 'd1')
    click(container, 'd3')
    expect(movesLine(container)).toContain('Moves: 1')

    await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)) }) // opponent's random reply lands ~500ms later
    expect(movesLine(container)).toContain('Moves: 2')
  })

  it('Restart resets the move counter back to 0', () => {
    const { container } = render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))

    click(container, 'd1')
    click(container, 'd3')
    expect(movesLine(container)).toContain('Moves: 1')

    fireEvent.click(screen.getByText('↺ Restart'))
    expect(movesLine(container)).toContain('Moves: 0')
  })

  it('New Position cycles to a different starting setup and resets the move counter', () => {
    const { container } = render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))
    click(container, 'd1')
    click(container, 'd3')
    expect(movesLine(container)).toContain('Moves: 1')

    fireEvent.click(screen.getByRole('button', { name: /New Position \(1\/3\)/ }))
    expect(movesLine(container)).toContain('Moves: 0')
    expect(screen.getByRole('button', { name: /New Position \(2\/3\)/ })).toBeInTheDocument()
  })

  it('New Position wraps back to the first variation label after cycling through all of them', () => {
    render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))

    const cycle = () => fireEvent.click(screen.getByRole('button', { name: /New Position/ }))
    cycle(); cycle(); cycle()
    expect(screen.getByRole('button', { name: /New Position \(1\/3\)/ })).toBeInTheDocument()
  })

  it('switching to a different scenario remounts with a fresh move counter', () => {
    const { container } = render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))
    click(container, 'd1')
    click(container, 'd3')
    expect(movesLine(container)).toContain('Moves: 1')

    fireEvent.click(screen.getByText('K+R vs K'))
    expect(movesLine(container)).toContain('Moves: 0')
    expect(movesLine(container)).toContain('Max: 25')
  })

  it('the hint button escalates from a glowing square to an arrow across two clicks', async () => {
    render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))

    fireEvent.click(screen.getByRole('button', { name: /Show the piece/ }))
    expect(await screen.findByRole('button', { name: /Thinking/ })).toBeInTheDocument()

    const worker = lastWorkerInstance
    expect(worker).not.toBeNull()
    act(() => {
      worker.onmessage({ data: 'uciok' })
      worker.onmessage({ data: 'readyok' })
    })
    await flush() // let ensureHintEngine's promise settle and getBestMove() post its request
    act(() => {
      worker.onmessage({ data: 'bestmove d1d4' })
    })
    await flush()

    expect(await screen.findByRole('button', { name: /Show the move/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Show the move/ }))
    expect(await screen.findByRole('button', { name: /💡 Hint/ })).toBeInTheDocument()
  })

  it('shows an unavailable-hint-engine toast when the Worker cannot be constructed', async () => {
    globalThis.Worker = class { constructor() { throw new Error('no worker support') } }
    render(<EndgamesPage />)
    fireEvent.click(screen.getByText('K+Q vs K'))

    fireEvent.click(screen.getByRole('button', { name: /Show the piece/ }))

    await screen.findByRole('button', { name: /Show the piece/ }) // reverts once the promise resolves false
    expect(useAppStore.getState().toast?.message).toBe('⚠️ Hint engine unavailable — see the tip above instead')
  })
})

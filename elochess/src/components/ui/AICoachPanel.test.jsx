import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AICoachPanel from './AICoachPanel'
import { aiCoach } from '../../core/AICoach'

describe('AICoachPanel', () => {
  beforeEach(() => {
    aiCoach.clearHistory()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the floating action button when closed', () => {
    render(<AICoachPanel open={false} onClose={() => {}} onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: '♞' })).toBeInTheDocument()
  })

  // The panel itself is always in the DOM (CSS-transitions scale/opacity
  // rather than mount/unmount, per the component's own comment about
  // "origin-bottom-right" animation) — closed means visually hidden and
  // non-interactive, not absent, so that's what's worth pinning here.
  it('the panel is non-interactive (pointer-events-none) while closed', () => {
    const { container } = render(<AICoachPanel open={false} onClose={() => {}} onOpen={() => {}} />)
    const panel = container.querySelector('.fixed.bottom-4.right-4.z-50')
    expect(panel.className).toContain('pointer-events-none')
  })

  it('shows the panel with the initial greeting when open', () => {
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)
    expect(screen.getByText('AI Chess Coach')).toBeInTheDocument()
    expect(screen.getByText(/Hi! I'm your AI chess coach/)).toBeInTheDocument()
  })

  it('sends a message on Enter and renders the reply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Control the centre.' } }] }),
    }))
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)

    const textarea = screen.getByPlaceholderText('Ask anything about chess…')
    fireEvent.change(textarea, { target: { value: 'What should I play?' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(screen.getByText('What should I play?')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Control the centre.')).toBeInTheDocument())
    // The input clears once the message is sent, not just once the reply arrives.
    expect(textarea).toHaveValue('')
  })

  it('Shift+Enter does not send (allows a newline instead)', () => {
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)
    const textarea = screen.getByPlaceholderText('Ask anything about chess…')
    fireEvent.change(textarea, { target: { value: 'multi\nline' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    // Still just the one greeting message — nothing was sent.
    expect(screen.queryByText('multi\nline')).not.toBeInTheDocument()
  })

  it('does not send an empty/whitespace-only message', () => {
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)
    const sendButton = screen.getByRole('button', { name: 'Send message' })
    expect(sendButton).toBeDisabled()
  })

  it('a quick-prompt button sends its text (minus the emoji prefix)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Sure, here is the position.' } }] }),
    }))
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)

    fireEvent.click(screen.getByText('💡 Explain position'))
    expect(screen.getByText('Explain position')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Sure, here is the position.')).toBeInTheDocument())
  })

  // AICoach.send() itself never rejects — it catches every internal error
  // and resolves with its own fallback string (see core/AICoach.js), so
  // AICoachPanel's own try/catch around aiCoach.send() never actually
  // triggers its "AI coach temporarily unavailable" text in practice. What
  // reaches the UI on a network failure is AICoach's own fallback message.
  it('shows AICoach\'s own fallback message when the request fails, not the panel\'s dead catch text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)

    const textarea = screen.getByPlaceholderText('Ask anything about chess…')
    fireEvent.change(textarea, { target: { value: 'hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText(/unable to connect right now/)).toBeInTheDocument())
    expect(screen.queryByText(/AI coach temporarily unavailable/)).not.toBeInTheDocument()
  })

  it('the clear-chat button resets to a fresh greeting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Some reply' } }] }),
    }))
    render(<AICoachPanel open onClose={() => {}} onOpen={() => {}} />)

    const textarea = screen.getByPlaceholderText('Ask anything about chess…')
    fireEvent.change(textarea, { target: { value: 'hello' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText('Some reply')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('Clear chat'))

    expect(screen.queryByText('Some reply')).not.toBeInTheDocument()
    expect(screen.getByText('Chat cleared! What would you like to know?')).toBeInTheDocument()
    expect(aiCoach.history).toEqual([])
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<AICoachPanel open onClose={onClose} onOpen={() => {}} />)
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Same reset pattern as useAppStore.test.js — useAppStore transitively owns
// singletons (progressManager) that read localStorage at import time, and
// OnboardingFlow reads settings.onboardingComplete directly off the store,
// so each test needs a genuinely fresh module graph, not just cleared
// localStorage under a stale already-imported store instance.
describe('OnboardingFlow', () => {
  let OnboardingFlow
  let useAppStore
  let progressManager

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    ;({ default: OnboardingFlow } = await import('./OnboardingFlow'))
    ;({ useAppStore } = await import('../../store/useAppStore'))
    ;({ progressManager } = await import('../../core/ProgressManager'))
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders the welcome step when onboarding has not been completed', () => {
    render(<OnboardingFlow />)
    expect(screen.getByText('Welcome to MentorChess')).toBeInTheDocument()
  })

  it('renders nothing once settings.onboardingComplete is set', () => {
    useAppStore.getState().updateSettings({ onboardingComplete: true })
    const { container } = render(<OnboardingFlow />)
    expect(container).toBeEmptyDOMElement()
  })

  it('skipping every step reaches Dashboard without setting an ELO or username', async () => {
    const user = userEvent.setup()
    render(<OnboardingFlow />)

    await user.click(screen.getByText('Get started'))
    expect(screen.getByText(/Connect Chess.com/)).toBeInTheDocument()
    await user.click(screen.getByText('Skip'))

    expect(screen.getByText("What's your current rating?")).toBeInTheDocument()
    await user.click(screen.getByText('Skip'))

    expect(screen.getByText("You're all set!")).toBeInTheDocument()
    await user.click(screen.getByText('Start training'))

    expect(useAppStore.getState().settings.onboardingComplete).toBe(true)
    expect(useAppStore.getState().settings.chesscomUsername).toBeUndefined()
    expect(useAppStore.getState().currentPage).toBe('dashboard')
  })

  it('manually entering an ELO records it via progressManager and is reflected in the store', async () => {
    const user = userEvent.setup()
    render(<OnboardingFlow />)

    await user.click(screen.getByText('Get started'))
    await user.click(screen.getByText('Skip')) // skip username
    await user.type(screen.getByPlaceholderText('e.g. 850'), '1200')
    await user.click(screen.getByText('Continue'))
    await user.click(screen.getByText('Start training'))

    expect(progressManager.currentElo).toBe(1200)
    expect(useAppStore.getState().progress.currentElo).toBe(1200)
  })

  it('rejects an out-of-range ELO instead of silently accepting it', async () => {
    const user = userEvent.setup()
    render(<OnboardingFlow />)

    await user.click(screen.getByText('Get started'))
    await user.click(screen.getByText('Skip'))
    await user.type(screen.getByPlaceholderText('e.g. 850'), '50')
    await user.click(screen.getByText('Continue'))

    // Still on the ELO step — an invalid value doesn't advance.
    expect(screen.getByText("What's your current rating?")).toBeInTheDocument()
  })

  it('a successful Chess.com lookup pre-fills the ELO step with the real rating', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chess_rapid: { last: { rating: 1875 } } }),
    })
    render(<OnboardingFlow />)

    await user.click(screen.getByText('Get started'))
    await user.type(screen.getByPlaceholderText('your username'), 'testplayer')
    await user.click(screen.getByText('Continue'))

    await waitFor(() => expect(screen.getByPlaceholderText('e.g. 850')).toHaveValue(1875))
    expect(screen.getByText(/We found your Chess.com rating/)).toBeInTheDocument()

    await user.click(screen.getByText('Continue'))
    await user.click(screen.getByText('Start training'))

    expect(progressManager.currentElo).toBe(1875)
    expect(useAppStore.getState().settings.chesscomUsername).toBe('testplayer')
  })

  it('a 404 (unknown username) falls through to a blank, manual ELO step', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValueOnce({ ok: false, status: 404 })
    render(<OnboardingFlow />)

    await user.click(screen.getByText('Get started'))
    await user.type(screen.getByPlaceholderText('your username'), 'nobodyhasthisname')
    await user.click(screen.getByText('Continue'))

    await waitFor(() => expect(screen.getByText("What's your current rating?")).toBeInTheDocument())
    expect(screen.getByPlaceholderText('e.g. 850')).toHaveValue(null)
    expect(screen.queryByText(/We found your Chess.com rating/)).not.toBeInTheDocument()
  })

  it('a network failure during lookup also falls through gracefully, not an unhandled rejection', async () => {
    const user = userEvent.setup()
    fetch.mockRejectedValueOnce(new Error('network down'))
    render(<OnboardingFlow />)

    await user.click(screen.getByText('Get started'))
    await user.type(screen.getByPlaceholderText('your username'), 'testplayer')
    await user.click(screen.getByText('Continue'))

    await waitFor(() => expect(screen.getByText("What's your current rating?")).toBeInTheDocument())
    expect(screen.getByPlaceholderText('e.g. 850')).toHaveValue(null)
  })
})

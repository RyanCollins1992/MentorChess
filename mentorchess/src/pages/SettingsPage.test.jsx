import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SettingsPage from './SettingsPage'
import { useAppStore } from '../store/useAppStore'
import { progressManager } from '../core/ProgressManager'

describe('SettingsPage', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: { darkMode: false, pieceStyle: 'classic', showCoords: true, animateMoves: true, sounds: true, autoAdvance: true, showHints: true, dailyTarget: 20, chesscomUsername: '' },
      toast: null,
    })
    localStorage.removeItem('mentorchess-analytics-consent')
  })

  it('shows the current ELO from ProgressManager in the input', () => {
    render(<SettingsPage />)
    expect(screen.getByPlaceholderText('e.g. 850')).toHaveValue(progressManager.currentElo)
  })

  it('saving a valid ELO records it and refreshes the store', () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByPlaceholderText('e.g. 850'), { target: { value: '1200' } })
    fireEvent.click(screen.getByText('Save'))

    expect(progressManager.currentElo).toBe(1200)
    expect(useAppStore.getState().progress.currentElo).toBe(1200)
    expect(useAppStore.getState().toast.message).toBe('ELO updated!')
  })

  it('rejects an out-of-range ELO', () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByPlaceholderText('e.g. 850'), { target: { value: '50' } })
    fireEvent.click(screen.getByText('Save'))

    expect(useAppStore.getState().toast.message).toBe('Enter a valid ELO (100–3000)')
  })

  it('blurring the Chess.com username field saves it', () => {
    render(<SettingsPage />)
    fireEvent.blur(screen.getByPlaceholderText('your username'), { target: { value: 'hikaru' } })
    expect(useAppStore.getState().settings.chesscomUsername).toBe('hikaru')
  })

  it('toggling Dark mode updates the setting', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Dark mode').closest('div').parentElement.parentElement.querySelector('button'))
    expect(useAppStore.getState().settings.darkMode).toBe(true)
  })

  it('picking a piece style updates the setting and highlights it', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Fantasy'))
    expect(useAppStore.getState().settings.pieceStyle).toBe('fantasy')
    expect(screen.getByText('Fantasy').className).toContain('text-gold')
  })

  it('toggling Show coordinates updates the setting', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Show coordinates').closest('div').parentElement.parentElement.querySelector('button'))
    expect(useAppStore.getState().settings.showCoords).toBe(false)
  })

  it('changing the daily review target updates the setting and highlights it', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('50/day'))
    expect(useAppStore.getState().settings.dailyTarget).toBe(50)
    expect(screen.getByText('50/day')).toHaveClass('border-gold')
  })

  it('shows the stats bento grid sourced from ProgressManager/SRS', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Day streak')).toBeInTheDocument()
    expect(screen.getByText('Total XP')).toBeInTheDocument()
    expect(screen.getByText('SRS cards')).toBeInTheDocument()
  })

  it('links to the privacy policy', () => {
    render(<SettingsPage />)
    const link = screen.getByText('Privacy Policy')
    expect(link.closest('a')).toHaveAttribute('href', '/privacy.html')
  })

  it('links to the terms of use', () => {
    render(<SettingsPage />)
    const link = screen.getByText('Terms of Use')
    expect(link.closest('a')).toHaveAttribute('href', '/terms.html')
  })

  it('links feedback to a mailto address', () => {
    render(<SettingsPage />)
    const link = screen.getByText('Send feedback')
    expect(link.closest('a')).toHaveAttribute('href', 'mailto:MentorChessHelp@gmail.com?subject=MentorChess%20feedback')
  })

  it('links advertising inquiries to a mailto address', () => {
    render(<SettingsPage />)
    const link = screen.getByText('Get in touch')
    expect(link.closest('a')).toHaveAttribute('href', 'mailto:MentorChessHelp@gmail.com?subject=MentorChess%20advertising%20inquiry')
  })

  it('the Analytics toggle is off by default (no consent decision yet)', () => {
    render(<SettingsPage />)
    const toggle = screen.getByText('Analytics').closest('div').parentElement.parentElement.querySelector('button')
    expect(toggle.className).not.toContain('bg-gold')
  })

  it('turning Analytics on records acceptance in localStorage', () => {
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Analytics').closest('div').parentElement.parentElement.querySelector('button'))
    expect(localStorage.getItem('mentorchess-analytics-consent')).toBe('accepted')
  })

  it('turning Analytics off after accepting records the rejection', () => {
    localStorage.setItem('mentorchess-analytics-consent', 'accepted')
    render(<SettingsPage />)
    fireEvent.click(screen.getByText('Analytics').closest('div').parentElement.parentElement.querySelector('button'))
    expect(localStorage.getItem('mentorchess-analytics-consent')).toBe('rejected')
  })
})

describe('SettingsPage — reset all progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.setItem('probe', 'still-here')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('holding the reset button for the full duration clears localStorage', () => {
    render(<SettingsPage />)
    const holdBtn = screen.getByText('Hold to reset all progress')
    fireEvent.mouseDown(holdBtn)
    act(() => { vi.advanceTimersByTime(600) })

    expect(localStorage.getItem('probe')).toBeNull()
  })

  it('releasing early cancels the hold and leaves data intact', () => {
    render(<SettingsPage />)
    const holdBtn = screen.getByText('Hold to reset all progress')
    fireEvent.mouseDown(holdBtn)
    act(() => { vi.advanceTimersByTime(300) })
    fireEvent.mouseUp(holdBtn)
    act(() => { vi.advanceTimersByTime(300) })

    expect(localStorage.getItem('probe')).toBe('still-here')
  })
})

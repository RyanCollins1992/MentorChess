import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConsentBanner from './ConsentBanner'

describe('ConsentBanner', () => {
  beforeEach(() => {
    localStorage.removeItem('mentorchess-analytics-consent')
  })

  it('shows the banner when no choice has been made yet', () => {
    render(<ConsentBanner />)
    expect(screen.getByText('Accept')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('does not render when a choice was already made in a previous session', () => {
    localStorage.setItem('mentorchess-analytics-consent', 'accepted')
    render(<ConsentBanner />)
    expect(screen.queryByText('Accept')).not.toBeInTheDocument()
  })

  it('clicking Accept records consent and hides the banner', () => {
    render(<ConsentBanner />)
    fireEvent.click(screen.getByText('Accept'))
    expect(localStorage.getItem('mentorchess-analytics-consent')).toBe('accepted')
    expect(screen.queryByText('Accept')).not.toBeInTheDocument()
  })

  it('clicking Reject records the rejection (not a soft dismiss) and hides the banner', () => {
    render(<ConsentBanner />)
    fireEvent.click(screen.getByText('Reject'))
    expect(localStorage.getItem('mentorchess-analytics-consent')).toBe('rejected')
    expect(screen.queryByText('Reject')).not.toBeInTheDocument()
  })

  it('links to the privacy policy', () => {
    render(<ConsentBanner />)
    const link = screen.getByText('Privacy Policy')
    expect(link.closest('a')).toHaveAttribute('href', '/privacy.html')
  })
})

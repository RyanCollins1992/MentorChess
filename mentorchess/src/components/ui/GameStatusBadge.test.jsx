import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GameStatusBadge from './GameStatusBadge'

describe('GameStatusBadge', () => {
  it('renders the given text', () => {
    render(<GameStatusBadge text="White to move" tone="default" />)
    expect(screen.getByText('White to move')).toBeInTheDocument()
  })

  it('applies the check tone classes', () => {
    render(<GameStatusBadge text="Check!" tone="check" />)
    expect(screen.getByText('Check!')).toHaveClass('text-danger')
  })

  it('applies the default tone classes for a plain status', () => {
    render(<GameStatusBadge text="Black to move" tone="default" />)
    expect(screen.getByText('Black to move')).toHaveClass('text-muted')
  })

  // The "over" tone is the one case that renders via framer-motion instead
  // of a plain div (see the component's own comment: it's the app's only
  // "game complete" reveal moment) — the regression worth pinning is that
  // it still renders the text and tone classes like every other tone,
  // not just that it doesn't throw.
  it('renders the over tone (animated reveal) with its own classes', () => {
    render(<GameStatusBadge text="White wins!" tone="over" />)
    expect(screen.getByText('White wins!')).toHaveClass('text-gold')
  })
})

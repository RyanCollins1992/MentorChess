import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from './Badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Beginner</Badge>)
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('defaults to the muted tone and filled variant', () => {
    render(<Badge>msg</Badge>)
    expect(screen.getByText('msg')).toHaveClass('text-muted', 'bg-bg3')
  })

  it.each(['brass', 'sage', 'oxblood', 'muted'])('renders the %s tone without throwing', (tone) => {
    render(<Badge tone={tone}>msg</Badge>)
    expect(screen.getByText('msg')).toBeInTheDocument()
  })

  it('falls back to the muted tone for an unrecognized tone', () => {
    render(<Badge tone="not-a-real-tone">msg</Badge>)
    expect(screen.getByText('msg')).toHaveClass('text-muted')
  })

  it('applies solid-variant classes instead of outline/filled classes', () => {
    render(<Badge tone="brass" variant="solid">msg</Badge>)
    expect(screen.getByText('msg')).toHaveClass('bg-gold', 'text-bg')
  })

  it('renders a dot indicator only when dot is true', () => {
    const { container, rerender } = render(<Badge dot>msg</Badge>)
    expect(container.querySelector('span > span')).toBeInTheDocument()

    rerender(<Badge>msg</Badge>)
    expect(container.querySelector('span > span')).not.toBeInTheDocument()
  })
})

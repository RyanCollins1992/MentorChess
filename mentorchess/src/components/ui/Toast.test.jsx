import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toast from './Toast'

describe('Toast', () => {
  it('renders the message text', () => {
    render(<Toast message="Settings saved" type="success" />)
    expect(screen.getByText('Settings saved')).toBeInTheDocument()
  })

  it('defaults to the info tone when no type is given', () => {
    render(<Toast message="Hello" />)
    expect(screen.getByText('Hello')).toHaveClass('bg-accent')
  })

  it.each([
    ['success', 'bg-accent2'],
    ['error', 'bg-danger'],
    ['gold', 'bg-gold'],
  ])('applies the %s tone class', (type, expectedClass) => {
    render(<Toast message="msg" type={type} />)
    expect(screen.getByText('msg')).toHaveClass(expectedClass)
  })

  it('falls back to the info tone for an unrecognized type', () => {
    render(<Toast message="msg" type="not-a-real-type" />)
    expect(screen.getByText('msg')).toHaveClass('bg-accent')
  })
})

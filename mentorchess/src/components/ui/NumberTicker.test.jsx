import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NumberTicker from './NumberTicker'

describe('NumberTicker', () => {
  it('renders the initial value immediately (no animate-from-zero on mount)', () => {
    render(<NumberTicker value={1234} />)
    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('formats decimal places when requested', () => {
    render(<NumberTicker value={83.4} decimalPlaces={1} />)
    expect(screen.getByText('83.4')).toBeInTheDocument()
  })

  it('defaults to zero decimal places', () => {
    render(<NumberTicker value={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('applies the given className', () => {
    render(<NumberTicker value={500} className="tabular-nums text-2xl" />)
    expect(screen.getByText('500')).toHaveClass('tabular-nums', 'text-2xl')
  })

  it('re-renders without throwing when value changes', () => {
    const { rerender } = render(<NumberTicker value={500} />)
    rerender(<NumberTicker value={520} />)
    expect(screen.getByText('500') || screen.getByText('520')).toBeTruthy()
  })
})

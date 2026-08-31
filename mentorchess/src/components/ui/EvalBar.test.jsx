import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvalBar } from './EvalBar'

describe('EvalBar', () => {
  it('shows a positive eval with a + sign', () => {
    render(<EvalBar eval={150} />)
    expect(screen.getByText('+1.5')).toBeInTheDocument()
  })

  it('shows a negative eval with a - sign', () => {
    render(<EvalBar eval={-230} />)
    expect(screen.getByText('-2.3')).toBeInTheDocument()
  })

  it('shows a mate score as M<n>', () => {
    render(<EvalBar eval={9997} />) // encodeMateScore(3) = 10000-3
    expect(screen.getByText('+M3')).toBeInTheDocument()
  })

  it('a 0 eval renders the white-side bar at 50%', () => {
    const { container } = render(<EvalBar eval={0} />)
    const fill = container.querySelector('.bg-gold')
    expect(fill).toHaveStyle({ width: '50%' })
  })
})

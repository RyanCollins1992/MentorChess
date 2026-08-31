import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModeToggle from './ModeToggle'

describe('ModeToggle', () => {
  it('renders both mode options', () => {
    render(<ModeToggle mode="focus" onChange={() => {}} />)
    expect(screen.getByText('🎯 Focus')).toBeInTheDocument()
    expect(screen.getByText('🔍 Analysis')).toBeInTheDocument()
  })

  it('highlights the active mode', () => {
    render(<ModeToggle mode="focus" onChange={() => {}} />)
    expect(screen.getByText('🎯 Focus')).toHaveClass('bg-gold')
    expect(screen.getByText('🔍 Analysis')).not.toHaveClass('bg-gold')
  })

  it('calls onChange with the clicked mode id', () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="focus" onChange={onChange} />)
    fireEvent.click(screen.getByText('🔍 Analysis'))
    expect(onChange).toHaveBeenCalledWith('analysis')
  })
})

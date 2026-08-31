import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PromotionPicker from './PromotionPicker'

describe('PromotionPicker', () => {
  it('renders all four piece choices with white glyphs for color="w"', () => {
    render(<PromotionPicker color="w" onSelect={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('Promote to Queen')).toHaveTextContent('♕')
    expect(screen.getByLabelText('Promote to Rook')).toHaveTextContent('♖')
    expect(screen.getByLabelText('Promote to Bishop')).toHaveTextContent('♗')
    expect(screen.getByLabelText('Promote to Knight')).toHaveTextContent('♘')
  })

  it('renders black glyphs for color="b"', () => {
    render(<PromotionPicker color="b" onSelect={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('Promote to Queen')).toHaveTextContent('♛')
    expect(screen.getByLabelText('Promote to Knight')).toHaveTextContent('♞')
  })

  it('calls onSelect with the chosen piece code', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker color="w" onSelect={onSelect} onCancel={() => {}} />)
    fireEvent.click(screen.getByLabelText('Promote to Rook'))
    expect(onSelect).toHaveBeenCalledWith('r')
  })

  it('calls onCancel when the backdrop is clicked, not when a card is clicked', () => {
    const onCancel = vi.fn()
    const onSelect = vi.fn()
    render(<PromotionPicker color="w" onSelect={onSelect} onCancel={onCancel} />)

    fireEvent.click(screen.getByLabelText('Promote to Queen'))
    expect(onCancel).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledWith('q')

    fireEvent.click(screen.getByRole('dialog', { name: 'Choose promotion piece' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

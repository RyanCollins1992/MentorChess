import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHoverCapable } from './useHoverCapable'

function mockMatchMedia(initialMatches) {
  let listener = null
  let matches = initialMatches
  window.matchMedia = () => ({
    get matches() { return matches },
    addEventListener: (event, cb) => { if (event === 'change') listener = cb },
    removeEventListener: () => { listener = null },
  })
  return {
    change(next) { matches = next; listener?.() },
  }
}

describe('useHoverCapable', () => {
  afterEach(() => {
    delete window.matchMedia
  })

  it('reflects the initial matchMedia result', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useHoverCapable())
    expect(result.current).toBe(true)
  })

  it('defaults to false (jsdom has no real pointer) when matches starts false', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useHoverCapable())
    expect(result.current).toBe(false)
  })

  it('updates live when the media query change event fires', () => {
    const mq = mockMatchMedia(false)
    const { result } = renderHook(() => useHoverCapable())
    expect(result.current).toBe(false)

    act(() => mq.change(true))
    expect(result.current).toBe(true)

    act(() => mq.change(false))
    expect(result.current).toBe(false)
  })
})

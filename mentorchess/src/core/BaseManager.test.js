import { describe, it, expect, vi } from 'vitest'
import { BaseManager } from './BaseManager'

describe('BaseManager', () => {
  describe('persistence', () => {
    it('round-trips data through localStorage via _save/_load', () => {
      const mgr = new BaseManager('test-key')
      mgr._save({ foo: 'bar', n: 1 })
      expect(mgr._load()).toEqual({ foo: 'bar', n: 1 })
      expect(localStorage.getItem('test-key')).toBe(JSON.stringify({ foo: 'bar', n: 1 }))
    })

    it('_clear removes the stored value', () => {
      const mgr = new BaseManager('test-key')
      mgr._save({ foo: 'bar' })
      mgr._clear()
      expect(localStorage.getItem('test-key')).toBeNull()
    })

    it('_load falls back to the default value when nothing is stored', () => {
      const mgr = new BaseManager('missing-key')
      expect(mgr._load({ default: true })).toEqual({ default: true })
    })

    it('_load falls back to the default value on corrupt JSON', () => {
      const mgr = new BaseManager('corrupt-key')
      localStorage.setItem('corrupt-key', '{not valid json')
      expect(mgr._load({ default: true })).toEqual({ default: true })
    })

    it('_load defaults to {} when no default value is passed', () => {
      const mgr = new BaseManager('missing-key-2')
      expect(mgr._load()).toEqual({})
    })
  })

  describe('events', () => {
    it('emits to subscribed listeners with the event payload', () => {
      const mgr = new BaseManager('events-key')
      const cb = vi.fn()
      mgr.on('ping', cb)
      mgr.emit('ping', { value: 42 })
      expect(cb).toHaveBeenCalledWith({ value: 42 })
    })

    it('does not call listeners of other events', () => {
      const mgr = new BaseManager('events-key')
      const cb = vi.fn()
      mgr.on('ping', cb)
      mgr.emit('pong', { value: 42 })
      expect(cb).not.toHaveBeenCalled()
    })

    it('off() unsubscribes a listener', () => {
      const mgr = new BaseManager('events-key')
      const cb = vi.fn()
      mgr.on('ping', cb)
      mgr.off('ping', cb)
      mgr.emit('ping', { value: 1 })
      expect(cb).not.toHaveBeenCalled()
    })

    it('the unsubscribe function returned by on() removes the listener', () => {
      const mgr = new BaseManager('events-key')
      const cb = vi.fn()
      const unsubscribe = mgr.on('ping', cb)
      unsubscribe()
      mgr.emit('ping', { value: 1 })
      expect(cb).not.toHaveBeenCalled()
    })

    it('emit on an event with no listeners does not throw', () => {
      const mgr = new BaseManager('events-key')
      expect(() => mgr.emit('nothing', 1)).not.toThrow()
    })

    it('supports multiple listeners for the same event', () => {
      const mgr = new BaseManager('events-key')
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      mgr.on('ping', cb1)
      mgr.on('ping', cb2)
      mgr.emit('ping', 'data')
      expect(cb1).toHaveBeenCalledWith('data')
      expect(cb2).toHaveBeenCalledWith('data')
    })
  })
})

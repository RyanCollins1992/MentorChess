import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// useAppStore.js transitively imports the progressManager/srsEngine singletons, which read
// localStorage and award daily-login XP at module import time. Reset modules and re-import
// dynamically per test so each test gets a fresh singleton state instead of leaking across tests.
describe('useAppStore', () => {
  let useAppStore

  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()
    ;({ useAppStore } = await import('./useAppStore'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('navigation', () => {
    it('navigate updates currentPage and closes the sidebar', () => {
      useAppStore.getState().toggleSidebar() // open it first
      expect(useAppStore.getState().sidebarOpen).toBe(true)

      useAppStore.getState().navigate('settings')
      expect(useAppStore.getState().currentPage).toBe('settings')
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('defaults to the Openings page when nothing has been saved yet', () => {
      expect(useAppStore.getState().currentPage).toBe('openings')
    })

    // A refresh re-imports the module fresh — this reproduces that by
    // resetting modules and re-importing, same as beforeEach does between
    // tests, but mid-test so the localStorage write from navigate() above
    // is what the fresh import has to read back.
    it('navigate persists the page, and a fresh load restores it instead of defaulting to Openings', async () => {
      useAppStore.getState().navigate('puzzles')
      expect(localStorage.getItem('mentorchess-current-page')).toBe('puzzles')

      vi.resetModules()
      const { useAppStore: freshStore } = await import('./useAppStore')
      expect(freshStore.getState().currentPage).toBe('puzzles')
    })
  })

  describe('sidebar toggles', () => {
    it('toggleSidebar flips sidebarOpen', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(false)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(true)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('closeSidebar sets sidebarOpen to false regardless of current state', () => {
      useAppStore.getState().toggleSidebar()
      useAppStore.getState().closeSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
      useAppStore.getState().closeSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('merges a patch into existing settings state', () => {
      useAppStore.getState().updateSettings({ theme: 'dark' })
      useAppStore.getState().updateSettings({ sound: true })
      expect(useAppStore.getState().settings).toEqual({ theme: 'dark', sound: true })
    })

    it('persists the merged settings to localStorage', () => {
      useAppStore.getState().updateSettings({ theme: 'dark' })
      expect(JSON.parse(localStorage.getItem('mentorchess-settings'))).toEqual({ theme: 'dark' })
    })

    it('overwrites a key when patched again', () => {
      useAppStore.getState().updateSettings({ theme: 'dark' })
      useAppStore.getState().updateSettings({ theme: 'light' })
      expect(useAppStore.getState().settings.theme).toBe('light')
    })
  })

  describe('showToast', () => {
    it('sets a toast with message/type/id', () => {
      useAppStore.getState().showToast('Saved!', 'success', 3000)
      const toast = useAppStore.getState().toast
      expect(toast.message).toBe('Saved!')
      expect(toast.type).toBe('success')
      expect(toast.id).toBeTypeOf('number')
    })

    it('defaults type to "info" and duration to 3000ms', () => {
      vi.useFakeTimers()
      useAppStore.getState().showToast('Hello')
      expect(useAppStore.getState().toast.type).toBe('info')

      vi.advanceTimersByTime(2999)
      expect(useAppStore.getState().toast).not.toBeNull()

      vi.advanceTimersByTime(1)
      expect(useAppStore.getState().toast).toBeNull()
    })

    it('auto-clears the toast after the given duration using fake timers', () => {
      vi.useFakeTimers()
      useAppStore.getState().showToast('Custom duration', 'warning', 500)
      expect(useAppStore.getState().toast).not.toBeNull()

      vi.advanceTimersByTime(500)
      expect(useAppStore.getState().toast).toBeNull()
    })
  })
})

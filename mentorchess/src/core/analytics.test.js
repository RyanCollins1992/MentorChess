import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// GA_MEASUREMENT_ID is read from import.meta.env once at module load time,
// so each scenario needs vi.stubEnv() set BEFORE a fresh dynamic import —
// same vi.resetModules()-per-test shape useAppStore.test.js already uses
// for its own module-load-time singletons.
describe('analytics', () => {
  beforeEach(() => {
    localStorage.clear()
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach(s => s.remove())
    delete window.gtag
    delete window.dataLayer
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('without a configured Measurement ID', () => {
    beforeEach(() => { vi.stubEnv('VITE_GA_MEASUREMENT_ID', '') })

    it('getAnalyticsConsent/setAnalyticsConsent still read and write localStorage', async () => {
      vi.resetModules()
      const { getAnalyticsConsent, setAnalyticsConsent } = await import('./analytics')
      expect(getAnalyticsConsent()).toBeNull()
      setAnalyticsConsent(true)
      expect(getAnalyticsConsent()).toBe('accepted')
      setAnalyticsConsent(false)
      expect(getAnalyticsConsent()).toBe('rejected')
    })

    it('accepting consent does not inject a script when no ID is configured', async () => {
      vi.resetModules()
      const { setAnalyticsConsent } = await import('./analytics')
      setAnalyticsConsent(true)
      expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull()
    })

    it('trackPageView is a harmless no-op before anything has loaded', async () => {
      vi.resetModules()
      const { trackPageView } = await import('./analytics')
      expect(() => trackPageView('dashboard')).not.toThrow()
    })
  })

  describe('with a configured Measurement ID', () => {
    beforeEach(() => { vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123') })

    it('accepting consent injects the gtag.js script and initializes window.gtag', async () => {
      vi.resetModules()
      const { setAnalyticsConsent } = await import('./analytics')
      setAnalyticsConsent(true)

      const script = document.querySelector('script[src*="googletagmanager"]')
      expect(script).not.toBeNull()
      expect(script.src).toContain('G-TEST123')
      expect(typeof window.gtag).toBe('function')
    })

    it('rejecting consent does not inject the script', async () => {
      vi.resetModules()
      const { setAnalyticsConsent } = await import('./analytics')
      setAnalyticsConsent(false)
      expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull()
    })

    it('initAnalyticsIfConsented loads GA for a returning visitor who already accepted', async () => {
      localStorage.setItem('mentorchess-analytics-consent', 'accepted')
      vi.resetModules()
      const { initAnalyticsIfConsented } = await import('./analytics')
      initAnalyticsIfConsented()
      expect(document.querySelector('script[src*="googletagmanager"]')).not.toBeNull()
    })

    it('initAnalyticsIfConsented does nothing when consent was never accepted', async () => {
      vi.resetModules()
      const { initAnalyticsIfConsented } = await import('./analytics')
      initAnalyticsIfConsented()
      expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull()
    })

    it('trackPageView calls gtag with a page_view event once loaded', async () => {
      vi.resetModules()
      const { setAnalyticsConsent, trackPageView } = await import('./analytics')
      setAnalyticsConsent(true)

      const gtagSpy = vi.fn()
      window.gtag = gtagSpy
      trackPageView('puzzles')

      expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', { page_title: 'puzzles', page_path: '/puzzles' })
    })
  })
})

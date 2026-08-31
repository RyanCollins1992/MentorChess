import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Toast from '../ui/Toast'
import CommandPalette from '../ui/CommandPalette'
import OnboardingFlow from '../ui/OnboardingFlow'
import ConsentBanner from '../ui/ConsentBanner'
import { useAppStore } from '../../store/useAppStore'
import { KNIGHTPATH_THEME, KNIGHTPATH_DARK_THEME } from '../../styles/knightpath'
import { initAnalyticsIfConsented, trackPageView } from '../../core/analytics'

// Tailwind's opacity modifiers (bg-gold/10, text-danger/30, ...) need the
// underlying CSS variable to be an "R G B" triplet it can drop into
// rgb(var(--x) / <alpha-value>) — a plain hex string can't be alpha-blended
// by Tailwind since it can't introspect an opaque var() at build time (see
// project memory: this silently produced NO css rule at all for every
// opacity-modified theme-color utility in the app). Kept as a separate
// `-rgb` companion property rather than reformatting --color-* itself,
// since the hex vars are also read directly as raw color values elsewhere
// (globals.css gradients, color-mix() calls, inline JS styles).
const hexToRgbTriplet = hex => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export default function AppLayout({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const toast = useAppStore(s => s.toast)
  const darkMode = useAppStore(s => s.settings.darkMode)

  // Applies the active theme's CSS variables to the document root — re-runs
  // whenever the Dark Mode setting changes. Kept as a runtime effect (rather
  // than inlining every value as static CSS) because dozens of components
  // already read these via var(--color-x) / Tailwind's bg-x utilities;
  // rewriting all of those to hardcoded values would be a much larger,
  // riskier change than swapping which theme object gets applied.
  useEffect(() => {
    const theme = darkMode ? KNIGHTPATH_DARK_THEME : KNIGHTPATH_THEME
    const root = document.documentElement
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${key}`, value)
      root.style.setProperty(`--color-${key}-rgb`, hexToRgbTriplet(value))
    }
    root.style.setProperty('--font-heading', theme.headingFont)
    root.style.setProperty('--font-body', theme.bodyFont)
    // KnightPath's sidebar is a fixed near-black in both modes while its
    // content-area bg2 switches with the theme — a two-tone layout (see
    // styles/knightpath.js).
    root.style.setProperty('--color-sidebar-bg', theme.sidebarBg)
    root.style.setProperty('--color-sidebar-border', theme.sidebarBorder)
    root.style.setProperty('--color-sidebar-text', theme.sidebarText)
    root.style.setProperty('--color-sidebar-muted', theme.sidebarMuted)
  }, [darkMode])

  // Global Cmd/Ctrl+K to open the command palette from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Resumes analytics for a returning visitor who already accepted in a
  // previous session — does nothing if they haven't decided yet or rejected.
  useEffect(() => { initAnalyticsIfConsented() }, [])

  // This is a single-page app with no real URL routing (currentPage lives
  // here in the store, not the address bar), so GA's automatic on-load
  // pageview only ever fires once — send a page_view manually on every
  // in-app navigation instead. No-ops until analytics has actually loaded.
  const currentPage = useAppStore(s => s.currentPage)
  useEffect(() => { trackPageView(currentPage) }, [currentPage])

  return (
    <div className="flex h-full bg-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onPaletteClick={() => setPaletteOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Toast notifications */}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}

      {/* Command palette (Cmd/Ctrl+K) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* First-run welcome flow — renders nothing once settings.onboardingComplete is set */}
      <OnboardingFlow />

      {/* Analytics consent — renders nothing once the choice has been made */}
      <ConsentBanner />
    </div>
  )
}

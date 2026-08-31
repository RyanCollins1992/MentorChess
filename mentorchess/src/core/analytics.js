// Google Analytics 4 — consent-gated, since UK/Ireland GDPR + ePrivacy
// rules require the user's opt-in *before* any tracking script loads, not
// just a token banner. No script is injected, and no data leaves the
// device, until setAnalyticsConsent(true) has been called (either from a
// fresh choice in ConsentBanner.jsx, or a prior session's saved choice).
//
// The Measurement ID is a public identifier (it's visible in every GA4
// site's page source, unlike a real secret), so it's read from a plain
// Vite build-time env var rather than anything requiring server-side
// secrecy. Everything else here works today; GA simply no-ops until
// VITE_GA_MEASUREMENT_ID is set in .env.
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const CONSENT_KEY = 'mentorchess-analytics-consent' // 'accepted' | 'rejected' | absent (undecided)

let loaded = false

function loadGoogleAnalytics() {
  if (loaded || !GA_MEASUREMENT_ID || typeof document === 'undefined') return
  loaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  window.gtag('js', new Date())
  // send_page_view: false — this is a single-page app with no real URL
  // routing (currentPage lives in Zustand, not the address bar), so the
  // automatic on-load pageview would only ever fire once and never again
  // on in-app navigation. trackPageView() below sends them manually instead.
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })
}

export function getAnalyticsConsent() {
  return localStorage.getItem(CONSENT_KEY) // null when undecided
}

export function setAnalyticsConsent(accepted) {
  localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'rejected')
  if (accepted) loadGoogleAnalytics()
}

// Call once on app mount — resumes tracking for a returning visitor who
// already accepted in a previous session, without re-prompting them.
export function initAnalyticsIfConsented() {
  if (getAnalyticsConsent() === 'accepted') loadGoogleAnalytics()
}

export function trackPageView(pageName) {
  if (!loaded || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', { page_title: pageName, page_path: `/${pageName}` })
}

import { useState } from 'react'
import { getAnalyticsConsent, setAnalyticsConsent } from '../../core/analytics'

// Shown once, until the user Accepts or Rejects — required before Google
// Analytics is allowed to load at all under UK/Ireland GDPR + ePrivacy
// rules (a banner that's shown but doesn't actually block loading doesn't
// satisfy this). "Reject" is a real no-op, not a soft dismiss — it just
// records the choice so the banner doesn't reappear, same as Accept.
export default function ConsentBanner() {
  const [decided, setDecided] = useState(() => getAnalyticsConsent() !== null)

  if (decided) return null

  const decide = (accepted) => {
    setAnalyticsConsent(accepted)
    setDecided(true)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-bg2 border-t border-border p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <p className="text-sm text-muted max-w-2xl">
        MentorChess would like to use Google Analytics to understand how the app is used (visits, active users). No account or personal data — see our{' '}
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Privacy Policy</a>.
      </p>
      {/* Equal size/weight/contrast on both buttons, matching order — UK
          ICO PECR guidance treats a muted "Reject" next to a prominent
          "Accept" as non-compliant nudging, even though both were already
          functionally equivalent no-ops here. */}
      <div className="flex gap-2 shrink-0">
        <button onClick={() => decide(false)} className="bg-text text-bg font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-all active:scale-95 cursor-pointer select-none text-sm">Reject</button>
        <button onClick={() => decide(true)} className="btn-gold text-sm px-4">Accept</button>
      </div>
    </div>
  )
}

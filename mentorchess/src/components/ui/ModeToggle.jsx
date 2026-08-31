const MODES = [
  { id: 'focus', label: '🎯 Focus' },
  { id: 'analysis', label: '🔍 Analysis' },
]

// Segmented Focus/Analysis control for the live-play pages (vs. Coach,
// Free Play) — styled like OpeningsPage.jsx's White/Black/Mates tabs.
export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex gap-1 bg-bg3 border border-border rounded-lg p-1">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
            mode === m.id ? 'bg-gold text-bg' : 'text-muted hover:text-white'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

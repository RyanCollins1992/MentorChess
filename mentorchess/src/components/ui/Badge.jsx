// Shared badge/chip primitive — theme-reactive through the existing
// --color-* tokens, so it works in all 8 medieval themes and Tempo without
// any mode-specific styling of its own (see Tempo design review, "Badge /
// chip primitive" concept). Four tones map onto tokens that already exist
// app-wide; there's no fifth "warning" tone since nothing in the current
// theme system has a token for it yet.
const TONE = {
  brass:   { text: 'text-gold',    border: 'border-gold/30',    bg: 'bg-gold/15',    solid: 'bg-gold text-bg border-transparent' },
  sage:    { text: 'text-accent2', border: 'border-accent2/30', bg: 'bg-accent2/15', solid: 'bg-accent2 text-bg border-transparent' },
  oxblood: { text: 'text-danger',  border: 'border-danger/30',  bg: 'bg-danger/15',  solid: 'bg-danger text-white border-transparent' },
  muted:   { text: 'text-muted',   border: 'border-border',     bg: 'bg-bg3',        solid: 'bg-bg3 text-white border-transparent' },
}

export default function Badge({ tone = 'muted', variant = 'filled', dot = false, children, className = '' }) {
  const t = TONE[tone] || TONE.muted
  const toneClasses = variant === 'solid'
    ? t.solid
    : `${t.text} ${t.border} ${variant === 'filled' ? t.bg : ''}`

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${toneClasses} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'currentColor' }} />}
      {children}
    </span>
  )
}

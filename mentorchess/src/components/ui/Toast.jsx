export default function Toast({ message, type = 'info' }) {
  const colors = {
    info:    'bg-accent border-accent/30',
    success: 'bg-accent2 border-accent2/30',
    error:   'bg-danger border-danger/30',
    gold:    'bg-gold border-gold/30 text-bg',
  }
  return (
    <div className={`
      fixed bottom-20 left-1/2 -translate-x-1/2 z-[60]
      px-4 py-2.5 rounded-xl border text-sm font-medium shadow-card
      animate-in slide-in-from-bottom-2 text-white
      ${colors[type] || colors.info}
    `}>
      {message}
    </div>
  )
}

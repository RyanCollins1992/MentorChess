import { useState, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useOpeningsStore } from '../../store/useOpeningsStore'
import { NAV } from '../../data/navigation'
import { TRAPS } from '../../data/traps'
import { PUZZLES } from '../../data/puzzles'

// A functional navigation utility, not a Tempo "look" decision — unlike
// radius/motion/tabs elsewhere in this redesign, it's styled through the
// existing --color-* tokens so it works the same in all 8 medieval themes
// and Tempo (see Tempo design review, "Command palette" concept).
const PAGES = NAV.filter(item => item.id)

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [prevOpen, setPrevOpen] = useState(open)
  const inputRef = useRef(null)
  const navigate = useAppStore(s => s.navigate)
  const selectTrap = useOpeningsStore(s => s.selectTrap)

  // Reset search state during render (not an effect) when the palette
  // transitions to open — matches the "adjusted during render" pattern used
  // elsewhere in this codebase (e.g. GameReviewPage's prevGame tracking).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) { setQuery(''); setActiveIdx(0) }
  }

  // Focusing the input is a genuine imperative side effect, so it stays in
  // an effect — wait a frame for the modal to mount first.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (...fields) => !q || fields.some(f => f?.toLowerCase().includes(q))

    const pages = PAGES
      .filter(p => matches(p.label))
      .slice(0, 6)
      .map(p => ({ kind: 'page', id: p.id, icon: p.icon, label: p.label }))

    const openings = TRAPS
      .filter(t => matches(t.name, t.opening))
      .slice(0, 5)
      .map(t => ({ kind: 'opening', id: t.id, icon: '♞', label: t.name, meta: t.opening, trap: t }))

    const puzzles = PUZZLES
      .filter(p => matches(p.title, p.theme))
      .slice(0, 5)
      .map(p => ({ kind: 'puzzle', id: p.id, icon: '✳', label: p.title, meta: p.theme }))

    return [
      { label: 'Pages', items: pages },
      { label: 'Openings', items: openings },
      { label: 'Puzzles', items: puzzles },
    ].filter(g => g.items.length > 0)
  }, [query])

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups])

  const runItem = (item) => {
    if (!item) return
    if (item.kind === 'page') navigate(item.id)
    else if (item.kind === 'opening') { navigate('openings'); selectTrap(item.trap) }
    else if (item.kind === 'puzzle') navigate('puzzles')
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter')    { e.preventDefault(); runItem(flat[activeIdx]); return }
  }

  if (!open) return null

  let rowIdx = -1
  const activeItem = flat[activeIdx]
  const activeId = activeItem ? `command-option-${activeItem.kind}-${activeItem.id}` : undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg mx-4 bg-bg2 border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <span className="text-gold font-mono text-sm">›</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search openings, puzzles, pages…"
            className="flex-1 bg-transparent text-sm text-white placeholder-muted outline-none font-mono"
            role="combobox"
            aria-label="Search openings, puzzles, pages"
            aria-expanded={flat.length > 0}
            aria-controls="command-palette-listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
          />
        </div>

        <div className="max-h-96 overflow-y-auto py-1" id="command-palette-listbox" role="listbox">
          {flat.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted text-center">No results</div>
          )}
          {groups.map(group => (
            <div key={group.label} role="group" aria-label={group.label}>
              <div className="px-4 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                {group.label}
              </div>
              {group.items.map(item => {
                rowIdx++
                const active = rowIdx === activeIdx
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    id={`command-option-${item.kind}-${item.id}`}
                    role="option"
                    aria-selected={active}
                    onClick={() => runItem(item)}
                    onMouseEnter={() => setActiveIdx(rowIdx)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                      active ? 'bg-gold/10 border-l-2 border-gold pl-[14px] text-gold font-semibold' : 'text-muted border-l-2 border-transparent'
                    }`}
                  >
                    <span className={`w-4 text-center text-xs ${active ? 'text-gold' : 'text-muted'}`}>{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.meta && <span className="font-mono text-[11px] text-muted">{item.meta}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3.5 px-4 py-2 border-t border-border font-mono text-[10px] text-muted">
          <span><kbd className="bg-bg3 border border-border rounded px-1.5 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="bg-bg3 border border-border rounded px-1.5 py-0.5">↵</kbd> open</span>
          <span><kbd className="bg-bg3 border border-border rounded px-1.5 py-0.5">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

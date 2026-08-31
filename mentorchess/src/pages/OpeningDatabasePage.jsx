import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from '../components/ui/Chessboard'
import { ECO_CATEGORIES, ECO_DATABASE } from '../data/ecoDatabase'

// Rendering all 2,013 entries unfiltered would be a lot of DOM for no
// benefit — cap the list and nudge toward narrowing the search instead of
// silently truncating with no explanation.
const MAX_RESULTS = 200

export default function OpeningDatabasePage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)

  const q = query.trim().toLowerCase()
  // Nothing renders until the user narrows down via search or category —
  // the unfiltered 2,013-entry list isn't a useful "browse all" view, it's
  // just whatever happens to sort first.
  const active = q !== '' || category !== 'All'
  const filtered = active
    ? ECO_DATABASE.filter(e =>
        (category === 'All' || e.category === category) &&
        (q === '' || e.name.toLowerCase().includes(q))
      )
    : []
  const results = filtered.slice(0, MAX_RESULTS)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-bg2 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <h2 className="font-bold text-white font-heading">Opening Database</h2>
          <input
            type="text"
            placeholder="Search opening names…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50"
          />
          <div className="flex flex-wrap gap-1">
            {['All', ...ECO_CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors ${category === c ? 'bg-gold text-bg' : 'bg-bg3 text-muted border border-border hover:text-white'}`}
              >
                {c}
              </button>
            ))}
          </div>
          {active && (
            <div className="text-xs text-muted">
              {filtered.length.toLocaleString()} opening{filtered.length !== 1 ? 's' : ''}
              {filtered.length > MAX_RESULTS && ` — showing first ${MAX_RESULTS}, refine your search`}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center text-muted py-10 text-sm px-4">
              {active ? 'No openings found' : 'Search by name or pick a category to browse'}
            </div>
          ) : (
            results.map((e, i) => (
              <button
                key={`${e.name}-${i}`}
                onClick={() => setSelected(e)}
                className={`w-full text-left px-4 py-2.5 border-b border-border/40 transition-colors hover:bg-bg3 ${
                  selected === e ? 'bg-gold/10 border-l-2 border-gold pl-3' : ''
                }`}
              >
                <div className={`text-sm font-semibold truncate ${selected === e ? 'text-gold' : 'text-white'}`}>
                  {e.name}
                </div>
                <div className="text-xs text-muted font-mono mt-0.5 truncate">
                  {e.moves.slice(0, 6).join(' ')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        {selected ? <EntryBrowser key={`${selected.name}-${selected.moves.join(',')}`} entry={selected} /> : <EmptyState />}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center h-full text-muted">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-20">♟</div>
        <div className="text-lg font-semibold">Select an opening to browse</div>
        <div className="text-sm mt-1">Choose from the list on the left</div>
      </div>
    </div>
  )
}

function EntryBrowser({ entry }) {
  const [browseFens] = useState(() => {
    const c = new Chess()
    const fens = [c.fen()]
    for (const m of entry.moves) {
      try { c.move(m); fens.push(c.fen()) } catch { /* invalid move in data, skip */ }
    }
    return fens
  })
  const [browseIdx, setBrowseIdx] = useState(0)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col items-center justify-center p-2 flex-1">
        <div className="w-full max-w-[min(calc(100vh_-_230px),86vw,940px)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-accent/20 text-accent">
              📚 Opening Database
            </span>
            <span className="text-xs text-muted">{entry.category}</span>
          </div>

          <div className="rounded-xl overflow-hidden">
            <Chessboard
              position={browseFens[browseIdx]}
              arePiecesDraggable={false}
              customBoardStyle={{ borderRadius: '8px' }}
            />
          </div>

          <div className="mt-3 bg-bg3 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gold transition-all duration-500 rounded-full"
              style={{ width: browseFens.length > 1 ? `${(browseIdx / (browseFens.length - 1)) * 100}%` : '0%' }} />
          </div>

          <div className="flex items-center justify-between mt-3 gap-2">
            <button onClick={() => setBrowseIdx(i => Math.max(0, i - 1))}
              disabled={browseIdx === 0}
              className="flex-1 btn-ghost text-sm disabled:opacity-30">
              ◀ Prev
            </button>
            <span className="text-xs text-muted px-2 text-center min-w-20">
              {browseIdx === 0 ? 'Start' : `Move ${Math.ceil(browseIdx / 2)} of ${Math.ceil(entry.moves.length / 2)}`}
            </span>
            <button onClick={() => setBrowseIdx(i => Math.min(browseFens.length - 1, i + 1))}
              disabled={browseIdx >= browseFens.length - 1}
              className="flex-1 btn-ghost text-sm disabled:opacity-30">
              Next ▶
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {entry.moves.map((m, i) => (
              <span key={i}
                onClick={() => setBrowseIdx(i + 1)}
                className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  i + 1 === browseIdx
                    ? 'text-gold bg-gold/20 font-bold'
                    : i < browseIdx
                      ? 'text-accent2 bg-accent2/10'
                      : 'text-muted hover:text-white'
                }`}>
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{m}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="w-72 shrink-0 border-l border-border bg-bg2 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-extrabold text-white text-lg leading-tight font-heading">{entry.name}</h2>
          <div className="text-muted text-sm mt-0.5">{entry.category}</div>
        </div>
        <div className="p-4">
          <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Move Order</div>
          <div className="flex flex-wrap gap-1">
            {entry.moves.map((m, i) => (
              <span key={i} className="text-xs font-mono text-accent2 bg-accent2/10 px-1.5 py-0.5 rounded">
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

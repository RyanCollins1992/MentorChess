import { useState } from 'react'
import { TRAPS } from '../data/traps'
import { useAppStore } from '../store/useAppStore'
import { useOpeningsStore } from '../store/useOpeningsStore'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'

export default function FavouritesPage() {
  const favs = useAppStore(s => s.favourites)
  const toggle = useAppStore(s => s.toggleFavourite)
  const navigate = useAppStore(s => s.navigate)
  const showToast = useAppStore(s => s.showToast)
  const setActiveColor = useOpeningsStore(s => s.setActiveColor)
  const selectTrap = useOpeningsStore(s => s.selectTrap)

  // Jumps straight into that trap's study panel on the Openings page,
  // instead of just landing on the generic Openings list and making the
  // user search for it again.
  const openTrap = (trap) => {
    setActiveColor(trap.isMate ? 'mates' : trap.color)
    selectTrap(trap)
    navigate('openings')
  }
  const [search, setSearch] = useState('')
  const [color, setColor] = useState('all')

  // Filter tabs by color rather than by item "type" (Opening/Puzzle/Position,
  // as in the original Figma reference) — this app only has one favouritable
  // thing (traps), so a type filter would have nothing real to filter
  // between. Color is genuine per-trap data (same field OpeningsPage's own
  // White/Black/Mates tabs already filter on), so it's an honest filter
  // rather than UI implying capabilities that don't exist.
  const matchesFilters = (t) =>
    (color === 'all' || t.color === color) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) ||
     t.opening?.toLowerCase().includes(search.toLowerCase()))

  const favouriteTraps = TRAPS.filter(t => favs.includes(t.id) && matchesFilters(t))
  const allTraps = TRAPS.filter(t => !favs.includes(t.id) && matchesFilters(t))

  const handleToggle = (trap) => {
    toggle(trap.id)
    showToast(
      favs.includes(trap.id) ? `Removed from favourites` : `⭐ Added to favourites`,
      'success', 1500
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-extrabold text-white font-heading">Favourites</h2>
            <p className="text-muted text-sm mt-0.5">{favs.length} trap{favs.length !== 1 ? 's' : ''} saved</p>
          </div>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search traps…"
          className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-gold/50"
        />
        <div className="flex gap-1 mt-3">
          {[['all', 'All'], ['white', 'White'], ['black', 'Black']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setColor(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                color === id ? 'bg-gold text-bg' : 'bg-bg3 text-muted border border-border hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Favourites section */}
        {favouriteTraps.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">⭐ Your Favourites</div>
            <div className="space-y-2">
              {favouriteTraps.map(trap => (
                <TrapRow
                  key={trap.id}
                  trap={trap}
                  isFav={true}
                  onToggle={() => handleToggle(trap)}
                  onStudy={() => openTrap(trap)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {favs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 opacity-20">⭐</div>
            <div className="font-bold text-white text-lg">No favourites yet</div>
            <p className="text-muted text-sm mt-2 max-w-xs mx-auto">
              Star traps below to save them here. Great for traps you want to study repeatedly.
            </p>
          </div>
        )}

        {/* All traps to browse + favourite */}
        {allTraps.length > 0 && (
          <div>
            <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
              {favs.length > 0 ? 'Add More' : 'All Traps'}
            </div>
            <div className="space-y-2">
              {allTraps.map(trap => (
                <TrapRow
                  key={trap.id}
                  trap={trap}
                  isFav={false}
                  onToggle={() => handleToggle(trap)}
                  onStudy={() => openTrap(trap)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrapRow({ trap, isFav, onToggle, onStudy }) {
  const studyCount = progressManager.getTrapStudyCount(trap.id)
  const inSRS      = srsEngine.isEnrolled(trap.id)

  const levelColors = {
    beginner:     'text-accent2',
    intermediate: 'text-gold',
    advanced:     'text-danger',
  }

  return (
    <div
      onClick={onStudy}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
        isFav ? 'bg-gold/5 border-gold/20' : 'bg-bg2 border-border hover:border-border/80'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-sm truncate">{trap.name}</div>
        <div className="text-xs text-muted mt-0.5 truncate">{trap.opening}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold uppercase ${levelColors[trap.level] || 'text-muted'}`}>
          {trap.level}
        </span>
        {studyCount > 0 && <span className="text-xs text-accent2">✓{studyCount}x</span>}
        {inSRS && <span className="text-xs text-accent">🔁</span>}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className={`text-xl transition-colors active:scale-95 ${isFav ? 'text-gold' : 'text-muted hover:text-gold'}`}
          title={isFav ? 'Remove from favourites' : 'Add to favourites'}
        >
          {isFav ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}

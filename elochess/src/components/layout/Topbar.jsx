import { useAppStore } from '../../store/useAppStore'
import { Menu, Search, Plus, Settings as SettingsIcon, Zap } from 'lucide-react'
import { KNIGHTPATH_NAV_ICONS } from '../../styles/knightpathIcons'

const PAGE_TITLES = {
  'dashboard':      'Dashboard',
  'openings':       'Openings',
  'opening-database':'Opening Database',
  'spaced-review':  'Spaced Review',
  'progress':       'My Progress',
  'import-games':   'Import Games',
  'scout-opponent': 'Scout Opponent',
  'game-review':    'Game Breakdown',
  'elo-roadmap':    'ELO Roadmap',
  'favourites':     'Favourites',
  'vs-coach':       'vs. Coach',
  'free-play':      'Free Play',
  'puzzles':        'Puzzles',
  'memory-drill':   'Memory Drill',
  'opening-quiz':   'Opening Quiz',
  'mate-patterns':  'Mate Patterns',
  'endgames':       'Endgame Trainer',
  'piece-values':   'Piece Values',
  'rate-difficulty':'Rate Difficulty',
  'settings':       'Settings',
}

export default function Topbar({ onCoachClick, onPaletteClick }) {
  const { currentPage, toggleSidebar, progress, navigate } = useAppStore()
  const title = PAGE_TITLES[currentPage] || 'MentorChess'
  const PageIcon = KNIGHTPATH_NAV_ICONS[currentPage]

  return (
    <header className="h-14 shrink-0 bg-bg2 border-b border-border flex items-center px-4 gap-3 z-20">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden text-muted hover:text-white transition-colors p-1"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {PageIcon && <PageIcon size={18} />}
        <h1 className="font-bold text-white text-base truncate font-heading">{title}</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* ELO badge */}
        <div className="flex items-center gap-1.5 bg-bg3 border border-border rounded-lg px-3 py-1.5">
          <span className="text-gold2 font-extrabold text-sm">{progress.currentElo}</span>
          <span className="text-muted text-xs font-medium">ELO</span>
        </div>

        {/* XP */}
        <div className="hidden sm:flex items-center gap-1 text-gold">
          <Zap size={16} />
          <span className="font-bold text-sm">{progress.xpToday}</span>
        </div>

        {/* Command palette */}
        <button
          onClick={onPaletteClick}
          className="hidden sm:flex items-center gap-2 text-muted hover:text-white transition-colors bg-bg3 border border-border rounded-lg px-2.5 py-1.5 text-xs"
          aria-label="Search (Cmd+K)"
        >
          <Search size={13} />
          <span>Search…</span>
          <kbd className="font-mono text-[10px] bg-bg border border-border rounded px-1">⌘K</kbd>
        </button>

        {/* Coach button */}
        <button
          onClick={onCoachClick}
          className="flex items-center gap-1.5 bg-gold text-bg font-bold px-3 py-1.5 rounded-lg hover:bg-gold2 transition-colors text-sm active:scale-95"
        >
          <Plus size={14} />
          <span>Coach</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('settings')}
          className="text-muted hover:text-white transition-colors p-1.5"
          aria-label="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  )
}

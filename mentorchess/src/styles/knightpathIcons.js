import {
  LayoutDashboard, Brain, BookOpen, Target, Bookmark, Star,
  Zap, Crown, Flag, RefreshCcw, Hash, Cpu, Gamepad2, Upload, Eye,
  TrendingUp, Map, Settings, Search, Menu, Flame, Trophy, Crosshair, Library,
} from 'lucide-react'

/**
 * Real lucide-react icons, matching the KnightPath source design exactly.
 * CommandPalette.jsx still renders NAV's own plain-text Unicode `icon`
 * field (data/navigation.js) rather than these — not yet reskinned.
 *
 * Keyed by this app's nav ids (data/navigation.js), mapped to match the
 * source's icon choice 1:1 (source's "play"/"progress" screens are this
 * app's "vs-coach"/"progress" ids — same icons, different id string).
 */
export const KNIGHTPATH_NAV_ICONS = {
  dashboard: LayoutDashboard,
  'spaced-review': Brain,
  openings: BookOpen,
  'opening-database': Library,
  'opening-quiz': Target,
  favourites: Bookmark,
  'rate-difficulty': Star,
  puzzles: Zap,
  'mate-patterns': Crown,
  endgames: Flag,
  'memory-drill': RefreshCcw,
  'piece-values': Hash,
  'vs-coach': Cpu,
  'free-play': Gamepad2,
  'import-games': Upload,
  'scout-opponent': Crosshair,
  'game-review': Eye,
  progress: TrendingUp,
  'elo-roadmap': Map,
  settings: Settings,
}

export { Search, Menu, Flame, Trophy }

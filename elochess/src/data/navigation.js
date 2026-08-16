/**
 * Sidebar nav — the single source of truth for the page list, imported by
 * both Sidebar.jsx (renders it) and CommandPalette.jsx (searches it).
 *
 * Regrouped 2026-07-07 (see Tempo design-brief conversation) around what a
 * user is actually trying to do, rather than the previous ad-hoc buckets —
 * the old "LEARN" mixed a progress page (ELO Roadmap) and a bookmarks page
 * (Favourites) in with actual opening theory, and "TRAIN" was 7 unrelated
 * items (opening quizzes next to Piece Values next to a rating tool) with
 * no shared thread. Spaced Review leads its section (not buried under
 * "Progress") because it's a time-sensitive due-queue, not a passive stat.
 *
 * Re-ordered 2026-08-09 per Ryan's request: PLAY and PROGRESS both moved up
 * ahead of OPENINGS/TACTICS & ENDGAMES/MY GAMES, so the core "jump into a
 * game" and "check how I'm doing" actions sit right under Dashboard instead
 * of behind the deeper opening-study sections.
 */
export const NAV = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '◫', },

  { section: 'PLAY' },
  { id: 'vs-coach',      label: 'vs. Coach',      icon: '⚔', },
  { id: 'free-play',     label: 'Free Play',      icon: '♞', },

  { section: 'PROGRESS' },
  { id: 'progress',      label: 'My Progress',    icon: '✦', },
  { id: 'elo-roadmap',   label: 'ELO Roadmap',   icon: '⚑', },

  { section: 'OPENINGS' },
  { id: 'spaced-review', label: 'Spaced Review',  icon: '↻', badge: true },
  { id: 'openings',      label: 'Openings',       icon: '♟',  },
  { id: 'opening-database',label:'Opening Database',icon:'▤', },
  { id: 'opening-quiz',  label: 'Opening Quiz',   icon: '✒', },
  { id: 'favourites',    label: 'Favourites',     icon: '✧', },
  { id: 'rate-difficulty',label:'Rate Difficulty', icon: '◆', },

  { section: 'TACTICS & ENDGAMES' },
  { id: 'puzzles',       label: 'Puzzles',        icon: '✥', },
  { id: 'mate-patterns', label: 'Mate Patterns',  icon: '♚', },
  { id: 'endgames',      label: 'Endgames',       icon: '♔', },
  { id: 'memory-drill',  label: 'Memory Drill',   icon: '✎', },
  { id: 'piece-values',  label: 'Piece Values',   icon: '⚖', },

  { section: 'MY GAMES' },
  { id: 'import-games',   label: 'Import Games',   icon: '✉', },
  { id: 'scout-opponent', label: 'Scout Opponent', icon: '◎', },
  { id: 'game-review',    label: 'Game Breakdown', icon: '♜', },
]

import { create } from 'zustand'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'

export const useAppStore = create((set, get) => ({
  // ── Navigation (currentPage persisted so a refresh keeps you on the
  //    same page instead of bouncing back to the Openings default) ────
  currentPage: localStorage.getItem('mentorchess-current-page') || 'openings',
  sidebarOpen: false,

  navigate: (page) => {
    localStorage.setItem('mentorchess-current-page', page)
    set({ currentPage: page, sidebarOpen: false })
  },
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar:  () => set({ sidebarOpen: false }),

  // ── Progress (synced from ProgressManager) ───────────────────────
  progress: progressManager.getSnapshot(),
  dueCount: srsEngine.getDueCount(),

  refreshProgress: () => set({
    progress: progressManager.getSnapshot(),
    dueCount: srsEngine.getDueCount(),
  }),

  // ── Settings ─────────────────────────────────────────────────────
  settings: (() => {
    try { return JSON.parse(localStorage.getItem('mentorchess-settings')) || {} } catch { return {} }
  })(),

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch }
    localStorage.setItem('mentorchess-settings', JSON.stringify(next))
    set({ settings: next })
  },

  // ── Imported games (persisted, keyed by lowercased username) ─────
  importedGames: (() => {
    try {
      const v = JSON.parse(localStorage.getItem('mentorchess-imported-games'))
      // Older builds wrote a bare array under this key; only the object map is usable.
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
    } catch { return {} }
  })(),

  setImportedGames: (username, entry) => {
    const next = { ...get().importedGames, [username]: entry }
    localStorage.setItem('mentorchess-imported-games', JSON.stringify(next))
    set({ importedGames: next })
  },

  // ── Favourite traps (persisted array of trap ids) ────────────────
  favourites: (() => {
    try { return JSON.parse(localStorage.getItem('mentorchess-favourites')) || [] } catch { return [] }
  })(),

  toggleFavourite: (id) => {
    const cur = get().favourites
    const next = cur.includes(id) ? cur.filter(f => f !== id) : [...cur, id]
    localStorage.setItem('mentorchess-favourites', JSON.stringify(next))
    set({ favourites: next })
  },

  // ── Mate patterns learned (persisted array of pattern ids) ───────
  matePatternsLearned: (() => {
    try { return JSON.parse(localStorage.getItem('mentorchess-mate-patterns')) || [] } catch { return [] }
  })(),

  markMatePatternLearned: (id) => {
    const next = [...new Set([...get().matePatternsLearned, id])]
    localStorage.setItem('mentorchess-mate-patterns', JSON.stringify(next))
    set({ matePatternsLearned: next })
  },

  // ── Solved puzzles (persisted array of puzzle ids) ───────────────
  solvedPuzzles: (() => {
    try { return JSON.parse(localStorage.getItem('mentorchess-solved-puzzles')) || [] } catch { return [] }
  })(),

  markPuzzleSolved: (id) => {
    const next = [...new Set([...get().solvedPuzzles, id])]
    localStorage.setItem('mentorchess-solved-puzzles', JSON.stringify(next))
    set({ solvedPuzzles: next })
  },

  resetSolvedPuzzles: () => {
    localStorage.setItem('mentorchess-solved-puzzles', '[]')
    set({ solvedPuzzles: [] })
  },

  // ── Difficulty ratings (persisted map of trapId → 0-3 stars) ─────
  difficultyRatings: (() => {
    try { return JSON.parse(localStorage.getItem('mentorchess-difficulty-ratings')) || {} } catch { return {} }
  })(),

  setDifficultyRating: (trapId, stars) => {
    const next = { ...get().difficultyRatings, [trapId]: stars }
    localStorage.setItem('mentorchess-difficulty-ratings', JSON.stringify(next))
    set({ difficultyRatings: next })
  },

  // ── Review game (one-shot handoff to GameReviewPage; in-memory only,
  //    intentionally not persisted — it only needs to survive one navigation) ─
  reviewGame: null,
  setReviewGame: (game) => set({ reviewGame: game }),

  // ── Global UI ────────────────────────────────────────────────────
  toast:    null,
  showToast: (message, type = 'info', duration = 3000) => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), duration)
  },
}))

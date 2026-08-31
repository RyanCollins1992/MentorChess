import { create } from 'zustand'
import { TRAPS } from '../data/traps'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { progressManager } from '../core/ProgressManager'

export const useOpeningsStore = create((set, get) => ({
  // ── Trap Library ─────────────────────────────────────────────────
  traps:          TRAPS,
  activeColor:    'white',   // 'white' | 'black' | 'mates'
  searchQuery:    '',
  selectedTrap:   null,
  drillMode:      true,      // true = drill, false = browse

  setActiveColor:  (color)  => set({ activeColor: color, selectedTrap: null }),
  setSearchQuery:  (query)  => set({ searchQuery: query }),
  setDrillMode:    (mode)   => set({ drillMode: mode }),

  selectTrap: (trap) => {
    set({ selectedTrap: trap })
  },

  // ── Filtered traps ────────────────────────────────────────────────
  getFilteredTraps: () => {
    const { traps, activeColor, searchQuery } = get()
    const query = searchQuery.toLowerCase()

    return traps.filter(t => {
      const colorMatch =
        activeColor === 'white' ? t.color === 'white' :
        activeColor === 'black' ? t.color === 'black' :
        activeColor === 'mates' ? t.isMate : true

      const searchMatch = !query ||
        t.name.toLowerCase().includes(query) ||
        t.opening?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))

      return colorMatch && searchMatch
    })
  },

  // ── Drill State ──────────────────────────────────────────────────
  drillMoveIndex:  0,
  drillComplete:   false,
  drillMistakes:   0,

  resetDrill: () => set({ drillMoveIndex: 0, drillComplete: false, drillMistakes: 0 }),

  advanceDrill: () => {
    const { selectedTrap, drillMoveIndex } = get()
    if (!selectedTrap) return
    const next = drillMoveIndex + 1
    const complete = next >= selectedTrap.moves.length
    if (complete) {
      progressManager.recordTrapStudy(selectedTrap.id, get().drillMistakes === 0)
      srsEngine.enroll(selectedTrap.id)
    }
    set({ drillMoveIndex: next, drillComplete: complete })
  },

  recordDrillMistake: () => set(s => ({ drillMistakes: s.drillMistakes + 1 })),
}))

import { describe, it, expect, beforeEach, vi } from 'vitest'

const FIXTURE_TRAPS = [
  { id: 'white-fork', name: 'White Fork Trap', color: 'white', opening: 'Italian Game', tags: ['fork', 'attack'], isMate: false, moves: ['e4', 'e5', 'Nf3'] },
  { id: 'black-pin', name: 'Black Pin Defense', color: 'black', opening: 'Sicilian Defense', tags: ['pin'], isMate: false, moves: ['c5', 'Nf3'] },
  { id: 'mate-in-3', name: "Scholar's Mate", color: 'white', opening: 'Open Game', tags: ['checkmate', 'beginner'], isMate: true, moves: ['Qh5', 'Nc6', 'Qxf7#'] },
]

// useOpeningsStore.js imports the srsEngine/progressManager singletons (for enroll/recordTrapStudy
// side effects in advanceDrill) and the static TRAPS data array. Mock all three so each test gets
// a controlled, isolated fixture and we're testing the store's orchestration logic only, not
// re-testing SRS/Progress internals (already covered in their own test files).
vi.mock('../data/traps', () => ({ TRAPS: FIXTURE_TRAPS }))
vi.mock('../core/SpacedRepetitionEngine', () => ({
  srsEngine: { enroll: vi.fn(), getDueCount: vi.fn(() => 0) },
}))
vi.mock('../core/ProgressManager', () => ({
  progressManager: { recordTrapStudy: vi.fn(), getSnapshot: vi.fn(() => ({})) },
}))

describe('useOpeningsStore', () => {
  let useOpeningsStore, srsEngine, progressManager

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    ;({ useOpeningsStore } = await import('./useOpeningsStore'))
    ;({ srsEngine } = await import('../core/SpacedRepetitionEngine'))
    ;({ progressManager } = await import('../core/ProgressManager'))

    // Reset store to known defaults between tests since it's a module-level singleton store.
    useOpeningsStore.setState({
      traps: FIXTURE_TRAPS,
      activeColor: 'white',
      searchQuery: '',
      selectedTrap: null,
      drillMode: true,
      drillMoveIndex: 0,
      drillComplete: false,
      drillMistakes: 0,
    })
  })

  describe('getFilteredTraps — color filter', () => {
    it('"white" filters to white traps only', () => {
      useOpeningsStore.setState({ activeColor: 'white', searchQuery: '' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result.map(t => t.id).sort()).toEqual(['mate-in-3', 'white-fork'])
    })

    it('"black" filters to black traps only', () => {
      useOpeningsStore.setState({ activeColor: 'black', searchQuery: '' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result.map(t => t.id)).toEqual(['black-pin'])
    })

    it('"mates" filters to isMate traps only, regardless of color', () => {
      useOpeningsStore.setState({ activeColor: 'mates', searchQuery: '' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result.map(t => t.id)).toEqual(['mate-in-3'])
    })
  })

  describe('getFilteredTraps — search query', () => {
    it('matches by name (case-insensitive)', () => {
      useOpeningsStore.setState({ activeColor: 'white', searchQuery: 'SCHOLAR' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result.map(t => t.id)).toEqual(['mate-in-3'])
    })

    it('matches by opening name', () => {
      useOpeningsStore.setState({ activeColor: 'black', searchQuery: 'sicilian' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result.map(t => t.id)).toEqual(['black-pin'])
    })

    it('matches by tag', () => {
      useOpeningsStore.setState({ activeColor: 'white', searchQuery: 'fork' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result.map(t => t.id)).toEqual(['white-fork'])
    })

    it('combines color and search filters with AND semantics', () => {
      // "beginner" tag belongs to mate-in-3 (white), but filtering by black color should exclude it.
      useOpeningsStore.setState({ activeColor: 'black', searchQuery: 'beginner' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result).toEqual([])
    })

    it('empty query returns all traps matching the color filter', () => {
      useOpeningsStore.setState({ activeColor: 'white', searchQuery: '' })
      const result = useOpeningsStore.getState().getFilteredTraps()
      expect(result).toHaveLength(2)
    })
  })

  describe('selectTrap', () => {
    it('sets selectedTrap', () => {
      useOpeningsStore.getState().selectTrap(FIXTURE_TRAPS[0])
      expect(useOpeningsStore.getState().selectedTrap).toEqual(FIXTURE_TRAPS[0])
    })
  })

  describe('setActiveColor', () => {
    it('updates activeColor and clears selectedTrap', () => {
      useOpeningsStore.getState().selectTrap(FIXTURE_TRAPS[0])
      useOpeningsStore.getState().setActiveColor('black')
      expect(useOpeningsStore.getState().activeColor).toBe('black')
      expect(useOpeningsStore.getState().selectedTrap).toBeNull()
    })
  })

  describe('resetDrill', () => {
    it('resets drillMoveIndex, drillComplete, and drillMistakes', () => {
      useOpeningsStore.setState({ drillMoveIndex: 2, drillComplete: true, drillMistakes: 3 })
      useOpeningsStore.getState().resetDrill()
      expect(useOpeningsStore.getState()).toMatchObject({
        drillMoveIndex: 0,
        drillComplete: false,
        drillMistakes: 0,
      })
    })
  })

  describe('recordDrillMistake', () => {
    it('increments drillMistakes by 1 each call', () => {
      useOpeningsStore.getState().recordDrillMistake()
      useOpeningsStore.getState().recordDrillMistake()
      expect(useOpeningsStore.getState().drillMistakes).toBe(2)
    })
  })

  describe('advanceDrill', () => {
    it('does nothing if no trap is selected', () => {
      useOpeningsStore.setState({ selectedTrap: null })
      useOpeningsStore.getState().advanceDrill()
      expect(useOpeningsStore.getState().drillMoveIndex).toBe(0)
      expect(progressManager.recordTrapStudy).not.toHaveBeenCalled()
    })

    it('advances drillMoveIndex without completing when moves remain', () => {
      useOpeningsStore.setState({ selectedTrap: FIXTURE_TRAPS[0], drillMoveIndex: 0 }) // 3 moves
      useOpeningsStore.getState().advanceDrill()
      expect(useOpeningsStore.getState().drillMoveIndex).toBe(1)
      expect(useOpeningsStore.getState().drillComplete).toBe(false)
      expect(progressManager.recordTrapStudy).not.toHaveBeenCalled()
      expect(srsEngine.enroll).not.toHaveBeenCalled()
    })

    it('on the final move, marks complete and calls recordTrapStudy + srsEngine.enroll', () => {
      useOpeningsStore.setState({ selectedTrap: FIXTURE_TRAPS[0], drillMoveIndex: 2, drillMistakes: 0 }) // last of 3 moves
      useOpeningsStore.getState().advanceDrill()
      expect(useOpeningsStore.getState().drillComplete).toBe(true)
      expect(progressManager.recordTrapStudy).toHaveBeenCalledWith('white-fork', true)
      expect(srsEngine.enroll).toHaveBeenCalledWith('white-fork')
    })

    it('passes perfect=false to recordTrapStudy when there were mistakes', () => {
      useOpeningsStore.setState({ selectedTrap: FIXTURE_TRAPS[0], drillMoveIndex: 2, drillMistakes: 2 })
      useOpeningsStore.getState().advanceDrill()
      expect(progressManager.recordTrapStudy).toHaveBeenCalledWith('white-fork', false)
    })
  })
})

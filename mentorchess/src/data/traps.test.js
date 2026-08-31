import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { TRAPS } from './traps.js'

// Mirrors the standalone `npm run validate:traps` check (validate-traps.js at the
// project root) so invalid trap data fails `npm test` / `vitest run` too.
describe('TRAPS data integrity', () => {
  it('contains at least one trap', () => {
    expect(TRAPS.length).toBeGreaterThan(0)
  })

  it.each(TRAPS.map((trap) => [trap.id, trap]))(
    '%s replays legally from its start FEN',
    (_id, trap) => {
      const chess = new Chess(trap.fen)
      for (const move of trap.moves) {
        let result = null
        try {
          result = chess.move(move)
        } catch {
          // chess.js v1 throws on illegal moves; leave result null so the
          // assertion below reports which move failed and from what position.
        }
        expect(
          result,
          `illegal move "${move}" from position ${chess.fen()}`
        ).not.toBeNull()
      }
    }
  )
})

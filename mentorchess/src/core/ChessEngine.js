import { Chess } from 'chess.js'

/**
 * ChessEngine
 * Wraps chess.js with a clean interface.
 * All board logic goes through this class — no raw chess.js calls in components.
 */
export class ChessEngine {
  constructor(fen = undefined) {
    this._chess = fen ? new Chess(fen) : new Chess()
    this._moveHistory = []
  }

  // ── Position ─────────────────────────────────────────────────────

  get fen() { return this._chess.fen() }
  get turn() { return this._chess.turn() } // 'w' | 'b'
  get isWhiteTurn() { return this.turn === 'w' }
  get isCheck() { return this._chess.inCheck() }
  get isCheckmate() { return this._chess.isCheckmate() }
  get isStalemate() { return this._chess.isStalemate() }
  get isDraw() { return this._chess.isDraw() }
  get isGameOver() { return this._chess.isGameOver() }
  get moveHistory() { return [...this._moveHistory] }
  get board() { return this._chess.board() }

  /** Returns SAN move list e.g. ['e4', 'e5', 'Nf3'] */
  get sanHistory() {
    return this._chess.history()
  }

  /** Returns verbose move objects */
  get verboseHistory() {
    return this._chess.history({ verbose: true })
  }

  // ── Moves ────────────────────────────────────────────────────────

  /**
   * Make a move. Accepts SAN string or {from, to, promotion}.
   * Returns the move object or null if illegal.
   */
  move(moveInput) {
    try {
      const result = this._chess.move(moveInput)
      if (result) this._moveHistory.push(result)
      return result
    } catch {
      return null
    }
  }

  /** Undo the last move */
  undo() {
    const undone = this._chess.undo()
    if (undone) this._moveHistory.pop()
    return undone
  }

  /** Get all legal moves. Pass square for piece-specific moves. */
  legalMoves(square = undefined) {
    return this._chess.moves({ square, verbose: true })
  }

  /** Get legal moves as SAN strings */
  legalMovesSAN() {
    return this._chess.moves()
  }

  /** Check if a specific move is legal */
  isLegalMove(from, to) {
    return this.legalMoves(from).some(m => m.to === to)
  }

  // ── State ────────────────────────────────────────────────────────

  /** Reset to starting position */
  reset() {
    this._chess.reset()
    this._moveHistory = []
  }

  /** Load a FEN string */
  loadFen(fen) {
    this._chess.load(fen)
    this._moveHistory = []
  }

  /** Load a PGN string */
  loadPgn(pgn) {
    this._chess.loadPgn(pgn)
    this._moveHistory = this._chess.history({ verbose: true })
  }

  /** Go to a specific move index in history */
  goToMove(index) {
    const history = this._chess.history({ verbose: true })
    this._chess.reset()
    this._moveHistory = []
    for (let i = 0; i <= index && i < history.length; i++) {
      this.move(history[i].san)
    }
  }

  /** Get piece at a square */
  pieceAt(square) {
    return this._chess.get(square)
  }

  /** Get squares with legal moves highlighted */
  getLegalSquares(square) {
    return this.legalMoves(square).map(m => m.to)
  }

  /** Clone this engine state */
  clone() {
    return new ChessEngine(this.fen)
  }

  /** Check if the current position matches a target FEN (ignoring clocks) */
  matchesFen(targetFen) {
    const normalize = fen => fen.split(' ').slice(0, 4).join(' ')
    return normalize(this.fen) === normalize(targetFen)
  }
}

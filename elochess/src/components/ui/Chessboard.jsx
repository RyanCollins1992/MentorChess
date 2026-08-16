import { useMemo, useState } from 'react'
import { Chessboard as RawChessboard } from 'react-chessboard'
import { ChessEngine } from '../../core/ChessEngine'
import { useAppStore } from '../../store/useAppStore'
import { KNIGHTPATH_THEME } from '../../styles/knightpath'
import { DEFAULT_PIECE_STYLE_ID } from '../../styles/pieceStyles'
import { DURATION } from '../../styles/motion'

// "Classic" — the plain Unicode chess glyphs (matching KnightPath's own
// source design's `GLYPHS` map exactly — no illustrated artwork, no special
// display font), white filled solid with a dark drop-shadow for contrast,
// black filled solid with a light drop-shadow. This is the app's default
// piece style.
//
// The wrapper uses position:absolute + inset:0 rather than width/height:100%
// — react-chessboard nests the piece inside several of its own wrapper divs
// before reaching this component's own root, and at least one of those
// doesn't propagate a definite height, so a plain height:100% here silently
// collapses to fit content instead of the square. Absolute positioning
// anchors directly to the nearest positioned ancestor instead.
//
// Font size is set via a two-element container-query split (outer div
// establishes container-type: inline-size, inner span sizes in cqw) rather
// than a plain "%" font-size, which resolves against the *inherited*
// font-size (cascaded from body) rather than this wrapper's actual pixel
// size. Making the same element both the query container and the thing
// sized in cqw is a real cyclic dependency in practice — Chromium falls
// back to resolving cqw against the viewport instead.
const GLYPHS = {
  wP: '♙', wR: '♖', wN: '♘', wB: '♗', wQ: '♕', wK: '♔',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚',
}

// Shared wrapper for any glyph-based piece set — see the sizing/positioning
// notes above about the absolute+container-query approach. `styleFor` gets
// (isWhite) and returns the span's color/textShadow/stroke.
function glyphPieceSet(glyphs, styleFor) {
  return Object.fromEntries(
    Object.entries(glyphs).map(([code, glyph]) => {
      const isWhite = code[0] === 'w'
      return [code, () => (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            containerType: 'inline-size',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '76cqw', lineHeight: 1,
              ...styleFor(isWhite),
            }}
          >
            {glyph}
          </span>
        </div>
      )]
    })
  )
}

const CLASSIC_PIECES = glyphPieceSet(GLYPHS, isWhite => ({
  color: isWhite ? '#fff' : '#111',
  textShadow: isWhite ? '0 1px 3px rgba(0,0,0,0.9)' : '0 1px 2px rgba(255,255,255,0.15)',
}))

// "Fantasy" piece set by Maurizio Monge (github.com/maurimo/chess-art),
// MIT licensed — see the About & Licenses section in SettingsPage.jsx.
// Ornate ivory/ebony-style artwork (crowned king/queen, castle-turret rook,
// crosier-topped bishop). Served as static files (public/pieces/fantasy/)
// rather than the library's function-based defaultPieces, because these
// SVGs mix flat fill classes and gradients inconsistently across files —
// too fragile to safely re-target by string substitution. Instead a single
// CSS filter warms/darkens the two sides uniformly, plus a drop-shadow for
// a carved, relief look instead of a flat sticker fill.
const PIECE_FILTERS = {
  w: 'sepia(0.35) saturate(1.3) brightness(0.97) drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))',
  b: 'brightness(0.55) sepia(0.25) saturate(1.2) drop-shadow(0 1px 1.5px rgba(0,0,0,0.6))',
}
const FANTASY_PIECES = Object.fromEntries(
  ['P', 'R', 'N', 'B', 'Q', 'K'].flatMap(type => ['w', 'b'].map(color => {
    const code = color + type
    return [code, () => (
      <img
        src={`/pieces/fantasy/${code}.svg`}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', filter: PIECE_FILTERS[color] }}
      />
    )]
  }))
)

// "Skulls" piece set, also by Maurizio Monge (github.com/maurimo/chess-art,
// fancy/skulls/), MIT licensed — same repo/license as Fantasy, credited
// alongside it in SettingsPage.jsx. Unlike Fantasy's shared ivory/ebony line
// art recolored per side, each Skulls piece is already its own fully painted
// artwork for both colors (distinct crown/turban vs. thorned-crown styling,
// not just a palette swap), so no PIECE_FILTERS recolor pass is needed —
// just a drop-shadow to match the other sets' sense of depth.
const SKULLS_PIECES = Object.fromEntries(
  ['P', 'R', 'N', 'B', 'Q', 'K'].flatMap(type => ['w', 'b'].map(color => {
    const code = color + type
    return [code, () => (
      <img
        src={`/pieces/skulls/${code}.svg`}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
      />
    )]
  }))
)

const PIECE_SETS = {
  classic: CLASSIC_PIECES,
  fantasy: FANTASY_PIECES,
  skulls: SKULLS_PIECES,
}

// Tiny sword marking a legal (non-capture) destination square, in place of a
// plain dot — a data-URI SVG so it can be set via squareStyles'
// backgroundImage like the dot it replaces, no extra DOM node needed.
// Blade + crossguard + grip + pommel as separate subpaths in one <path>.
const LEGAL_MOVE_SWORD_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='rgba(0,0,0,0.4)' d='M50 2 L64 62 L36 62 Z M20 64 H80 V76 H20 Z M42 76 H58 V90 H42 Z M50 88 L57 95 L50 100 L43 95 Z'/></svg>`
const LEGAL_MOVE_SWORD_URL = `url("data:image/svg+xml,${encodeURIComponent(LEGAL_MOVE_SWORD_SVG)}")`

function findKingSquare(board, color) {
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square
    }
  }
  return null
}

export function Chessboard({
  options = {},
  customBoardStyle,
  customDarkSquareStyle,
  customLightSquareStyle,
  customSquareStyles,
  arePiecesDraggable,
  position,
  onPieceDrop,
  lastMove,
  ...props
}) {
  // Tracks the FEN the selection was made against, so a position change from
  // outside (a move was made, puzzle reset, etc.) implicitly drops it without
  // needing a synchronizing effect.
  const [selection, setSelection] = useState(null) // { square, atPosition } | null
  const selectedSquare = selection?.atPosition === position ? selection.square : null

  const animateMoves = useAppStore(s => s.settings.animateMoves) !== false
  const showCoords = useAppStore(s => s.settings.showCoords) !== false
  const pieceStyle = useAppStore(s => s.settings.pieceStyle) || DEFAULT_PIECE_STYLE_ID
  const theme = KNIGHTPATH_THEME

  // Read-only parse of the FEN for legal-move highlighting and the check indicator.
  // Never mutates any page's own game state.
  const engine = useMemo(() => {
    if (!position || typeof position !== 'string') return null
    try { return new ChessEngine(position) } catch { return null }
  }, [position])

  const autoSquareStyles = useMemo(() => {
    const styles = {}
    if (!engine) return styles

    // Last-move glow (+ a one-shot brighter flash layered on top for
    // captures) — both squares of the most recently played move, applied
    // before the check/selection styles below so those can still win on a
    // shared square (e.g. the king square glowing red for check takes
    // priority over a same-square last-move gold pulse).
    if (lastMove?.from && lastMove?.to) {
      const animation = lastMove.captured
        ? 'last-move-glow 1.6s ease-in-out infinite, capture-impact 0.5s ease-out 1'
        : 'last-move-glow 1.6s ease-in-out infinite'
      styles[lastMove.from] = { ...styles[lastMove.from], animation }
      styles[lastMove.to]   = { ...styles[lastMove.to], animation }
    }

    if (engine.isCheck) {
      const kingSquare = findKingSquare(engine.board, engine.turn)
      if (kingSquare) {
        styles[kingSquare] = { animation: 'check-blink 1s ease-in-out infinite' }
      }
    }

    if (arePiecesDraggable && selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: 'rgba(255, 215, 0, 0.35)',
        transition: `background-color ${DURATION.quick}s ease`,
      }
      for (const m of engine.legalMoves(selectedSquare)) {
        styles[m.to] = {
          ...styles[m.to],
          transition: `box-shadow ${DURATION.quick}s ease, background-color ${DURATION.quick}s ease`,
          ...(m.captured
            ? { boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.35)' }
            : {
                backgroundImage: LEGAL_MOVE_SWORD_URL,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: '38% 38%',
              }),
        }
      }
    }

    return styles
  }, [engine, arePiecesDraggable, selectedSquare, lastMove])

  const baseSquareStyles = customSquareStyles ?? options.squareStyles
  const mergedSquareStyles = useMemo(() => {
    if (!baseSquareStyles) return autoSquareStyles
    const merged = {}
    for (const sq of new Set([...Object.keys(autoSquareStyles), ...Object.keys(baseSquareStyles)])) {
      merged[sq] = { ...autoSquareStyles[sq], ...baseSquareStyles[sq] }
    }
    return merged
  }, [autoSquareStyles, baseSquareStyles])

  const handleSquareClick = ({ square, piece }) => {
    if (!arePiecesDraggable || !engine) return

    if (selectedSquare) {
      const target = engine.legalMoves(selectedSquare).find(m => m.to === square)
      if (target) {
        onPieceDrop?.({
          piece: { pieceType: target.color + target.piece.toUpperCase(), isSparePiece: false, position: '' },
          sourceSquare: selectedSquare,
          targetSquare: square,
        })
        setSelection(null)
        return
      }
    }

    const isOwnPiece = piece?.pieceType && piece.pieceType[0].toLowerCase() === engine.turn
    setSelection(isOwnPiece ? { square, atPosition: position } : null)
  }

  return (
    <div style={{ borderRadius: '3px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)' }}>
      <RawChessboard
        options={{
          ...props,
          ...options,
          position,
          pieces: options.pieces ?? PIECE_SETS[pieceStyle] ?? CLASSIC_PIECES,
          boardStyle: customBoardStyle ?? options.boardStyle,
          darkSquareStyle: customDarkSquareStyle ?? options.darkSquareStyle ?? { backgroundColor: theme.board.dark },
          lightSquareStyle: customLightSquareStyle ?? options.lightSquareStyle ?? { backgroundColor: theme.board.light },
          squareStyles: mergedSquareStyles,
          allowDragging: arePiecesDraggable ?? options.allowDragging,
          showAnimations: options.showAnimations ?? animateMoves,
          showNotation: options.showNotation ?? showCoords,
          animationDurationInMs: options.animationDurationInMs ?? DURATION.quick * 1000,
          onPieceDrop,
          onSquareClick: handleSquareClick,
        }}
      />
    </div>
  )
}

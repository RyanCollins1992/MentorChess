// Resolves a --color-* CSS custom property to its current literal value —
// needed anywhere a color has to be handed to something that can't consume
// var() reliably (SVG arrow/stroke colors, etc.). Falls back to a literal
// default for non-browser/test environments where the stylesheet isn't
// loaded. Generalizes what was previously duplicated inline in
// GameReviewPage.jsx's best-move-arrow color and useLiveEval.js's tactic
// arrows.
export function readThemeColor(varName, fallback) {
  return typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback
    : fallback
}

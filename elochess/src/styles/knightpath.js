/**
 * "KnightPath" — MentorChess's visual identity. Layout/structure (two-tone
 * sidebar, radius, fonts) sourced from a Figma Make design Ryan shared
 * (2026-07-15, `Ryan's Brain/Chess Info/Chess ui code/`). Colors were
 * re-derived 2026-07-17 from the actual MentorChess logo Ryan designed
 * (`Ryan's Brain/Chess Info/Chess related images/MentorChess Logo.jpg`) —
 * sampled with Pillow rather than eyeballed: background `#121315`, king
 * `#F8F4E9`, pawn/ring gold `#D6B37B`. Both light and dark themes below are
 * built from that same three-color family (near-black / warm cream / gold)
 * with the standard 60/30/10 UI split (60% base canvas, 30% card/surface,
 * 10% accent reserved for interactive elements) — not independently themed,
 * so switching modes changes lightness, not identity.
 *
 * Light mode's gold (`#8C6A28`) is deliberately deeper than the logo's own
 * rendered gold (`#D6B37B`, used as-is in dark mode) — verified via WCAG
 * contrast math (`_contrast_check.py`, run ad hoc, not kept in the repo):
 * the raw logo gold only hits 1.8:1 as text on cream and 2.0:1 as a white-
 * text button background, both well under the 4.5:1 AA minimum. `#8C6A28`
 * clears both (4.54:1 and 4.99:1) while staying visibly the same gold
 * family, not drifting into brown.
 *
 * One structural wrinkle: the sidebar is a fixed dark panel in *both* modes
 * (KnightPath's original two-tone layout — the content area is what
 * switches with the mode, the sidebar doesn't). It's now set to the logo's
 * own near-black (`#121315`) instead of the old navy `#1C2130`, so the
 * sidebar logo mark (public/mentorchess-icon.png, which has that same
 * near-black background baked into the image) sits on its native color
 * instead of a mismatched navy square. The shared `bg2` token can't cover
 * the sidebar too (it's "card background," which needs to stay light in
 * light mode to match content-area cards), so the sidebar keeps its own
 * `sidebarBg`/`sidebarBorder`/`sidebarText`/`sidebarMuted` fields that
 * Sidebar.jsx/Topbar.jsx read directly instead of through bg2/white/muted.
 */

const SIDEBAR = {
  sidebarBg: '#121315',
  sidebarBorder: 'rgba(255, 255, 255, 0.07)',
  sidebarText: '#F8F4E9',
  sidebarMuted: '#9C978A',
}

export const KNIGHTPATH_THEME = {
  id: 'knightpath',
  name: 'KnightPath',
  description: 'Warm cream dashboard with a near-black sidebar and the MentorChess logo\'s gold accent.',
  light: true,
  headingFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colors: {
    // 60% — base canvas: the logo's own cream (its king's color), used here
    // as the dominant surface rather than text.
    bg: '#F8F4E9',
    // 30% — card/surface tier: clean white cards on the cream base, plus a
    // deeper cream/tan for hover/alt-surface states.
    bg2: '#FFFFFF', bg3: '#EDE6D6',
    border: '#DFD6C0',
    // 10% — accent: deepened gold (see file header for the contrast math).
    gold: '#8C6A28', gold2: '#6E5220',
    // accent2 darkened from #B08D42 to #8C692D (2026-08-17, Lighthouse a11y
    // audit) — the original hit only 2.97:1 as small bold text (e.g. the
    // "beginner" difficulty badge); #8C692D clears 4.79:1.
    accent: '#8C6A28', accent2: '#8C692D',
    // Darkened from the original #8A8176 (2026-08-17, Lighthouse a11y audit)
    // — that value only hit 3.08:1 against bg3 and 3.83:1 against bg2/white,
    // both under the 4.5:1 AA minimum for the small text `muted` is used for
    // everywhere (sidebar labels, filter tabs, hints). #696055 clears both
    // (4.96:1 and 6.17:1) while staying the same warm-grey family.
    muted: '#696055', dim: '#C5BFB2',
    text: '#1C1A15', white: '#1C1A15',
    // Darkened from #DC2626 to #C81E1E (2026-08-17, Lighthouse a11y audit)
    // — the original hit only 4.47:1 as small bold text (e.g. the
    // "advanced" difficulty badge), just under the 4.5:1 minimum;
    // #C81E1E clears 5.31:1.
    danger: '#C81E1E',
  },
  chartColors: ['#8C6A28', '#1C6B9A', '#B58863', '#D97706', '#7C3AED'],
  board: { light: '#F0D9B5', dark: '#B58863' },
  boardTexture: null,
  ...SIDEBAR,
}

export const KNIGHTPATH_DARK_THEME = {
  ...KNIGHTPATH_THEME,
  id: 'knightpath-dark',
  name: 'KnightPath Dark',
  description: 'The logo\'s own near-black and gold, used directly rather than re-derived.',
  light: false,
  colors: {
    // 60% — base canvas: the logo's actual background color, sampled directly.
    bg: '#121315',
    // 30% — card/surface tier: lighter near-black steps for layering.
    bg2: '#1C1E22', bg3: '#26282E',
    border: '#33363D',
    // 10% — accent: the logo's own gold, used as-is (already 9.4:1 against
    // this background — no deepening needed the way light mode required).
    gold: '#D6B37B', gold2: '#B8905A',
    accent: '#D6B37B', accent2: '#E8D2A8',
    muted: '#8F8B80', dim: '#4B4740',
    text: '#F8F4E9', white: '#F8F4E9',
    danger: '#F87171',
  },
}

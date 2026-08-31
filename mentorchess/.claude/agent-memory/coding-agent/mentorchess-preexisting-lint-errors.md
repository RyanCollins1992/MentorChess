---
name: mentorchess-preexisting-lint-errors
description: mentorchess repo has ~123 pre-existing ESLint errors in page components unrelated to any test work — don't mistake them for regressions
metadata:
  type: project
---

`npm run lint` in the mentorchess project reports ~123 errors / 3 warnings that are pre-existing and unrelated to test-writing work: `react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/immutability`, `no-empty`, `no-unused-vars` findings in `src/pages/PuzzlesPage.jsx`, `src/pages/SpacedReviewPage.jsx`, `src/pages/VsCoachPage.jsx`, and `validate-traps.js` (e.g. `chessRef.current` read during render, `makeAiMove` used before declaration).

**Why:** Confirmed on 2026-06-20 while adding unit tests for `BaseManager`/`SpacedRepetitionEngine`/`ProgressManager`/`AICoach`/`useAppStore`/`useOpeningsStore` — running `npm run lint` against the whole repo surfaces these every time, but they live in files untouched by that work.

**How to apply:** When running `npm run lint` after a change, lint only the files you touched (`npx eslint <paths>`) to get a clean signal, rather than treating the full-repo lint count as your pass/fail bar. Don't attempt to fix these pre-existing errors unless the task explicitly asks for it — they're out of scope for test-writing or unrelated feature work. See [[project-mentorchess-overview]] for general repo structure.

Per-file baseline for `src/pages/GameReviewPage.jsx` as of 2026-07-04: 3 errors + 1 warning (unused `useCallback` import, unused `navigate`, `react-hooks/set-state-in-effect` in the PGN-parse effect, missing `showToast` dep). Was 6 errors before the dead FenImport/ImageImport components were deleted and UrlImport was wired up that day.

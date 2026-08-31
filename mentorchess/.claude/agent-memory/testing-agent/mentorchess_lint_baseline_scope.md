---
name: mentorchess-lint-baseline-scope
description: A prior agent's claim that "pre-existing lint errors are confined to 4 named files" did not hold up — the real pre-existing baseline spans 14+ files. Always run `npx eslint <file>` per-file to verify scope claims rather than trusting a file list.
metadata:
  type: project
---

On 2026-06-20, a coding-agent handoff claimed lint was "clean on test files, ~123 pre-existing errors only in `PuzzlesPage.jsx`/`SpacedReviewPage.jsx`/`VsCoachPage.jsx`/`validate-traps.js`". Independent verification (`npm run lint` cold, then `npx eslint <file>` on each of the 4 named files individually) found:

- Total lint output: 125 problems (122 errors + 3 warnings) — count was roughly right.
- The 4 named files only account for 15 of those problems (14 errors + 1 warning: PuzzlesPage 2, SpacedReviewPage 1, VsCoachPage 9 errors + 1 warning, validate-traps.js 2).
- The remaining ~110 errors are spread across 10+ other files never mentioned in the claim: `Sidebar.jsx`, `AICoachPanel.jsx`, `AICoach.js`, `useChessBoard.js`, `EndgamesPage.jsx`, `FavouritesPage.jsx`, `FreePlayPage.jsx`, `GameReviewPage.jsx`, `ImportGamesPage.jsx`, `LearnOpeningsPage.jsx`, `MemoryDrillPage.jsx`, `OpeningQuizPage.jsx`, `OpeningsPage.jsx`, plus a bundled `public/stockfish/*.js` vendor file (expected — it's third-party/generated code, not lintable source).

**Why:** The aggregate error *count* matched the claim closely enough to look correct at a glance, masking the fact that the *file scope* was wrong. This matters because if a future task is "fix all lint errors in files X/Y/Z," trusting the stale scope list would leave the bulk of errors unaddressed. Confirmed (via `git diff <file>` on `Sidebar.jsx`, which was modified today) that the errors in touched files are on lines unrelated to today's edits — so this is a documentation/reporting-accuracy issue, not a functional regression introduced by today's work.

**How to apply:** Never trust a prior agent's "pre-existing errors are confined to file list X" claim without independently running `npx eslint <file>` per file. A matching aggregate count is not sufficient evidence — the file-level breakdown can still be wrong. When git history is available, also diff the specific lines flagged against today's changes to confirm "pre-existing" really means "not touched by this session," not just "exists somewhere."

**Second occurrence (also 2026-06-20, later pass):** a "lint is clean on the specific lines changed in VsCoachPage.jsx" claim ran into a related but distinct trap: `react-hooks/immutability`'s "accessed before declared" rule reports an error whose highlighted range spans an entire function body (e.g. all of `makeAiMove`, lines 131-151), not just the violating reference line. New guard lines added inside that function (132, 136, 150) fall inside the pre-existing error's reported span even though they didn't cause it. Verified via `git show HEAD:<path>` + lint-on-original that the same error existed before, on the same root line (the TDZ reference to `makeAiMove` from inside the earlier `useEffect`), so it wasn't a new regression — but "clean on the changed lines" is misleading phrasing when a changed line sits inside a pre-existing multi-line error span. When checking line-level lint cleanliness, always check whether a flagged "pre-existing" error's *reported range* (not just its origin line) overlaps the diff, and trace to the original file to confirm the error's root cause predates the change.

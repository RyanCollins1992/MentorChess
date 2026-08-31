---
name: project-mentorchess-overview
description: MentorChess React+Vite chess app structure — pages, store, SM-2 engine, where nav lives
metadata:
  type: project
---

MentorChess is a React 19 + Vite chess training app. It IS under git — the repo root is one level up (`elochess-react/`, unrenamed local container folder), not the working directory. Do NOT commit; the user reviews and commits changes themselves (confirmed 2026-07-04).

Key structure:
- `src/App.jsx` — maps `currentPage` (from `useAppStore`) to page components via a `PAGES` lookup object.
- `src/store/useAppStore.js` — global state. `navigate(page)` sets `currentPage` and closes the sidebar. `showToast(message, type, duration)` shows toasts (default type 'info', duration 3000ms).
- `src/components/layout/Sidebar.jsx` — main nav list (`NAV` array of `{id, label, icon}` + section headers). `src/components/layout/Topbar.jsx` — page title bar, also a good place for one-off icon-button navigation triggers (e.g. settings gear) since it already has `useAppStore` wired in.
- `src/core/SpacedRepetitionEngine.js` — SM-2-based spaced repetition engine (`srsEngine` singleton). Quality scale: 0=fail (programmatic only, not exposed in UI), 1=Hard, 2=Good, 3=Easy (UI only exposes 1/2/3 via `SpacedReviewPage.jsx`'s `RateCard`). Also has a separate user-set `rating` field (1=easy..3=hard, set via `RateDifficultyPage.jsx`'s star UI) that further nudges `easeFactor` independently of the per-review `quality` SM-2 adjustment — don't conflate the two.
- `src/core/BaseManager.js` — base class all `*Manager`/`*Engine` singletons extend; provides `_load`/`_save` (localStorage JSON), `emit`/`on` (event bus), `_log`/`_warn`.
- VsCoachPage.jsx spins up a Stockfish Web Worker from a CDN URL (`cdn.jsdelivr.net`) for AI moves; falls back to picking a random legal move when the engine is unavailable. Its `GameScreen` uses an `isMountedRef` (set false in the worker-init effect's cleanup) to guard `makeAiMove`'s post-await state updates, since "New Game" remounts via `key={gameKey}` as well as router navigation.

See [[playwright-cors-worker-gotcha]] for a Playwright testing gotcha specific to this Worker setup, [[mentorchess-vitest-jsx-config-gap]] for a vitest config issue that blocked all `.test.jsx` component tests until 2026-06-20, and [[react19-no-unmount-warning]] for why "did it throw/warn" isn't a valid way to test unmount guards in this React version.

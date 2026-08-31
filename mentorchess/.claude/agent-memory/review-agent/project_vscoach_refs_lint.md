---
name: project-vscoach-refs-lint
description: Pre-existing react-hooks/refs lint error in VsCoachPage.jsx reading chessRef.current during render, confirmed not a regression as of the 2026-06-20 isMountedRef fix
metadata:
  type: project
---

`src/pages/VsCoachPage.jsx` lines ~200 and ~202 read `chessRef.current.inCheck()` and `chessRef.current.turn()` directly inside JSX render (status banner), which trips the `react-hooks/refs` ESLint rule ("Cannot access refs during render"). Confirmed via `npx eslint src/pages/VsCoachPage.jsx` on 2026-06-20.

**Why:** This predates the `isMountedRef` unmount-guard fix landed the same day (see [[project_vscoach_test_gap]]) — the fix only touches `makeAiMove`, the worker-init cleanup effect, and adds the `isMountedRef` declaration. The render-time ref reads are untouched, so this is not a regression introduced by that change; it's accepted as a known pre-existing issue and approved without blocking on it.

**How to apply:** Don't block approval on this lint error if a diff doesn't touch lines 200/202 region. Do flag it as a non-blocking follow-up each time VsCoachPage.jsx is reviewed, until someone actually fixes it (likely by deriving the status banner from existing `status`/`gameOver` state rather than reading `chessRef.current` at render time). If a future diff *does* touch this region, treat it as in-scope and require the fix.

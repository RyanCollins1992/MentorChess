---
name: project-vscoach-test-gap
description: VsCoachPage.jsx race-condition coverage history — was untested as of 2026-06-20 AM, gained RTL tests + isMountedRef fix same day PM
metadata:
  type: project
---

`src/pages/VsCoachPage.jsx` contains a 5s Stockfish UCI-handshake timeout with
a random-move fallback, plus an `isMountedRef` guard (added 2026-06-20) on
`makeAiMove` to stop post-unmount state updates when a `bestmove` reply
arrives late. `src/pages/VsCoachPage.test.jsx` now exists (3 tests, confirmed
passing via `npx vitest run` on 2026-06-20) and a throwaway test during the
testing pass independently drove the component mid-flight (handshake done,
`go depth` sent) then unmounted and fired a late `bestmove`, confirming zero
post-unmount `postMessage` calls.

**Why:** This file has the highest race-condition risk in the app (timer vs.
worker message ordering, unmount cleanup, double-move risk) — exactly the bug
class unit tests for other modules can't catch. The original gap (zero
coverage) is now closed for the unmount-race scenario specifically; this
memory previously said "zero coverage," which is now stale and would have
caused a false rejection if trusted without re-checking.

**How to apply:** When reviewing future changes to `VsCoachPage.jsx` (or
similar Worker/timeout-based components), don't assume coverage from the
overall test count — verify per-file. As of 2026-06-20 `VsCoachPage.test.jsx`
covers the unmount race; check it still exists and still covers the scenario
you're reviewing before citing this memory, since component logic here
changes quickly. See [[project_vscoach_refs_lint]] for the separate
pre-existing lint issue in the same file.

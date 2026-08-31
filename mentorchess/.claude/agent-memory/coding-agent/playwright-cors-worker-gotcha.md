---
name: playwright-cors-worker-gotcha
description: Playwright route interception on cross-origin Worker scripts triggers CORS construction failure, not a load/timeout failure — can't simulate a "hanging" worker that way
metadata:
  type: feedback
---

When testing code that does `new Worker('https://some-cdn.com/script.js')` (classic, cross-origin), intercepting that URL with Playwright's `page.route(...).abort()` OR `.fulfill()` does NOT simulate "the resource failed to load" or "the resource hangs" — instead, Chromium throws synchronously at `new Worker(...)` construction time with a CORS error ("Failed to construct 'Worker': Script ... cannot be accessed from origin ..."), because intercepted/faked responses don't carry the right cross-origin headers needed for a classic worker fetch.

**Why this matters:** if the code under test has both (a) a synchronous `try/catch` around `new Worker(...)` and (b) an async timeout for "handshake never completes", route-blocking the worker URL will only ever exercise path (a), never (b) — even though both are real, valid production failure modes (CORS/ad-blocker vs. genuinely slow/hanging worker).

**How to apply:** to actually exercise the async "worker loaded fine but never responds" path in a test, use `page.addInitScript()` to override `window.Worker` with a same-origin `Blob`-URL-backed worker (`URL.createObjectURL(new Blob([...]))`) that has a handler that never replies. This constructs successfully (no CORS issue, same-origin blob) and lets you test real handshake-timeout logic. Confirmed working in [[project-mentorchess-overview]]'s VsCoachPage Stockfish-worker-timeout fix.

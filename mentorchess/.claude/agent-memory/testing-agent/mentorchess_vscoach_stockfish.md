---
name: mentorchess-vscoach-stockfish
description: VsCoachPage's Stockfish worker fallback ("random AI moves") was only reachable from the readyok handler when playing as Black, causing an infinite hang if readyok never fired. Fixed 2026-06-20 with a 5s handshake timeout; fix independently re-verified same day.
metadata:
  type: project
---

`src/pages/VsCoachPage.jsx` loads Stockfish via `new Worker('https://cdn.jsdelivr.net/...')`. Originally, when `playerColor === 'b'`, `makeAiMove()` was only invoked inside the `readyok` branch of `worker.onmessage` — if the worker loaded but the UCI handshake never completed, the board hung forever with no error and no toast.

**Fix (2026-06-20):** added a `setTimeout(..., 5000)` (`handshakeTimer`) alongside the existing synchronous try/catch. If `readyok` hasn't fired within 5s, it shows a "Using random AI moves" toast and calls `makeAiMove()` regardless of color. `clearTimeout(handshakeTimer)` runs in the `readyok` branch so a late-but-successful handshake doesn't double-fire.

**Why:** Confirmed via direct code read + live Playwright re-verification that this was a genuine code-path asymmetry (White had a reachable fallback via `handleDrop`, Black didn't), and that the fix's two distinct failure modes need separate test techniques:
1. **Synchronous worker-construction failure** (CDN blocked/CORS/404) — easy to simulate with `page.route('**/stockfish**', route => route.abort())`, throws immediately inside the `try`, hits the `catch` block instantly (~500ms), never exercises the 5s timer.
2. **Genuine handshake-timeout path** (worker constructs fine, never replies) — Playwright's `page.route()` / `context.route()` / CDP `Network.setBlockedURLs` do **NOT** intercept requests made by dedicated Workers in this Chromium/Playwright combo (1.61.0) — blocking at any of those layers just causes a synchronous CORS-style construction throw, same as failure mode 1. The only way to exercise the real 5s timer branch is `page.addInitScript()` overriding `window.Worker` with a fake class that constructs successfully and silently swallows `postMessage` (never calls `onmessage`). Confirmed: with that technique, the toast and fallback move land right around the 5000ms mark (not ~500ms), proving the timer path specifically — whereas the route-blocking technique only proves the try/catch path.

**How to apply:** When testing any Worker-based engine integration in this codebase, test failure mode 1 (construction throw) and failure mode 2 (silent hang past timeout) as two separate Playwright tests using the techniques above — don't assume blocking the network request exercises the timeout branch. Also test the inverse (fast successful handshake) to confirm the timer is cleared and doesn't double-fire a fallback after a real response already arrived.

---
name: mentorchess-routing
description: MentorChess (React+Vite chess app) uses a custom page-switcher (no react-router) — routes can exist in App.jsx's PAGES map but have no sidebar/topbar entry point, making them silently unreachable.
metadata:
  type: project
---

MentorChess (`C:\Users\colli\OneDrive\Documents\elochess-react\mentorchess`) is a single-page app driven by `src/App.jsx`'s `PAGES` map keyed by `currentPage` in `useAppStore` (zustand). There is no react-router despite the dependency being installed.

Navigation entry points live in exactly two places: `src/components/layout/Sidebar.jsx`'s `NAV` array, and occasionally buttons elsewhere (e.g. Topbar) that call `navigate(id)`. A route can be fully wired into `PAGES` (App.jsx) and `PAGE_TITLES` (Topbar.jsx) and still be **completely unreachable** if no button anywhere calls `navigate('that-id')`. Found exactly this bug for the `settings` route on 2026-06-20 — it renders fine once reached, but no UI element triggers navigation to it.

**Why:** This app has had at least two orphaned-route incidents (`learn-openings` was orphaned until "today," and `settings` was found orphaned in the same session). The bug class is invisible from a console-error sweep — the page itself throws no errors, it's just unreachable.

**How to apply:** When QA'ing this app, always cross-check `grep -n "navigate(" src -r` or grep for `PAGES`/`Sidebar NAV` membership against every key in `App.jsx`'s `PAGES` map, not just click through the sidebar. A route missing from `Sidebar.jsx` NAV is a major/critical bug even if the page component itself is bug-free. See [[mentorchess-vscoach-stockfish]] for a related "code exists but path is unreachable" pattern.

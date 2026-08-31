# MentorChess — Claude Code Agent

## Project Overview
MentorChess is a chess training application targeting **Android, iOS, and Web** via Capacitor.
The dev server runs at `http://localhost:5173`. Always run npm commands from the `mentorchess/` subfolder.

> 📖 **Chess Knowledge Base:** See `chess-agent.md` in this folder for chess rules, openings, tactics, endgames, ELO ratings, and implementation references. Use it to answer any chess-related questions during development.

---

## Stack
| Layer | Technology |
|---|---|
| Build | Vite |
| UI | React (functional components + hooks) |
| Styling | Tailwind CSS v3 (no JIT custom classes — use only pre-defined utility classes) |
| Chess logic | chess.js |
| Board rendering | react-chessboard |
| State management | Zustand (store in `src/store/`) |
| Spaced repetition | SM-2 algorithm (custom implementation) |
| Engine analysis | Stockfish |
| Game import | Chess.com public API |
| Mobile | Capacitor (`capacitor.config.json`) |

---

## Folder Structure
```
mentorchess/
├── dist/                        # Build output
├── public/                      # Static assets
├── src/
│   ├── assets/                  # Images, icons
│   ├── components/              # Shared/reusable UI components
│   ├── core/                    # Core chess logic (engine wrappers, SM-2, etc.)
│   ├── data/                    # Static data (openings, puzzles, trap definitions)
│   ├── hooks/                   # Custom React hooks
│   ├── pages/                   # One file per route/screen (see below)
│   ├── store/                   # Zustand store slices
│   ├── styles/                  # Global styles
│   ├── utils/                   # Helper functions
│   ├── App.jsx                  # Root component + routing
│   ├── App.css
│   ├── main.jsx                 # Entry point
│   └── index.css
├── capacitor.config.json
├── eslint.config.js
├── generate-traps.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── validate-traps.js
└── vite.config.js
```

### Pages (`src/pages/`)
| File | Purpose |
|---|---|
| `OpeningsPage.jsx` | Browse and study chess openings |
| `LearnOpeningsPage.jsx` | Interactive opening learning |
| `OpeningQuizPage.jsx` | Quiz on learned openings |
| `SpacedReviewPage.jsx` | SM-2 spaced repetition review session |
| `PuzzlesPage.jsx` | Tactical puzzles |
| `MatePatternPage.jsx` | Checkmate pattern drills |
| `MemoryDrillPage.jsx` | Memory-based position drills |
| `EndgamesPage.jsx` | Endgame technique practice |
| `VsCoachPage.jsx` | Play against the Stockfish engine at a chosen difficulty |
| `FreePlayPage.jsx` | Free play board |
| `ImportGamesPage.jsx` | Import games via Chess.com API |
| `GameReviewPage.jsx` | Review imported games with Stockfish |
| `ProgressPage.jsx` | User stats and progress tracking |
| `EloRoadmapPage.jsx` | ELO improvement roadmap |
| `FavouritesPage.jsx` | Saved positions/openings |
| `PieceValuesPage.jsx` | Educational piece value reference |
| `RateDifficultyPage.jsx` | Rate puzzle/drill difficulty |
| `SettingsPage.jsx` | App settings |

---

## Chess Agent Instructions

When asked any chess question during development, consult `chess-agent.md` for reference. This includes:

- **Opening questions** — naming, move orders, character of positions
- **Tactical patterns** — for generating puzzles, hints, or descriptions
- **Endgame technique** — for EndgamesPage content or logic validation
- **ELO guidance** — for EloRoadmapPage content and rating thresholds
- **Stockfish UCI** — for engine integration in GameReviewPage
- **SM-2 algorithm** — for SpacedReviewPage logic
- **Chess.com API** — for ImportGamesPage endpoints
- **Chess terminology** — for UI labels, tooltips, and copy

**Example questions this agent can answer:**
- "What moves make up the Sicilian Najdorf?"
- "How does the SM-2 interval calculation work?"
- "What UCI command do I use to set a position by FEN?"
- "What's a smothered mate?"
- "What ELO range should I target for the intermediate roadmap?"

---

## Critical Patterns & Known Bugs

### ⚠️ Stale Closure Bug (RESOLVED — do not revert)
Chess instances and move indices **must** use `useRef`, not `useState`, to avoid stale closures in `useCallback`.
Only use `useState` for FEN strings (to trigger re-renders).

```jsx
// ✅ CORRECT
const chessRef = useRef(new Chess());
const moveIndexRef = useRef(0);
const [fen, setFen] = useState(chessRef.current.fen());

const handleMove = useCallback((from, to) => {
  const chess = chessRef.current; // Always fresh reference
  const move = chess.move({ from, to, promotion: 'q' });
  if (move) setFen(chess.fen());
}, []); // No deps needed — reads from ref

// ❌ WRONG — causes stale closure
const [chess] = useState(new Chess());
const handleMove = useCallback((from, to) => {
  chess.move(...); // Stale after re-renders
}, [chess]);
```

### State Management
- Use **Zustand** for cross-page state (progress, settings, favourites, streaks)
- Use local `useState`/`useRef` for page-level chess logic
- Do not use Context API unless already established

### Styling
- **Tailwind CSS v3 only** — no arbitrary values like `bg-[#fff]` unless absolutely necessary
- Dark theme is the default — assume dark backgrounds
- Keep mobile-first layouts (app targets phones)

### Capacitor
- After any build, run `npx cap sync` to update native projects
- Do not modify `capacitor.config.json` without checking iOS/Android targets

---

## Commands
```bash
# Always run from mentorchess/ subfolder
cd mentorchess

npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npx cap sync         # Sync to native Capacitor projects
npx cap open android # Open in Android Studio
npx cap open ios     # Open in Xcode
```

---

## Conventions
- **Components**: PascalCase filenames, functional components with hooks
- **Pages**: Each page is self-contained in `src/pages/`, named `*Page.jsx`
- **Hooks**: Prefixed with `use`, located in `src/hooks/`
- **No class components**
- **No `<form>` tags** — use `onClick`/`onChange` handlers instead
- Keep chess logic out of JSX — abstract into hooks or `src/core/`

---

## Do Not
- Do not use `localStorage` or `sessionStorage` directly — route persistence through Zustand
- Do not install new major dependencies without checking Capacitor compatibility
- Do not remove the `useRef` pattern for Chess instances (stale closure fix)

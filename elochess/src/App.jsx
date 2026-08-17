import { lazy, Suspense } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AppLayout from './components/layout/AppLayout'
import { useAppStore } from './store/useAppStore'
import { pageTransition, pageTransitionReduced } from './styles/motion'

// Each page is its own chunk, fetched only when the user actually navigates
// to it — previously all 20 pages (plus everything they import: stockfish,
// recharts, react-chessboard, ...) were bundled into one 1.36MB/352KB-gzip
// JS file loaded up front regardless of which single page you landed on.
const DashboardPage       = lazy(() => import('./pages/DashboardPage'))
const OpeningsPage        = lazy(() => import('./pages/OpeningsPage'))
const SpacedReviewPage    = lazy(() => import('./pages/SpacedReviewPage'))
const ProgressPage        = lazy(() => import('./pages/ProgressPage'))
const PuzzlesPage         = lazy(() => import('./pages/PuzzlesPage'))
const EndgamesPage        = lazy(() => import('./pages/EndgamesPage'))
const MatePatternsPage    = lazy(() => import('./pages/MatePatternsPage'))
const SettingsPage        = lazy(() => import('./pages/SettingsPage'))
const VsCoachPage         = lazy(() => import('./pages/VsCoachPage'))
const FreePlayPage        = lazy(() => import('./pages/FreePlayPage'))
const MemoryDrillPage     = lazy(() => import('./pages/MemoryDrillPage'))
const OpeningQuizPage     = lazy(() => import('./pages/OpeningQuizPage'))
const RateDifficultyPage  = lazy(() => import('./pages/RateDifficultyPage'))
const FavouritesPage      = lazy(() => import('./pages/FavouritesPage'))
const PieceValuesPage     = lazy(() => import('./pages/PieceValuesPage'))
const EloRoadmapPage      = lazy(() => import('./pages/EloRoadmapPage'))
const ImportGamesPage     = lazy(() => import('./pages/ImportGamesPage'))
const GameReviewPage      = lazy(() => import('./pages/GameReviewPage'))
const ScoutOpponentPage   = lazy(() => import('./pages/ScoutOpponentPage'))
const OpeningDatabasePage = lazy(() => import('./pages/OpeningDatabasePage'))

const PAGES = {
  'dashboard':        DashboardPage,
  'openings':         OpeningsPage,
  'spaced-review':    SpacedReviewPage,
  'progress':         ProgressPage,
  'puzzles':          PuzzlesPage,
  'endgames':         EndgamesPage,
  'mate-patterns':    MatePatternsPage,
  'settings':         SettingsPage,
  'vs-coach':         VsCoachPage,
  'free-play':        FreePlayPage,
  'memory-drill':     MemoryDrillPage,
  'opening-quiz':     OpeningQuizPage,
  'rate-difficulty':  RateDifficultyPage,
  'favourites':       FavouritesPage,
  'piece-values':     PieceValuesPage,
  'elo-roadmap':      EloRoadmapPage,
  'import-games':     ImportGamesPage,
  'scout-opponent':   ScoutOpponentPage,
  'game-review':      GameReviewPage,
  'opening-database': OpeningDatabasePage,
}

function PageLoadingFallback() {
  return <div className="flex items-center justify-center h-full text-muted">⏳ Loading…</div>
}

export default function App() {
  const currentPage = useAppStore(s => s.currentPage)
  const reduceMotion = useReducedMotion()
  const PageComponent = PAGES[currentPage]

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          className="h-full"
          variants={reduceMotion ? pageTransitionReduced : pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Suspense fallback={<PageLoadingFallback />}>
            {PageComponent
              ? <PageComponent />
              : <div className="flex items-center justify-center h-full text-muted">Page not found</div>}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  )
}

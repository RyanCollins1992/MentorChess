import { useState } from 'react'
import { progressManager } from '../core/ProgressManager'
import { useAppStore } from '../store/useAppStore'
import Badge from '../components/ui/Badge'

const ROADMAP = [
  {
    range: '0–400',
    title: 'Complete Beginner',
    icon: '🐣',
    focus: 'Learn the rules and basic checkmates',
    goals: [
      'Understand how every piece moves',
      'Learn Scholar\'s Mate and how to defend it',
      'Practice checkmate with K+Q vs K',
      'Never leave pieces hanging (undefended)',
      'Castle your king early every game',
    ],
    traps: ['scholars-mate', 'back-rank-mate'],
    pages: ['mate-patterns', 'piece-values', 'endgames'],
    resources: ['Bobby Fischer Teaches Chess', 'Chess Fundamentals — José Raúl Capablanca'],
  },
  {
    range: '400–700',
    title: 'Beginner',
    icon: '🌱',
    focus: 'Stop blundering, learn basic tactics',
    goals: [
      'Recognise and avoid forks',
      'Spot pins and skewers',
      'Learn the back rank checkmate',
      'Trade pieces correctly (don\'t give away material)',
      'Develop all pieces before attacking',
    ],
    traps: ['fried-liver', 'legal-trap', 'london-trap'],
    pages: ['puzzles', 'mate-patterns', 'openings'],
    resources: ['Chess Tactics for Students — John Bain', 'Logical Chess: Move by Move — Irving Chernev'],
  },
  {
    range: '700–1000',
    title: 'Intermediate Beginner',
    icon: '📘',
    focus: 'Learn opening principles and tactics patterns',
    goals: [
      'Control the centre with pawns and pieces',
      'Learn 3–5 traps for white and black',
      'Solve 5+ puzzles per day',
      'Understand rook endgames',
      'Start using Spaced Review regularly',
    ],
    traps: ['budapest-white', 'elephant-trap', 'ponziani-trap'],
    pages: ['spaced-review', 'puzzles', 'endgames'],
    resources: ['Winning Chess Openings — Yasser Seirawan', '1001 Chess Sacrifices and Combinations — Fred Reinfeld'],
  },
  {
    range: '1000–1200',
    title: 'Club Player',
    icon: '♟',
    focus: 'Deepen opening repertoire, improve calculation',
    goals: [
      'Build a solid opening repertoire (5+ traps per colour)',
      'Calculate 2–3 moves ahead consistently',
      'Learn Lucena and Philidor rook endgames',
      'Recognise 8 core mate patterns',
      'Review your own games for mistakes',
    ],
    traps: ['stafford-gambit', 'budapest-black', 'traxler'],
    pages: ['openings', 'endgames', 'mate-patterns'],
    resources: ['My System — Aron Nimzowitsch', "Silman's Complete Endgame Course — Jeremy Silman"],
  },
  {
    range: '1200–1500',
    title: 'Intermediate',
    icon: '🏆',
    focus: 'Strategic play, positional understanding',
    goals: [
      'Understand pawn structure and weak squares',
      'Learn to create and exploit passed pawns',
      'Study prophylaxis — stop opponent\'s plans',
      'Practise vs. coach at Medium difficulty',
      'Import and review your own games',
    ],
    traps: ['caro-kann-trap', 'sicilian-trap'],
    pages: ['vs-coach', 'game-review', 'import-games'],
    resources: ["The Amateur's Mind — Jeremy Silman", 'How to Reassess Your Chess — Jeremy Silman'],
  },
  {
    range: '1500+',
    title: 'Advanced',
    icon: '👑',
    focus: 'Deep calculation, mastering complex endgames',
    goals: [
      'Master all endgame techniques',
      'Build a complete opening repertoire',
      'Calculate 5+ moves ahead in tactics',
      'Study grandmaster games',
      'Play vs. Coach on Hard/Expert mode',
    ],
    traps: ['stafford-gambit', 'traxler'],
    pages: ['vs-coach', 'endgames', 'puzzles'],
    resources: ["Dvoretsky's Endgame Manual — Mark Dvoretsky", 'My 60 Memorable Games — Bobby Fischer'],
  },
]

// Every tier gets the same quiet neutral card — matching the KnightPath
// reference design's own roadmap screen, which uses one neutral style plus
// a small status dot rather than a per-tier color rainbow. The current tier
// is singled out by its accent-colored sweep-frame ring alone (below).
const TIER_STYLE = { color: 'border-border bg-bg3', badge: 'text-muted' }

export default function EloRoadmapPage() {
  const navigate  = useAppStore(s => s.navigate)
  const currentElo = progressManager.currentElo
  const [expanded, setExpanded] = useState(null)

  const getCurrentStage = () => {
    for (let i = 0; i < ROADMAP.length; i++) {
      const [min, max] = ROADMAP[i].range.split('–').map(Number)
      if (currentElo >= min && (isNaN(max) || currentElo < max)) return i
    }
    return ROADMAP.length - 1
  }

  const currentStage = getCurrentStage()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-xl font-extrabold text-white font-heading">ELO Roadmap</h2>
        <p className="text-muted text-sm mt-0.5">Your structured path to chess improvement</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="bg-bg3 border border-border rounded-lg px-3 py-1.5 text-sm">
            <span className="text-muted">Current ELO: </span>
            <span className="text-gold font-bold">{currentElo}</span>
          </div>
          <div className="text-sm text-muted">
            Stage: <span className="text-white font-medium">{ROADMAP[currentStage]?.title}</span>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {ROADMAP.map((stage, i) => {
          const isCurrent = i === currentStage
          const isDone    = i < currentStage
          const isOpen    = expanded === i || isCurrent
          const tierStyle = TIER_STYLE

          const sweeps = isCurrent

          const card = (
            <div
              className={`rounded-xl border transition-all ${tierStyle.color} ${
                isCurrent && !sweeps ? 'ring-1 ring-gold/40' : ''
              }`}
            >
              {/* Stage header */}
              <button
                className="w-full flex items-center gap-4 px-4 py-4 text-left"
                onClick={() => setExpanded(isOpen && !isCurrent ? null : i)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
                  isDone    ? 'bg-accent2 border-accent2 text-white' :
                  isCurrent ? 'bg-gold border-gold text-bg' :
                  'bg-bg3 border-border text-muted'
                }`}>
                  {isDone ? '✓' : stage.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isDone ? 'text-muted' : 'text-white'}`}>
                      {stage.title}
                    </span>
                    {isCurrent && <Badge tone="brass" variant="solid">You are here</Badge>}
                  </div>
                  <div className={`text-xs mt-0.5 ${tierStyle.badge}`}>{stage.range} ELO · {stage.focus}</div>
                </div>

                <span className="text-muted text-sm shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
                  {/* Goals */}
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">✅ Goals at this level</div>
                    <ul className="space-y-1.5">
                      {stage.goals.map((goal, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted">
                          <span className="text-gold shrink-0 mt-0.5">→</span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested pages */}
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">📚 Study these sections</div>
                    <div className="flex flex-wrap gap-2">
                      {stage.pages.map(page => (
                        <button
                          key={page}
                          onClick={() => navigate(page)}
                          className="px-3 py-1.5 bg-bg3 border border-border rounded-lg text-xs font-medium text-white hover:border-gold/50 hover:text-gold transition-colors capitalize"
                        >
                          {page.replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recommended reading — real, level-appropriate chess
                      books rather than in-app links, matching the KnightPath
                      reference design's per-tier "Resources" list. */}
                  {stage.resources && (
                    <div>
                      <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">📖 Recommended reading</div>
                      <ul className="space-y-1.5">
                        {stage.resources.map((book, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted">
                            <span className="text-gold shrink-0 mt-0.5">·</span>
                            {book}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )

          return sweeps
            ? <div key={stage.range} className="sweep-frame">{card}</div>
            : <div key={stage.range}>{card}</div>

        })}
      </div>
    </div>
  )
}

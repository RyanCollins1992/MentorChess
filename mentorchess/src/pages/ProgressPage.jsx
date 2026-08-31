import { useMemo } from 'react'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { TRAPS } from '../data/traps'
import { PUZZLES } from '../data/puzzles'
import { PATTERNS } from '../data/matePatterns'
import { useAppStore } from '../store/useAppStore'

// Deliberately doesn't repeat Dashboard's XP/streak/ELO stat cards or ELO
// chart (2026-07-17) — those live there now, better implemented (a real
// recharts area chart vs. this page's old hand-rolled SVG). This page is
// the deeper all-time view: level progress, trap mastery, badges, and the
// XP-earning reference, none of which Dashboard covers.
export default function ProgressPage() {
  const progress = useAppStore(s => s.progress)
  const srsStats = useMemo(() => srsEngine.getStats(), [])

  const knownCount  = progress.knownCount
  const totalTraps  = TRAPS.length
  const masteredPct = totalTraps > 0 ? Math.round((knownCount / totalTraps) * 100) : 0

  const solvedPuzzles = useAppStore(s => s.solvedPuzzles)
  const matePatternsLearned = useAppStore(s => s.matePatternsLearned)

  // Skill Breakdown — the reference design's radar chart assumed 4-5
  // separately-tracked skill scores this app doesn't have; rather than
  // invent numbers to fill a radar shape, this uses the three real
  // per-feature completion rates the app already tracks, as plain bars
  // (matching this page's own existing Level/Trap-Mastery bar style rather
  // than introducing a new chart type this page has never used).
  const skills = [
    { label: 'Openings',      pct: totalTraps > 0 ? Math.round((knownCount / totalTraps) * 100) : 0, color: 'bg-accent2' },
    { label: 'Puzzles',       pct: PUZZLES.length > 0 ? Math.round((solvedPuzzles.length / PUZZLES.length) * 100) : 0, color: 'bg-gold' },
    { label: 'Mate Patterns', pct: PATTERNS.length > 0 ? Math.round((matePatternsLearned.length / PATTERNS.length) * 100) : 0, color: 'bg-accent' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white font-heading">My Progress</h2>
        <p className="text-muted text-sm mt-1">Track your chess improvement over time</p>
      </div>

      {/* Level */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-white">Level {progress.level}</div>
          <div className="text-xs text-muted">{progress.xpTotal} XP total</div>
        </div>
        <div className="h-2 bg-bg3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${Math.min(100, (progress.xpTotal % 200) / 2)}%` }}
          />
        </div>
        <div className="text-xs text-muted">
          {200 - (progress.xpTotal % 200)} XP to level {progress.level + 1}
        </div>
      </div>

      {/* Trap mastery */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-white">Trap Mastery</div>
          <div className="text-sm text-muted">{knownCount} / {totalTraps} known</div>
        </div>
        <div className="h-3 bg-bg3 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent2 rounded-full transition-all duration-700"
            style={{ width: `${masteredPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border text-center">
          <MiniStat label="Enrolled in SRS" value={srsStats.total} />
          <MiniStat label="Due Today"       value={srsStats.due} color="text-gold" />
          <MiniStat label="Mastered (21d+)" value={srsStats.mastered} color="text-accent2" />
        </div>
      </div>

      {/* Skill Breakdown */}
      <div className="card space-y-3">
        <div className="font-bold text-white">Skill Breakdown</div>
        <div className="space-y-3">
          {skills.map(skill => (
            <div key={skill.label}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-muted">{skill.label}</span>
                <span className="text-white font-medium">{skill.pct}%</span>
              </div>
              <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                <div className={`h-full ${skill.color} rounded-full transition-all duration-700`} style={{ width: `${skill.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="card space-y-3">
        <div className="font-bold text-white">Badges</div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {BADGES.map(badge => {
            const earned = progressManager.hasBadge(badge.id)
            return (
              <div key={badge.id} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                earned ? 'border-gold/40 bg-gold/5' : 'border-border bg-bg3 opacity-40 grayscale'
              }`}>
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-[10px] text-center text-muted leading-tight">{badge.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* XP breakdown */}
      <div className="card space-y-3">
        <div className="font-bold text-white">How to Earn XP</div>
        <div className="space-y-2">
          {XP_GUIDE.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="text-muted">{item.label}</span>
              <span className="text-gold font-bold">+{item.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function MiniStat({ label, value, color }) {
  return (
    <div className="px-3">
      <div className={`text-xl font-extrabold ${color || 'text-white'}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────

const BADGES = [
  { id: 'first_drill',    icon: '🎯', name: 'First Drill' },
  { id: 'streak_7',       icon: '🔥', name: '7-Day Streak' },
  { id: 'streak_30',      icon: '💎', name: '30-Day Streak' },
  { id: 'trap_master',    icon: '🪤', name: 'Trap Master' },
  { id: 'perfect_drill',  icon: '⭐', name: 'Perfect Drill' },
  { id: 'srs_100',        icon: '🧠', name: '100 Reviews' },
  { id: 'elo_600',        icon: '📈', name: 'Hit 600 ELO' },
  { id: 'elo_800',        icon: '🚀', name: 'Hit 800 ELO' },
  { id: 'elo_1000',       icon: '👑', name: 'Hit 1000 ELO' },
  { id: 'puzzle_50',      icon: '🧩', name: '50 Puzzles' },
  { id: 'all_white',      icon: '♟', name: 'All White Traps' },
  { id: 'all_black',      icon: '♜', name: 'All Black Traps' },
]

const XP_GUIDE = [
  { label: 'Complete a trap drill',   xp: 10 },
  { label: 'Perfect drill (no mistakes)', xp: 20 },
  { label: 'Spaced review card',      xp: 5  },
  { label: 'Solve a puzzle',          xp: 15 },
  { label: 'Puzzle streak of 5',      xp: 25 },
  { label: 'Complete an endgame',     xp: 20 },
  { label: 'Daily login',             xp: 10 },
  { label: 'Master a trap (21+ days)', xp: 50 },
]

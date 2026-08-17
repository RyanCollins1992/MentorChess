import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Flame, Trophy, Brain, Zap, TrendingUp, ChevronRight, BookOpen, Cpu, Flag, Crown, Mail } from 'lucide-react'
import { progressManager } from '../core/ProgressManager'
import { srsEngine } from '../core/SpacedRepetitionEngine'
import { TRAPS } from '../data/traps'
import { PUZZLES } from '../data/puzzles'
import { useAppStore } from '../store/useAppStore'
import NumberTicker from '../components/ui/NumberTicker'

/**
 * Dashboard — landing/overview page, sourced from the KnightPath reference
 * design (Ryan's Figma Make export, 2026-07-15). MentorChess had no such page
 * before this — it previously landed straight on Openings (see
 * store/useAppStore.js's default currentPage).
 *
 * The reference design's stat cards (Puzzles Today 8/10, Tactical Accuracy
 * 83%, Win Rate 67%, a 3-item Today's Goals checklist, per-opening Mastery
 * %) are hardcoded demo data in the source itself, not backed by any real
 * tracking in this app — there's no per-day puzzle counter, no move-accuracy
 * history, no aggregated coach-game win/loss log. Rather than copy those
 * numbers, this page shows the same layout rhythm using only what
 * ProgressManager/SpacedRepetitionEngine actually track: current ELO,
 * streak, XP, total drills, puzzles solved (lifetime, not "today"), and SRS
 * due count.
 */
export default function DashboardPage() {
  const progress = useAppStore(s => s.progress)
  const dueCount = useAppStore(s => s.dueCount)
  const solvedPuzzles = useAppStore(s => s.solvedPuzzles)
  const navigate = useAppStore(s => s.navigate)
  const showToast = useAppStore(s => s.showToast)

  // mailto: silently no-ops if there's no desktop mail client configured
  // (common — many people only use webmail), so also copy the address as a
  // fallback that always works. Doesn't preventDefault, so a real mail
  // client still opens too.
  const copyFeedbackEmail = () => {
    navigator.clipboard.writeText('MentorChessHelp@gmail.com')
    showToast('Email copied to clipboard', 'success', 1500)
  }

  const eloHistory = progressManager.eloHistory
  const srsStats = useMemo(() => srsEngine.getStats(), [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const dateLabel = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), [])

  const puzzlesRemaining = Math.max(0, PUZZLES.length - solvedPuzzles.length)

  // Only claim a rating delta if there's a real history point roughly a
  // month old to diff against — otherwise say nothing rather than guess.
  const eloDelta = useMemo(() => {
    if (eloHistory.length < 2) return null
    const cutoff = new Date().getTime() - 30 * 86400000
    const past = [...eloHistory].reverse().find(e => new Date(e.date).getTime() <= cutoff)
    if (!past) return null
    return progress.currentElo - past.elo
  }, [eloHistory, progress.currentElo])

  const dueTraps = useMemo(() => {
    const dueIds = srsEngine.getDueCards().map(c => c.trapId)
    return dueIds
      .map(id => TRAPS.find(t => t.id === id))
      .filter(Boolean)
      .slice(0, 2)
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-muted text-xs uppercase tracking-wide font-bold">{dateLabel}</div>
          <h2 className="text-2xl font-extrabold font-heading mt-1">{greeting}</h2>
          <p className="text-muted text-sm mt-1">
            {dueCount > 0 ? `${dueCount} card${dueCount === 1 ? '' : 's'} due for review` : 'No reviews due'}
            {puzzlesRemaining > 0 && ` · ${puzzlesRemaining} puzzle${puzzlesRemaining === 1 ? '' : 's'} to go`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-bg2 border border-border rounded-lg px-3 py-1.5">
            <Flame size={14} className="text-orange-500" />
            <NumberTicker value={progress.streak} className="font-extrabold text-sm tabular-nums" />
            <span className="text-muted text-xs">day streak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gold text-white rounded-lg px-3 py-1.5 font-extrabold text-sm">
            <Trophy size={14} />
            <NumberTicker value={progress.currentElo} className="tabular-nums" /> <span className="font-medium text-xs opacity-80">ELO</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Trophy}
          label="Current Rating"
          value={progress.currentElo}
          sub={eloDelta === null ? 'Your rating' : `${eloDelta >= 0 ? '↑' : '↓'} ${Math.abs(eloDelta)} pts vs 30d ago`}
          subTone={eloDelta === null ? 'muted' : eloDelta >= 0 ? 'positive' : 'danger'}
        />
        <StatCard icon={Brain} label="Due for Review" value={dueCount} sub={`${srsStats.total} enrolled`} />
        <StatCard icon={Zap} label="Puzzles Solved" value={solvedPuzzles.length} sub={`of ${PUZZLES.length}`} />
        <StatCard icon={TrendingUp} label="Total Drills" value={progress.totalDrills} sub={`Level ${progress.level}`} />
      </div>

      {/* Rating chart + Continue learning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold">Rating Progress</div>
            {eloHistory.length >= 2 && (
              <div className="text-xs text-muted">Last {eloHistory.length} recorded</div>
            )}
          </div>
          {eloHistory.length < 2 ? (
            <div className="text-muted text-sm py-8 text-center">Play more games to see your ELO trend</div>
          ) : (
            <RatingChart data={eloHistory} />
          )}
        </div>

        <div className="card space-y-4">
          <div className="font-bold">Continue Learning</div>
          <div className="space-y-2">
            <LearningRow
              icon={Brain}
              label="Spaced Review"
              detail={dueCount > 0
                ? `${dueCount} due${dueTraps.length ? ' · ' + dueTraps.map(t => t.name).join(', ') : ''}`
                : "You're all caught up"}
              onClick={() => navigate('spaced-review')}
            />
            <LearningRow
              icon={Zap}
              label="Puzzles"
              detail={puzzlesRemaining > 0 ? `${puzzlesRemaining} remaining` : 'All solved'}
              onClick={() => navigate('puzzles')}
            />
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="card space-y-3">
        <div className="font-bold">Jump back in</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink icon={BookOpen} label="Openings" onClick={() => navigate('openings')} />
          <QuickLink icon={Cpu} label="vs. Coach" onClick={() => navigate('vs-coach')} />
          <QuickLink icon={Flag} label="Endgames" onClick={() => navigate('endgames')} />
          <QuickLink icon={Crown} label="Mate Patterns" onClick={() => navigate('mate-patterns')} />
        </div>
      </div>

      {/* Feedback footer */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted pt-2">
        <Mail size={12} />
        <span>Have a suggestion?</span>
        <a href="mailto:MentorChessHelp@gmail.com?subject=MentorChess%20feedback" onClick={copyFeedbackEmail} className="text-gold hover:underline">Send feedback</a>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ label, value, sub, subTone = 'muted', icon: Icon }) {
  const subClass = subTone === 'positive' ? 'text-accent2' : subTone === 'danger' ? 'text-danger' : 'text-muted'
  return (
    <div className="card space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted uppercase tracking-wide font-bold">{label}</div>
        {Icon && <Icon size={14} className="text-muted" />}
      </div>
      <div className="text-2xl font-extrabold tabular-nums"><NumberTicker value={value} /></div>
      {sub && <div className={`text-xs ${subClass}`}>{sub}</div>}
    </div>
  )
}

function LearningRow({ label, detail, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-bg3 hover:bg-border/60 border border-border rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer"
    >
      {Icon && (
        <div className="w-8 h-8 rounded flex items-center justify-center bg-accent/10 shrink-0">
          <Icon size={14} className="text-accent" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted truncate">{detail}</div>
      </div>
      <ChevronRight size={14} className="text-muted shrink-0" />
    </button>
  )
}

function QuickLink({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 bg-bg3 hover:bg-border/60 border border-border rounded-lg px-3 py-4 transition-colors cursor-pointer"
    >
      <Icon size={20} className="text-accent" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function RatingChart({ data }) {
  const chartData = data.map(d => ({
    m: new Date(d.date).toLocaleDateString(undefined, { month: 'short' }),
    v: d.elo,
  }))
  const values = data.map(d => d.elo)
  const domain = [Math.min(...values) - 20, Math.max(...values) + 20]

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.14} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* SVG fill/stroke accept CSS var() directly, so this reads the same
              --color-* variables AppLayout swaps for Dark Mode — no separate
              dark-chart-colors config needed. */}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} domain={domain} />
          <Tooltip contentStyle={{ background: 'var(--color-bg2)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12, padding: '6px 10px', color: 'var(--color-white)' }} formatter={(v) => [`${v} ELO`, 'Rating']} />
          <Area type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={2} fill="url(#eloGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

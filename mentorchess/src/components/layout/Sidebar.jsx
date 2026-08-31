import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { NAV } from '../../data/navigation'
import { Flame, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { KNIGHTPATH_NAV_ICONS } from '../../styles/knightpathIcons'

export default function Sidebar() {
  const { currentPage, navigate, sidebarOpen, closeSidebar, progress, dueCount } = useAppStore()
  // Collapse state is deliberately session-only (not persisted to settings),
  // matching the source design's plain useState — a desktop-only density
  // toggle, not a preference worth surviving a reload.
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — fixed near-black (matching the logo) against a content
          area that switches with the mode (a two-tone layout), so it reads
          --color-sidebar-bg/-border/-text/-muted instead of the shared
          bg2/border/white/muted the content area uses — see
          styles/knightpath.js. */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col overflow-hidden
          transition-[width,transform] duration-200
          ${collapsed ? 'w-14' : 'w-56'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:z-auto
        `}
        style={{ backgroundColor: 'var(--color-sidebar-bg)', borderRight: '1px solid var(--color-sidebar-border)' }}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-2 py-4 shrink-0 ${collapsed ? 'px-3.5 justify-center' : 'px-4'}`}
          style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <img src="/mentorchess-icon.png" alt="MentorChess" className="w-7 h-7 rounded object-cover shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-base leading-none tracking-wide truncate" style={{ color: 'var(--color-sidebar-text)' }}>
                MentorChess
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-sidebar-muted)' }}>
                {progress.totalDrills} drills · {dueCount} due
              </div>
            </div>
          )}
          {/* Collapse toggle — desktop only, mirrors the mobile drawer's own
              open/close affordance rather than competing with it. */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex items-center justify-center p-1 rounded hover:bg-white/5 transition-colors shrink-0"
            style={{ color: 'var(--color-sidebar-muted)' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
          {NAV.map((item, i) =>
            item.section ? (
              collapsed ? (
                <div key={i} className="h-px mx-2 mb-2 mt-3" style={{ backgroundColor: 'var(--color-sidebar-border)' }} />
              ) : (
                <div
                  key={i}
                  className="text-[10px] font-bold uppercase tracking-widest px-3 pt-4 pb-1"
                  style={{ color: 'var(--color-sidebar-muted)' }}
                >
                  {item.section}
                </div>
              )
            ) : (
              <NavItem
                key={item.id}
                item={item}
                active={currentPage === item.id}
                dueCount={item.badge ? dueCount : 0}
                collapsed={collapsed}
                onClick={() => navigate(item.id)}
              />
            )
          )}
        </nav>

        {/* Footer — streak + XP */}
        <div
          className={`shrink-0 py-3 flex items-center ${collapsed ? 'flex-col gap-3 px-2' : 'px-4 justify-between'}`}
          style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
        >
          <div className="flex items-center gap-1.5" title={collapsed ? `${progress.streak} day streak` : undefined}>
            <Flame size={16} className="text-orange-400 shrink-0" />
            {!collapsed && (
              <div>
                <div className="text-gold font-extrabold text-sm leading-none">{progress.streak}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>day streak</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5" title={collapsed ? `${progress.xpToday} XP today` : undefined}>
            <Zap size={16} className="text-accent2 shrink-0" />
            {!collapsed && (
              <div className="text-right">
                <div className="text-accent2 font-extrabold text-sm leading-none">{progress.xpToday}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-sidebar-muted)' }}>XP today</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function NavItem({ item, active, dueCount, collapsed, onClick }) {
  const Icon = KNIGHTPATH_NAV_ICONS[item.id]

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        w-full flex items-center gap-2.5 py-2 rounded-lg text-sm font-medium
        transition-colors text-left mb-0.5 cursor-pointer
        ${collapsed ? 'px-0 justify-center' : 'px-3'}
        ${active ? `bg-accent/15 text-accent2 ${collapsed ? '' : 'border-l-2 border-accent2 pl-2.5'}` : 'hover:bg-white/5'}
      `}
      style={!active ? { color: 'var(--color-sidebar-muted)' } : undefined}
    >
      <span className="w-5 shrink-0 flex items-center justify-center relative">
        {Icon && <Icon size={14} />}
        {collapsed && dueCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold" />
        )}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && dueCount > 0 && (
        <span className="bg-gold text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {dueCount}
        </span>
      )}
    </button>
  )
}

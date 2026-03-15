'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ProcessLogo from './ProcessLogo'
import { useAuth } from './AuthProvider'

const HIDDEN_PATHS = ['/review/', '/login', '/setup', '/accept-invite', '/onboarding']

function useBadges() {
  const [unread, setUnread] = useState(0)
  const [pendingReviews, setPendingReviews] = useState(0)

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      es = new EventSource('/api/events')

      es.addEventListener('badges', (e: MessageEvent) => {
        const data = JSON.parse(e.data)
        setUnread(data.unread ?? 0)
        setPendingReviews(data.pending ?? 0)
      })

      es.onerror = () => {
        es?.close()
        es = null
        reconnectTimer = setTimeout(connect, 3_000)
      }
    }

    connect()

    return () => {
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  return { unread, pendingReviews }
}

type Notification = {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read: boolean
  created_at: string
}

function fmtDate(s: string) {
  const d = new Date(s), diff = Date.now() - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function notifIcon(type: string) {
  const base = 'w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0'
  switch (type) {
    case 'review_needed':
      return (
        <div className={`${base} bg-amber-500/15`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-amber-500">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </div>
      )
    case 'changes_requested':
      return (
        <div className={`${base} bg-orange-500/15`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-orange-500">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
      )
    case 'submission_approved':
      return (
        <div className={`${base} bg-emerald-500/15`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-emerald-500">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      )
    case 'task_assigned':
      return (
        <div className={`${base} bg-blue-500/15`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
      )
    case 'invited':
      return (
        <div className={`${base} bg-violet-500/15`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-violet-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
          </svg>
        </div>
      )
    default:
      return (
        <div className={`${base} bg-white/8`}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-white/40">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      )
  }
}

const GRAD_PAIRS = [
  ['#D4512E', '#FF8A65'],
  ['#5856D6', '#A78BFA'],
  ['#0EA572', '#34D399'],
  ['#E8882C', '#FCD34D'],
  ['#2563EB', '#60A5FA'],
]
function avatarGradient(name: string) {
  const i = (name.charCodeAt(0) || 0) % GRAD_PAIRS.length
  return `linear-gradient(135deg, ${GRAD_PAIRS[i][0]}, ${GRAD_PAIRS[i][1]})`
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { user }  = useAuth()
  const { unread, pendingReviews } = useBadges()
  const [loggingOut, setLoggingOut] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  async function openNotifications() {
    setNotifOpen(true)
    setNotifLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const d = await res.json()
        setNotifications(d.notifications ?? [])
      }
    } finally {
      setNotifLoading(false)
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const navItems = [
    {
      name: 'Dashboard', href: '/',
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Submissions', href: '/submissions',
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      name: 'Tasks', href: '/tasks',
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Reviews', href: '/reviews',
      badge: pendingReviews > 0 ? pendingReviews : undefined,
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    ...(user?.role === 'admin' ? [{
      name: 'Team Admin', href: '/admin',
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    }] : []),
  ]

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <>
      {/* ── Sidebar ── */}
      <aside
        className="w-72 flex-col h-screen flex-shrink-0 lg:flex hidden with-noise"
        style={{ background: '#100F0D' }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px z-10"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,81,46,0.5), transparent)' }} />

        <div className="relative z-10 flex flex-col h-full overflow-hidden">

          {/* ── Logo + Bell ── */}
          <div className="h-[72px] flex items-center px-6 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <Link href="/" className="hover:opacity-70 transition-opacity flex-1 min-w-0">
              <ProcessLogo height={26} variant="white" />
            </Link>
            <button
              onClick={openNotifications}
              className="relative p-2.5 rounded-2xl transition-all flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              title="Notifications"
            >
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[#100F0D]"
                  style={{ background: '#D4512E' }} />
              )}
            </button>
          </div>

          {/* ── New Request CTA ── */}
          <div className="px-5 py-5 flex-shrink-0">
            <Link
              href="/submit"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-[13.5px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #D4512E, #C04428)',
                boxShadow: '0 4px 16px -3px rgba(212,81,46,0.45)',
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Request
            </Link>
          </div>

          {/* ── Nav ── */}
          <nav className="flex-1 px-4 overflow-y-auto">
            <div className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.22)' }}>
              Workspace
            </div>
            <div className="space-y-1">
              {navItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13.5px] font-semibold transition-all duration-200
                      ${isActive ? 'text-white' : 'hover:text-white'}`}
                    style={{
                      color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.42)',
                      background: isActive ? 'rgba(255,255,255,0.085)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Active left indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                        style={{ background: '#D4512E' }} />
                    )}
                    <span style={{ color: isActive ? '#D4512E' : 'rgba(255,255,255,0.28)' }}
                      className="transition-colors flex-shrink-0">
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0"
                        style={{ background: '#D4512E' }}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* ── Bottom: Settings + Profile ── */}
          <div className="flex-shrink-0 px-4 py-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13.5px] font-semibold transition-all duration-200"
              style={{
                color: pathname === '/settings' ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.38)',
                background: pathname === '/settings' ? 'rgba(255,255,255,0.085)' : 'transparent',
              }}
              onMouseEnter={e => { if (pathname !== '/settings') (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)' }}
              onMouseLeave={e => { if (pathname !== '/settings') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.26)' }}>
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </span>
              Settings
            </Link>

            {/* User profile row */}
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0"
                style={{ background: user?.name ? avatarGradient(user.name) : '#D4512E' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  {user?.name ?? '…'}
                </div>
                <div className="text-[10.5px] capitalize mt-px" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  {user?.role ?? ''}
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="flex-shrink-0 p-2 rounded-xl transition-all"
                style={{ color: 'rgba(255,255,255,0.22)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC3545'; (e.currentTarget as HTMLElement).style.background = 'rgba(220,53,69,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* ── Notification Panel ── */}
      {notifOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(16,15,13,0.35)', backdropFilter: 'blur(2px)' }}
            onClick={() => setNotifOpen(false)}
          />
          <div
            ref={panelRef}
            className="fixed left-72 top-0 h-screen w-[400px] z-50 flex flex-col animate-notif-slide"
            style={{ background: '#FDFCFB', borderRight: '1px solid #E5E0D8', boxShadow: '12px 0 40px -8px rgba(24,22,15,0.14)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-7 py-6 flex-shrink-0"
              style={{ borderBottom: '1px solid #E5E0D8' }}>
              <div>
                <h2 className="font-display font-bold text-[18px] text-p-text">Notifications</h2>
                {unread > 0 && (
                  <p className="text-[12px] text-p-tertiary mt-0.5">{unread} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={markAllRead}
                    className="text-[12px] font-bold transition-colors px-3 py-1.5 rounded-xl"
                    style={{ color: '#D4512E', background: 'rgba(212,81,46,0.08)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,81,46,0.14)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,81,46,0.08)'}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="p-2 rounded-xl transition-colors text-p-quaternary hover:text-p-secondary hover:bg-p-fill"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifLoading ? (
                <div className="p-6 space-y-5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse flex gap-4 items-start">
                      <div className="w-9 h-9 rounded-2xl bg-p-fill flex-shrink-0" />
                      <div className="flex-1 space-y-2.5 pt-0.5">
                        <div className="h-3.5 bg-p-fill rounded-lg w-3/4" />
                        <div className="h-2.5 bg-p-fill rounded-lg w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-p-fill flex items-center justify-center mb-5">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                  </div>
                  <p className="text-[15px] font-bold text-p-secondary font-display">All caught up</p>
                  <p className="text-[13px] text-p-tertiary mt-1">No new notifications</p>
                </div>
              ) : (
                <div>
                  {notifications.map(n => {
                    const href = n.href ? n.href.replace(/^https?:\/\/[^/]+/, '') : null
                    const inner = (
                      <div className={`flex gap-4 px-7 py-5 items-start transition-colors ${!n.read ? 'bg-amber-50/50' : 'hover:bg-p-fill/40'}`}
                        style={{ borderBottom: '1px solid #E5E0D8' }}>
                        {notifIcon(n.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] leading-snug ${!n.read ? 'font-bold text-p-text' : 'font-medium text-p-secondary'}`}>
                              {n.title}
                            </p>
                            <span className="text-[11px] text-p-quaternary flex-shrink-0 mt-0.5">{fmtDate(n.created_at)}</span>
                          </div>
                          {n.body && (
                            <p className="text-[12px] text-p-tertiary mt-1 leading-relaxed">{n.body}</p>
                          )}
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#D4512E' }} />
                        )}
                      </div>
                    )
                    return href ? (
                      <Link key={n.id} href={href} onClick={() => setNotifOpen(false)}>{inner}</Link>
                    ) : (
                      <div key={n.id}>{inner}</div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

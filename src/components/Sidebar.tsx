'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProcessLogo from './ProcessLogo'
import { useAuth } from './AuthProvider'

const HIDDEN_PATHS = ['/review/', '/login', '/setup', '/accept-invite', '/onboarding']

function useNotifications() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const res = await fetch('/api/notifications?unread=true')
        if (!res.ok || cancelled) return
        const d = await res.json()
        if (!cancelled) setUnread(d.unread_count ?? 0)
      } catch { /* non-critical */ }
    }
    poll()
    const id = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return unread
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { user }  = useAuth()
  const unread    = useNotifications()
  const [loggingOut, setLoggingOut] = useState(false)

  // Hide sidebar on auth/review pages
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  const navItems = [
    {
      name: 'Inbox', href: '/',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stroke-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>,
    },
    {
      name: 'Tasks', href: '/tasks',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stroke-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>,
    },
    {
      name: 'Reviews', href: '/reviews',
      badge: unread > 0 ? unread : undefined,
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stroke-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>,
    },
    ...(user?.role === 'admin' ? [{
      name: 'Team Admin', href: '/admin',
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stroke-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>,
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
    <aside className="w-64 bg-p-nav text-white border-r border-p-nav-border flex flex-col h-screen sticky top-0 flex-shrink-0 lg:flex hidden">
      {/* Branding */}
      <div className="h-24 flex items-center px-8 border-b border-white/[0.06]">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <ProcessLogo height={32} />
        </Link>
      </div>

      {/* Main Action */}
      <div className="px-6 py-8">
        <Link
          href="/submit"
          className="flex items-center justify-center gap-2 bg-p-accent hover:bg-p-accent-h text-white text-[15px] font-medium w-full py-3.5 rounded-2xl transition-all duration-300 shadow-accent hover:-translate-y-0.5"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
          </svg>
          New Request
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 space-y-1.5">
        <div className="px-4 mb-3 text-[11px] font-semibold text-white/40 uppercase tracking-widest">Dashboards</div>
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all duration-200 relative
                ${isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
            >
              <div className={isActive ? 'text-p-accent' : 'text-white/40'}>
                {item.icon}
              </div>
              {item.name}
              {item.badge && (
                <span className="ml-auto bg-p-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: Settings + User Profile */}
      <div className="p-4 border-t border-white/[0.06] space-y-1">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all duration-200
            ${pathname === '/settings'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stroke-2 text-white/40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Settings
        </Link>

        {/* User Profile + Logout */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl group">
          <div className="w-9 h-9 rounded-2xl bg-p-accent/80 flex items-center justify-center text-white font-semibold text-[13px] flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{user?.name ?? 'Loading…'}</div>
            <div className="text-[11px] text-white/40 capitalize">{user?.role ?? ''}</div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out"
            className="text-white/30 hover:text-p-error transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-white/5"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

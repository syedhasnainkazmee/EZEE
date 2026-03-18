'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

// ── Feature list for the brand panel ──────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    ),
    title: 'Structured Approval Chains',
    desc: 'Define multi-step reviewer workflows so nothing ships without the right sign-offs.',
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
      </svg>
    ),
    title: 'Pin-point Annotation',
    desc: 'Reviewers click directly on designs to leave contextual comments. No more email threads.',
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
      </svg>
    ),
    title: 'Magic Review Links',
    desc: 'External stakeholders review via a personal link — no login, no friction.',
  },
]

// ── Login form logic ───────────────────────────────────────────────────────

function LoginContent() {
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [showPass, setShowPass]               = useState(false)
  const [orgInfo, setOrgInfo]                 = useState<{ name: string; adminName: string | null } | null>(null)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { refetch }  = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setOrgInfo(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.orgExists) {
          setOrgInfo({ name: data.orgName ?? 'this workspace', adminName: data.adminName ?? null })
        } else {
          setError(data.error ?? 'Login failed')
        }
        return
      }
      const from = searchParams.get('from')
      const onboardingDone = localStorage.getItem('onboarding_complete')
      window.location.href = from ?? (onboardingDone ? '/' : '/onboarding')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: Brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden flex-shrink-0"
        style={{ background: '#100F0D' }}
      >
        {/* Noise texture */}
        <div className="with-noise absolute inset-0 pointer-events-none" />

        {/* Warm glow orb — top right */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 70% 20%, rgba(212,81,46,0.18) 0%, transparent 65%)' }} />
        {/* Warm glow orb — bottom left */}
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 30% 80%, rgba(212,81,46,0.10) 0%, transparent 60%)' }} />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,81,46,0.6) 40%, rgba(212,81,46,0.6) 60%, transparent)' }} />

        <div className="relative z-10 flex flex-col h-full">

          {/* Logo */}
          <div>
            <ProcessLogo height={30} variant="white" />
          </div>

          {/* Central headline */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h1 className="font-display text-white leading-[1.12] font-semibold mb-6"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
              Design reviewed.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #D4512E 0%, #FF7A58 60%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                At the speed
              </span>{' '}
              of ideas.
            </h1>
            <p className="text-[15px] leading-relaxed mb-12" style={{ color: 'rgba(255,255,255,0.48)' }}>
              A focused workspace for creative teams to submit designs, gather structured feedback, and get approvals — without the back-and-forth.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(212,81,46,0.15)', color: '#D4512E' }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>{f.title}</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {['#D4512E', '#5856D6', '#0EA572'].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ background: c, borderColor: '#100F0D' }}>
                  {['M', 'D', 'R'][i]}
                </div>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Trusted by creative teams daily
            </p>
          </div>

        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-p-bg px-6 py-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <ProcessLogo height={28} />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-display text-4xl font-semibold text-p-text leading-tight">Welcome back</h2>
            <p className="text-[15px] text-p-tertiary mt-2.5">Sign in to your workspace to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoFocus
                className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 pr-12 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                  onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                  onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-p-quaternary hover:text-p-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 text-[13px] text-red-700 animate-fade-in">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="mt-0.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            {orgInfo && (
              <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 px-5 py-4 animate-fade-in">
                <p className="text-[13px] text-violet-800 font-semibold mb-0.5">
                  {orgInfo.name} workspace exists
                </p>
                <p className="text-[12px] text-violet-600 mb-3">
                  {orgInfo.adminName
                    ? `Request access from admin ${orgInfo.adminName} to join.`
                    : 'You can request access to join this workspace.'}
                </p>
                <Link
                  href={`/request-access?email=${encodeURIComponent(email)}`}
                  className="block w-full text-center py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-bold hover:bg-violet-700 transition-colors"
                >
                  Request Access
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full text-white font-bold py-4 rounded-2xl transition-all duration-200 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: loading ? '#C04428' : 'linear-gradient(135deg, #D4512E, #C04428)',
                boxShadow: loading ? 'none' : '0 6px 20px -4px rgba(212,81,46,0.42)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-7 pt-6 border-t border-p-border">
            <p className="text-[12px] text-p-tertiary text-center leading-relaxed">
              No account? Check your email for an invitation, or{' '}
              <Link href="/setup" className="text-p-accent hover:text-p-accent-h font-semibold transition-colors">
                set up a workspace
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-p-quaternary mt-6">
            EZEE · Design review &amp; project management
          </p>
        </div>
      </div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-p-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

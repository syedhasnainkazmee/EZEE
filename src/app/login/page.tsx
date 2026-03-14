'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

function LoginContent() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { refetch }  = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        return
      }

      // Use full page navigation to bypass Next.js router cache which can
      // serve stale redirect responses from before the auth cookie was set.
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
    <div className="min-h-screen bg-p-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <ProcessLogo height={36} />
        </div>

        {/* Card */}
        <div className="bg-p-surface rounded-3xl border border-p-border shadow-card p-8">
          <h1 className="font-display text-2xl font-semibold text-p-text mb-1">Welcome back</h1>
          <p className="text-[14px] text-p-secondary mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-p-text mb-1.5">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-p-text">Password</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[13px] text-red-700 flex items-start gap-2">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mt-0.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-p-accent hover:bg-p-accent-h disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 shadow-accent hover:-translate-y-0.5 disabled:transform-none text-[15px]"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-p-border text-center">
            <p className="text-[13px] text-p-secondary">
              Don&apos;t have an account? Check your email for an invitation, or{' '}
              <Link href="/setup" className="text-p-accent hover:text-p-accent-h font-medium transition-colors">
                set up a new workspace
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[12px] text-p-quaternary mt-6">
          Process — Design review &amp; project management for Google Workspace teams
        </p>
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

'use client'
import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

type InviteInfo = { email: string; role: string; org_name: string }

function AcceptInviteContent() {
  const [info, setInfo]         = useState<InviteInfo | null>(null)
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmit] = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { refetch }  = useAuth()
  const token        = searchParams.get('token')

  useEffect(() => {
    if (!token) { setError('Invalid invitation link'); setLoading(false); return }
    fetch(`/api/auth/accept-invite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setInfo(d)
      })
      .catch(() => setError('Failed to load invitation'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }

    setError('')
    setSubmit(true)
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to accept invitation'); return }

      await refetch()
      router.push(data.redirect ?? '/')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmit(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-p-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <ProcessLogo height={36} />
        </div>

        <div className="bg-p-surface rounded-3xl border border-p-border shadow-card p-8">
          {error && !info ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-error">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="font-display text-xl font-semibold text-p-text mb-2">Invalid Invitation</h2>
              <p className="text-[14px] text-p-secondary">{error}</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-p-accent/10 flex items-center justify-center mb-4">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-semibold text-p-text mb-1">You&apos;re invited!</h1>
                <p className="text-[14px] text-p-secondary">
                  Join <strong>{info?.org_name}</strong> as a <strong>{info?.role}</strong>
                </p>
                {info?.email && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-p-fill border border-p-border rounded-xl px-3 py-1.5">
                    <span className="text-[12px] text-p-secondary">{info.email}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Your name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith" required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Create password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters" required minLength={8}
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Confirm password</label>
                  <input
                    type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password" required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[13px] text-red-700">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full bg-p-accent hover:bg-p-accent-h disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 shadow-accent hover:-translate-y-0.5 disabled:transform-none text-[15px]">
                  {submitting ? 'Joining…' : 'Join workspace →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-p-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}

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
      <div className="flex-1 bg-p-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-p-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <ProcessLogo height={36} />
        </div>

        <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
          {error && !info ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-error">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="font-display text-2xl font-semibold text-p-text mb-2">Invalid Invitation</h2>
              <p className="text-[15px] text-p-secondary">{error}</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-14 h-14 rounded-3xl bg-p-accent/10 flex items-center justify-center mb-5 shadow-sm">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-semibold text-p-text mb-1.5">You&apos;re invited!</h1>
                <p className="text-[15px] text-p-secondary">
                  Join <strong>{info?.org_name}</strong> as a <strong>{info?.role}</strong>
                </p>
                {info?.email && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-p-fill border-2 border-p-border rounded-2xl px-4 py-2">
                    <span className="text-[13px] text-p-secondary">{info.email}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Your name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith" required
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Create password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters" required minLength={8}
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Confirm password</label>
                  <input
                    type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password" required
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-3xl px-5 py-4 text-[13px] text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none text-[15px]"
                  style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
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
      <div className="flex-1 bg-p-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}

'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'

function RequestAccessContent() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') ?? ''

  const [name, setName]               = useState('')
  const [email, setEmail]             = useState(prefillEmail)
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-p-bg px-6 py-12">
        <div className="w-full max-w-[380px] text-center">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(212,81,46,0.12)' }}>
            <svg width="28" height="28" fill="none" stroke="#D4512E" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 className="font-display text-3xl font-semibold text-p-text mb-3">Request submitted!</h2>
          <p className="text-[15px] text-p-tertiary leading-relaxed mb-8">
            An admin will review your request. You&apos;ll receive an email once your account is approved and ready to use.
          </p>
          <Link href="/login"
            className="inline-block text-[13px] font-bold text-p-accent hover:text-p-accent-h transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-p-bg px-6 py-12">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <ProcessLogo height={28} />
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="font-display text-4xl font-semibold text-p-text leading-tight">Request Access</h2>
          <p className="text-[15px] text-p-tertiary mt-2.5">
            Your domain is registered. Fill in your details and an admin will review your request.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoFocus
              autoComplete="name"
              className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
              onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
              onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
            />
          </div>

          {/* Work Email */}
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
              className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
              onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
              onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 pr-12 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-p-quaternary hover:text-p-secondary transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? (
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

          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim() || !password || !confirm}
            className="w-full text-white font-bold py-4 rounded-2xl transition-all duration-200 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: loading ? '#C04428' : 'linear-gradient(135deg, #D4512E, #C04428)',
              boxShadow: loading ? 'none' : '0 6px 20px -4px rgba(212,81,46,0.42)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Submitting…
              </span>
            ) : 'Request Access'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 pt-6 border-t border-p-border text-center">
          <Link href="/login" className="text-[12px] text-p-tertiary hover:text-p-accent transition-colors font-semibold">
            ← Back to login
          </Link>
        </div>

        <p className="text-center text-[11px] text-p-quaternary mt-6">
          EZEE · Design review &amp; project management
        </p>
      </div>
    </div>
  )
}

export default function RequestAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-p-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RequestAccessContent />
    </Suspense>
  )
}

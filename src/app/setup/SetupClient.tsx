'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

const STEPS = [
  { id: 1, label: 'Workspace' },
  { id: 2, label: 'Admin account' },
]

export default function SetupClient() {
  const [step, setStep]           = useState(1)
  const [orgName, setOrgName]     = useState('')
  const [domain, setDomain]       = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const router    = useRouter()
  const { refetch } = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }

    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/org/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_name: orgName, domain, admin_name: adminName, admin_email: email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Setup failed'); return }
      window.location.href = '/onboarding'
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row">

      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden flex-shrink-0"
        style={{ background: '#100F0D' }}
      >
        {/* Noise */}
        <div className="with-noise absolute inset-0 pointer-events-none" />
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 70% 20%, rgba(212,81,46,0.16) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 20% 80%, rgba(212,81,46,0.09) 0%, transparent 60%)' }} />
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,81,46,0.55) 50%, transparent)' }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div>
            <ProcessLogo height={28} variant="white" />
          </div>

          {/* Central copy */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <h1 className="font-display text-white leading-[1.12] font-semibold mb-5"
              style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}>
              Your creative workspace,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #D4512E 0%, #FF7A58 60%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                set up in minutes.
              </span>
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
              Create your workspace, invite your team, and start getting designs reviewed — without chasing feedback over email.
            </p>

            {/* Checklist */}
            <div className="mt-10 space-y-3.5">
              {[
                'Multi-step approval workflows',
                'Contextual annotation on designs',
                'Magic review links for stakeholders',
                'Task management built in',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,81,46,0.2)' }}>
                    <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}
                      style={{ color: '#D4512E' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Back to login */}
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[12px] font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.30)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)'}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              Back to login
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right: wizard form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-p-bg px-6 py-12">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex justify-center mb-10 lg:hidden">
            <ProcessLogo height={28} />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => {
              const isDone    = s.id < step
              const isCurrent = s.id === step
              return (
                <div key={s.id} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className="h-px w-6 transition-colors"
                      style={{ background: isDone ? '#D4512E' : '#E5E0D8' }} />
                  )}
                  <div className={`w-7 h-7 rounded-2xl flex items-center justify-center text-[11px] font-bold transition-all flex-shrink-0 ${
                    isCurrent ? 'text-white' : isDone ? 'text-white' : 'text-p-tertiary bg-p-fill border-2 border-p-border'
                  }`}
                    style={
                      isCurrent ? { background: 'linear-gradient(135deg, #D4512E, #C04428)' }
                      : isDone   ? { background: '#0EA572' }
                      : {}
                    }
                  >
                    {isDone ? (
                      <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    ) : s.id}
                  </div>
                  <span className={`text-[12px] font-bold ${isCurrent ? 'text-p-text' : 'text-p-tertiary'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {step === 1 ? (
              <>
                <div className="mb-6">
                  <h2 className="font-display text-4xl font-semibold text-p-text leading-tight">Set up your workspace</h2>
                  <p className="text-[15px] text-p-tertiary mt-2.5">This is your team&apos;s home in EZEE.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
                    Organization name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Acme Creative"
                    required
                    autoFocus
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                    onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                    onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">
                    Email domain
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-p-tertiary text-[14px] select-none">@</span>
                    <input
                      type="text"
                      value={domain}
                      onChange={e => setDomain(e.target.value.replace('@', ''))}
                      placeholder="company.com"
                      required
                      className="w-full bg-p-bg border-2 border-p-border rounded-2xl pl-9 pr-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                      onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                      onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                    />
                  </div>
                  <p className="text-[12px] text-p-quaternary mt-2">Only users with this domain can be invited to the workspace.</p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-display text-4xl font-semibold text-p-text leading-tight">Create admin account</h2>
                  <p className="text-[15px] text-p-tertiary mt-2.5">You&apos;ll manage the workspace and invite your team.</p>
                </div>

                {/* Workspace summary pill */}
                <div className="flex items-center gap-3 bg-p-fill border-2 border-p-border rounded-2xl px-5 py-3.5">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)' }}>
                    <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-p-text truncate">{orgName}</p>
                    <p className="text-[11px] text-p-tertiary">@{domain}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[12px] font-bold text-p-accent hover:text-p-accent-h transition-colors flex-shrink-0"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">Your name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    autoFocus
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                    onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                    onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">Work email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={`you@${domain || 'company.com'}`}
                    required
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                    onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                    onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 pr-12 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                      onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                      onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-p-quaternary hover:text-p-secondary transition-colors">
                      {showPass
                        ? <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        : <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      }
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all"
                          style={{
                            background: password.length > i * 2 + 2
                              ? password.length >= 12 ? '#0EA572' : password.length >= 8 ? '#E8882C' : '#DC3545'
                              : '#E5E0D8'
                          }} />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-secondary mb-2 uppercase tracking-widest">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className={`w-full bg-p-bg border-2 rounded-2xl px-5 py-3.5 pr-12 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none transition-all ${
                        confirm && confirm !== password ? 'border-red-300 focus:border-red-400' : 'border-p-border focus:border-p-accent/60'
                      }`}
                      onFocus={e => (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(212,81,46,0.10)'}
                      onBlur={e => (e.target as HTMLElement).style.boxShadow = ''}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-p-quaternary hover:text-p-secondary transition-colors">
                      {showConfirm
                        ? <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        : <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      }
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-[11px] text-red-500 mt-1.5 animate-fade-in">Passwords don't match</p>
                  )}
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 text-[13px] text-red-700 animate-fade-in">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="mt-0.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="flex-shrink-0 px-6 py-4 rounded-2xl border-2 border-p-border bg-p-fill text-p-secondary hover:text-p-text hover:bg-white font-bold text-[14px] transition-all"
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (step === 2 && !!confirm && confirm !== password)}
                className="flex-1 text-white font-bold py-4 rounded-2xl transition-all duration-200 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: loading ? '#C04428' : 'linear-gradient(135deg, #D4512E, #C04428)',
                  boxShadow: loading ? 'none' : '0 6px 20px -4px rgba(212,81,46,0.42)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Creating workspace…
                  </span>
                ) : step === 1 ? 'Continue →' : 'Create workspace'}
              </button>
            </div>
          </form>

          <p className="text-center text-[11.5px] text-p-quaternary mt-7">
            Already have an account?{' '}
            <Link href="/login" className="text-p-accent hover:text-p-accent-h font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}

'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

export default function SetupClient() {
  const [step, setStep]           = useState(1)
  const [orgName, setOrgName]     = useState('')
  const [domain, setDomain]       = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const router  = useRouter()
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
    <div className="min-h-screen bg-p-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <ProcessLogo height={36} />
        </div>

        <div className="bg-p-surface rounded-3xl border border-p-border shadow-card p-8">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                {s > 1 && <div className="flex-1 h-px bg-p-border w-8" />}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                  s === step ? 'bg-p-accent text-white' : s < step ? 'bg-p-success text-white' : 'bg-p-fill text-p-tertiary'
                }`}>
                  {s < step ? (
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : s}
                </div>
                <span className={`text-[12px] font-medium ${s === step ? 'text-p-text' : 'text-p-tertiary'}`}>
                  {s === 1 ? 'Workspace' : 'Admin account'}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <h1 className="font-display text-2xl font-semibold text-p-text mb-1">Set up your workspace</h1>
                <p className="text-[14px] text-p-secondary mb-6">This is your team&apos;s home in Process.</p>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Organization name</label>
                  <input
                    type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Acme Corp" required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">
                    Email domain <span className="text-p-tertiary font-normal">(Google Workspace domain)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-p-quaternary text-[14px]">@</span>
                    <input
                      type="text" value={domain} onChange={e => setDomain(e.target.value.replace('@', ''))}
                      placeholder="company.com" required
                      className="w-full bg-p-bg border border-p-border rounded-2xl pl-8 pr-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-p-quaternary mt-1.5">Only users with this domain can be invited.</p>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl font-semibold text-p-text mb-1">Create your admin account</h1>
                <p className="text-[14px] text-p-secondary mb-6">You&apos;ll manage the workspace and invite your team.</p>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Your name</label>
                  <input
                    type="text" value={adminName} onChange={e => setAdminName(e.target.value)}
                    placeholder="Jane Smith" required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Work email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={`you@${domain || 'company.com'}`} required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Password</label>
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
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex-1 bg-p-fill border border-p-border hover:bg-white text-p-text font-semibold py-3.5 rounded-2xl transition-all text-[15px]">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 bg-p-accent hover:bg-p-accent-h disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 shadow-accent hover:-translate-y-0.5 disabled:transform-none text-[15px]">
                {loading ? 'Creating…' : step === 1 ? 'Continue →' : 'Create workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

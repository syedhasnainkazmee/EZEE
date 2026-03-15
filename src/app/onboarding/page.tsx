'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

const STEPS = ['Invite team', 'Create workflow', 'Create project', 'Done!']

export default function OnboardingPage() {
  const { user }            = useAuth()
  const router              = useRouter()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 0 — Invite team
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [inviteResults, setInviteResults] = useState<{email: string; ok: boolean; error?: string}[]>([])

  // Step 1 — Create workflow
  const [wfName, setWfName]  = useState('Design Review')
  const [wfDesc, setWfDesc]  = useState('')

  // Step 2 — Create project
  const [projName, setProjName] = useState('My First Project')
  const [projDesc, setProjDesc] = useState('')

  const isAdmin = user?.role === 'admin'

  async function handleInvites() {
    setLoading(true)
    const emails = inviteEmails.filter(e => e.trim())
    if (emails.length === 0) { next(); setLoading(false); return }

    const results = await Promise.all(emails.map(async email => {
      try {
        const res = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), role: 'member' }),
        })
        const d = await res.json()
        return { email, ok: res.ok, error: d.error }
      } catch {
        return { email, ok: false, error: 'Network error' }
      }
    }))
    setInviteResults(results)
    setLoading(false)
    if (results.every(r => r.ok || !r.ok)) next() // proceed either way
  }

  async function handleWorkflow() {
    if (!wfName.trim()) { next(); return }
    setLoading(true)
    try {
      await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wfName.trim(), description: wfDesc.trim() }),
      })
    } catch { /* non-critical */ }
    setLoading(false)
    next()
  }

  async function handleProject() {
    if (!projName.trim()) { next(); return }
    setLoading(true)
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projName.trim(), description: projDesc.trim() }),
      })
    } catch { /* non-critical */ }
    setLoading(false)
    next()
  }

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function skip()  { next() }

  function finish() {
    if (typeof window !== 'undefined') localStorage.setItem('onboarding_complete', '1')
    router.push('/')
  }

  return (
    <div className="flex-1 bg-p-bg flex flex-col items-center justify-center px-4">
      {/* Progress bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-all ${
                i < step ? 'bg-p-success text-white' : i === step ? 'bg-p-accent text-white' : 'bg-p-fill text-p-tertiary'
              }`}>
                {i < step ? (
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                ) : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 transition-all ${i < step ? 'bg-p-success' : 'bg-p-border'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-[11px] font-medium ${i === step ? 'text-p-accent' : 'text-p-tertiary'}`}>{s}</span>
          ))}
        </div>
      </div>

      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">

          {/* Step 0: Invite team */}
          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-p-text mb-2">Invite your team</h2>
              <p className="text-[14px] text-p-secondary mb-6">
                Add your colleagues — they&apos;ll get an email to set up their account.
                {user?.org_id && user.email ? ` Only @${user.email.split('@')[1]} addresses can be invited.` : ''}
              </p>

              <div className="space-y-3 mb-6">
                {inviteEmails.map((email, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="email" value={email}
                      onChange={e => setInviteEmails(arr => arr.map((v, j) => j === i ? e.target.value : v))}
                      placeholder="colleague@company.com"
                      className="flex-1 bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all"
                    />
                    {i > 0 && (
                      <button type="button"
                        onClick={() => setInviteEmails(arr => arr.filter((_, j) => j !== i))}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-p-fill border-2 border-p-border text-p-tertiary hover:text-p-error hover:border-p-error transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setInviteEmails(arr => [...arr, ''])}
                  className="flex items-center gap-2 text-[13px] font-bold text-p-accent hover:text-p-accent-h transition-colors">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                  Add another
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={skip} className="flex-1 bg-p-fill border-2 border-p-border hover:bg-white text-p-text font-bold py-4 rounded-2xl transition-all text-[15px]">
                  Skip for now
                </button>
                <button onClick={handleInvites} disabled={loading}
                  className="flex-2 disabled:opacity-60 text-white font-bold py-4 px-8 rounded-2xl transition-all text-[15px] hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                  {loading ? 'Sending…' : 'Send invites →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Create workflow */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-p-text mb-2">Create your first workflow</h2>
              <p className="text-[14px] text-p-secondary mb-6">
                Workflows define who reviews design submissions and in what order.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Workflow name</label>
                  <input type="text" value={wfName} onChange={e => setWfName(e.target.value)}
                    placeholder="e.g. Social Media Review"
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Description <span className="text-p-quaternary font-normal normal-case tracking-normal">(optional)</span></label>
                  <textarea value={wfDesc} onChange={e => setWfDesc(e.target.value)}
                    rows={2} placeholder="Describe what this workflow is for…"
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all resize-none" />
                </div>
                <p className="text-[12px] text-p-tertiary">You can add reviewers and steps from the Admin panel after setup.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={skip} className="flex-1 bg-p-fill border-2 border-p-border hover:bg-white text-p-text font-bold py-4 rounded-2xl transition-all text-[15px]">Skip</button>
                <button onClick={handleWorkflow} disabled={loading}
                  className="flex-2 disabled:opacity-60 text-white font-bold py-4 px-8 rounded-2xl transition-all text-[15px] hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                  {loading ? 'Creating…' : 'Create workflow →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create project */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-p-text mb-2">Create your first project</h2>
              <p className="text-[14px] text-p-secondary mb-6">
                Projects organize your tasks and design submissions into workstreams.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Project name</label>
                  <input type="text" value={projName} onChange={e => setProjName(e.target.value)}
                    placeholder="e.g. Q1 Marketing Campaign"
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Description <span className="text-p-quaternary font-normal normal-case tracking-normal">(optional)</span></label>
                  <textarea value={projDesc} onChange={e => setProjDesc(e.target.value)}
                    rows={2} placeholder="What is this project for?"
                    className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all resize-none" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={skip} className="flex-1 bg-p-fill border-2 border-p-border hover:bg-white text-p-text font-bold py-4 rounded-2xl transition-all text-[15px]">Skip</button>
                <button onClick={handleProject} disabled={loading}
                  className="flex-2 disabled:opacity-60 text-white font-bold py-4 px-8 rounded-2xl transition-all text-[15px] hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                  {loading ? 'Creating…' : 'Create project →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-3xl bg-p-success/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-success">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="font-display text-2xl font-semibold text-p-text mb-2">You&apos;re all set!</h2>
              <p className="text-[15px] text-p-secondary mb-8 max-w-sm mx-auto leading-relaxed">
                Your workspace is ready. Start by submitting a design for review, or assign tasks to your team.
              </p>
              <button onClick={finish}
                className="text-white font-bold py-4 px-10 rounded-2xl transition-all hover:-translate-y-1 active:translate-y-0 text-[15px]"
                style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                Go to dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

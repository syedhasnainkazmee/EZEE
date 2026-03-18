'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SunhubLogo from '@/components/SunhubLogo'

type User = { id: string; name: string; email: string; role: string }
type Step = { id?: string; user_id: string; focus: string }
type Workflow = { id: string; name: string; description: string; is_active: boolean; steps: any[] }

export default function WorkflowEditorPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfDesc, setWfDesc] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/workflows/${id}`).then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([wfData, usersData]) => {
      const wf: Workflow = wfData.workflow
      if (!wf) { router.push('/admin'); return }
      setWorkflow(wf)
      setWfName(wf.name)
      setWfDesc(wf.description ?? '')
      setSteps(
        (wf.steps ?? []).length > 0
          ? wf.steps.map((s: any) => ({ id: s.id, user_id: s.user_id, focus: s.focus ?? '' }))
          : [{ user_id: '', focus: '' }]
      )
      setUsers(usersData.users ?? [])
    }).finally(() => setLoading(false))
  }, [id])

  function addStep() {
    setSteps(prev => [...prev, { user_id: '', focus: '' }])
  }

  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, field: keyof Step, value: string) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  async function saveSteps() {
    setSaving(true)
    setSaved(false)
    // Update workflow name/desc
    await fetch(`/api/admin/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wfName.trim(), description: wfDesc.trim() }),
    })
    // Save steps
    await fetch(`/api/admin/workflows/${id}/steps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: steps.filter(s => s.user_id) }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputClass = "w-full border border-p-border rounded-xl px-3.5 py-2.5 text-[13px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/10 bg-white transition-all font-sans"

  if (loading) return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center">
      <div className="flex items-center gap-2.5 text-p-tertiary text-sm">
        <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading…
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-p-bg">
      <header className="bg-p-nav sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/"><SunhubLogo height={18} /></Link>
            <div className="w-px h-4 bg-white/10" />
            <nav className="flex items-center gap-1.5 text-[13px]">
              <Link href="/admin" className="text-white/40 hover:text-white/70 transition-colors">Admin</Link>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-white/20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
              <span className="text-white/80 font-medium truncate max-w-[200px]">{wfName || 'Workflow'}</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-p-text">Configure Workflow</h1>
          <p className="text-[13px] text-p-secondary mt-1">Define the approval chain — who reviews, in what order, and what they focus on.</p>
        </div>

        <div className="space-y-5">
          {/* Workflow details */}
          <div className="bg-p-surface rounded-2xl border border-p-border shadow-card p-5">
            <h2 className="text-[13px] font-semibold text-p-text mb-4">Workflow Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Name *</label>
                <input value={wfName} onChange={e => setWfName(e.target.value)}
                  placeholder="e.g. Marketing Approval" className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Description</label>
                <input value={wfDesc} onChange={e => setWfDesc(e.target.value)}
                  placeholder="What does this workflow cover?" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-p-surface rounded-2xl border border-p-border shadow-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[13px] font-semibold text-p-text">Approval Steps</h2>
                <p className="text-[11px] text-p-tertiary mt-0.5">Reviewers are notified in order. Each step waits for the previous one.</p>
              </div>
              <button onClick={addStep}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-p-accent hover:text-p-accent-h border border-p-accent/30 hover:border-p-accent/60 px-3 py-1.5 rounded-full transition-all bg-p-accent-soft/50 hover:bg-p-accent-soft">
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="border-2 border-dashed border-p-border rounded-xl p-8 text-center">
                <p className="text-[13px] text-p-tertiary mb-3">No steps yet. Add at least one reviewer to build the chain.</p>
                <button onClick={addStep}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-p-accent hover:text-p-accent-h transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                  Add first step
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    {/* Step number */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-2.5">
                      <div className="w-7 h-7 rounded-full bg-p-nav text-white text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div className="w-px h-4 bg-p-border" />
                      )}
                    </div>

                    {/* Step fields */}
                    <div className="flex-1 bg-p-bg border border-p-border rounded-2xl p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Reviewer *</label>
                        <select value={step.user_id} onChange={e => updateStep(i, 'user_id', e.target.value)}
                          className="w-full border border-p-border rounded-xl px-3.5 py-2.5 text-[13px] text-p-text bg-white focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/10 transition-all font-sans">
                          <option value="">Select a team member…</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">
                          Review Scope <span className="text-p-quaternary font-normal normal-case">(what this reviewer should focus on)</span>
                        </label>
                        <input
                          value={step.focus}
                          onChange={e => updateStep(i, 'focus', e.target.value)}
                          placeholder="e.g. Check brand consistency, logo usage, and color accuracy"
                          className="w-full border border-p-border rounded-xl px-3.5 py-2.5 text-[13px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/10 bg-white transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeStep(i)}
                      className="mt-2 w-7 h-7 rounded-full bg-p-fill hover:bg-red-50 border border-p-border hover:border-red-200 flex items-center justify-center text-p-quaternary hover:text-p-error transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview chain */}
            {steps.filter(s => s.user_id).length > 1 && (
              <div className="mt-5 pt-4 border-t border-p-border">
                <p className="text-[11px] font-semibold text-p-tertiary uppercase tracking-wide mb-2">Approval order</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {steps.filter(s => s.user_id).map((s, i) => {
                    const user = users.find(u => u.id === s.user_id)
                    return (
                      <div key={i} className="flex items-center gap-2">
                        {i > 0 && (
                          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-border">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        )}
                        <span className="text-[12px] font-semibold text-p-text bg-p-fill border border-p-border px-2.5 py-1 rounded-full">
                          {user?.name ?? '?'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveSteps}
              disabled={saving || !wfName.trim() || steps.filter(s => s.user_id).length === 0}
              className="flex items-center gap-2 bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-[13px] shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Saving…
                </>
              ) : saved ? (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                  Saved
                </>
              ) : 'Save Workflow'}
            </button>
            <Link href="/admin"
              className="text-[13px] text-p-tertiary hover:text-p-text px-4 py-2.5 rounded-xl hover:bg-p-fill transition-all">
              ← Back to Admin
            </Link>
            {saved && (
              <span className="text-[12px] text-emerald-600 font-medium flex items-center gap-1.5">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
                Workflow saved successfully
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

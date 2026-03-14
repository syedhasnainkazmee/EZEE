'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'
import { useAuth } from '@/components/AuthProvider'

// ── Types ──────────────────────────────────────────────────────────────────

type Submission = {
  id: string
  title: string
  description: string
  status: string
  current_step: number | null
  created_at: string
  design_count: number
  workflow_id: string
  workflow_name: string
  current_reviewer: { name: string; role: string } | null
}

type Task = {
  id: string
  title: string
  project_name: string
  status: string
  assignee: { name: string } | null
}

type TeamMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  token: string
  step?: number
  focus?: string
}

// ── Constants ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9F0A', '#FF2D55']

function fmtDate(s: string) {
  const d = new Date(s), diff = Date.now() - d.getTime()
  if (diff < 60000)   return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Sub-components ────────────────────────────────────────────────────────

function SubmissionRow({ sub }: { sub: Submission }) {
  const isRevision = sub.status === 'changes_requested'
  const isDone = sub.status === 'approved'

  return (
    <Link href={`/submission/${sub.id}`} className="block group animate-fade-in mb-3">
      <div className="bg-p-surface rounded-2xl border border-p-border hover:border-transparent hover:shadow-card p-4 lg:p-5 transition-all duration-300 transform group-hover:translate-x-1 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Edge focus strip */}
        {isRevision && <div className="absolute left-0 top-0 bottom-0 w-1 bg-p-error" />}
        {isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-p-success" />}
        {!isRevision && !isDone && <div className="absolute left-0 top-0 bottom-0 w-1 bg-p-warning opacity-0 group-hover:opacity-100 transition-opacity" />}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <p className="font-display font-semibold text-[15px] lg:text-[16px] text-p-text group-hover:text-p-accent truncate transition-colors">
              {sub.title}
            </p>
            {isRevision && (
              <span className="px-2 py-0.5 rounded-md bg-p-error-soft text-[10px] font-bold text-p-error uppercase tracking-widest flex-shrink-0">Action Needed</span>
            )}
            {isDone && (
              <span className="px-2 py-0.5 rounded-md bg-p-success-soft text-[10px] font-bold text-p-success uppercase tracking-widest flex-shrink-0">Approved</span>
            )}
            {sub.status === 'in_review' && (
              <span className="px-2 py-0.5 rounded-md bg-p-warning-soft text-[10px] font-bold text-p-warning uppercase tracking-widest flex-shrink-0">In Review</span>
            )}
            {sub.status === 'draft' && (
              <span className="px-2 py-0.5 rounded-md bg-p-fill text-[10px] font-bold text-p-tertiary uppercase tracking-widest flex-shrink-0">Draft</span>
            )}
          </div>
          {sub.description && (
            <p className="text-[13px] text-p-tertiary truncate max-w-xl">
              {sub.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-p-border md:border-0 border-dashed">
          {sub.status === 'in_review' && sub.current_reviewer && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-[10px] font-bold text-amber-700">{sub.current_reviewer.name[0]}</span>
              </div>
              <span className="text-[12px] text-amber-700 font-medium hidden lg:inline-block">With {sub.current_reviewer.name}</span>
            </div>
          )}
          <div className="flex flex-col md:items-end text-left md:text-right">
            <span className="text-[12px] font-medium text-p-text">
              {sub.workflow_name || 'Standard Approval'}
            </span>
            <span className="text-[11px] text-p-tertiary mt-0.5">
              {sub.design_count} design{sub.design_count !== 1 ? 's' : ''} &middot; {fmtDate(sub.created_at)}
            </span>
          </div>

          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary group-hover:text-p-accent transition-colors hidden md:block">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </Link>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-p-surface rounded-2xl border border-p-border p-5 animate-pulse mb-3 flex items-center justify-between gap-4">
      <div className="space-y-3 w-1/2">
        <div className="h-4 bg-p-fill rounded-md w-3/4" />
        <div className="h-2.5 bg-p-fill rounded-md w-1/2" />
      </div>
      <div className="space-y-2 w-1/4 flex flex-col items-end">
        <div className="h-3 bg-p-fill rounded-md w-1/2" />
        <div className="h-2 bg-p-fill rounded-md w-1/3" />
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-2xl border border-p-border p-4 lg:p-5 hover:shadow-card transition-all duration-300 group flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex-1 min-w-0 md:pl-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded-md bg-p-fill text-[10px] font-bold text-p-tertiary uppercase tracking-widest">{task.project_name}</span>
          {task.status === 'in_progress' && (
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 uppercase tracking-widest">In Progress</span>
          )}
        </div>
        <p className="font-display font-semibold text-[15px] text-p-nav group-hover:text-p-accent transition-colors truncate">
          {task.title}
        </p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-p-border md:border-t-0 border-dashed">
        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-p-tertiary mb-0.5">Assigned To</span>
          <span className="text-[12px] font-medium text-p-nav">{task.assignee?.name || 'Unassigned'}</span>
        </div>
        <Link 
          href={`/submit?task_id=${task.id}`}
          className="bg-p-nav hover:bg-p-accent text-white px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          Submit
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user: authUser }            = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tasks, setTasks]             = useState<Task[]>([])
  const [team, setTeam]               = useState<TeamMember[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [wfFilter, setWfFilter]       = useState('all')
  const [copied, setCopied]           = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/submissions').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json())
    ])
      .then(([subData, taskData]) => {
        setSubmissions(subData.submissions ?? [])
        setTasks((taskData.tasks ?? []).filter((t: any) => t.status !== 'completed' && t.status !== 'in_review'))
      })
      .finally(() => setLoading(false))

    if (authUser?.role === 'admin') {
      Promise.all([
        fetch('/api/admin/users').then(r => r.json()),
        fetch('/api/admin/workflows').then(r => r.json()),
      ]).then(([ud, wd]) => {
        const usrs: any[]  = ud.users     ?? []
        const wfs: any[]   = wd.workflows ?? []
        const activeWf     = wfs.find((w: any) => w.is_active) ?? wfs[0]
        const steps: any[] = activeWf?.steps ?? []
        const enriched = usrs
          .map((u: any) => {
            const step = steps.find((s: any) => s.user_id === u.id)
            return { ...u, step: step?.step, focus: step?.focus }
          })
          .sort((a: any, b: any) => (a.step ?? 999) - (b.step ?? 999))
        setTeam(enriched)
      }).catch(() => {})
    }
  }, [authUser?.role])

  // Workflow options for filter dropdown (derived from loaded submissions)
  const workflowOptions = useMemo(() => {
    const map = new Map<string, string>()
    submissions.forEach(s => { if (s.workflow_id) map.set(s.workflow_id, s.workflow_name) })
    return Array.from(map.entries())
  }, [submissions])

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return submissions.filter(s => {
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      const matchWf     = wfFilter === 'all' || s.workflow_id === wfFilter
      return matchSearch && matchWf
    })
  }, [submissions, search, wfFilter])

  // Swimlanes
  const needsAction = filtered.filter(s => s.status === 'draft' || s.status === 'changes_requested')
  const inReview    = filtered.filter(s => s.status === 'in_review')
  const done        = filtered.filter(s => s.status === 'approved')

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const hasAnySubmissions = !loading && submissions.length > 0

  return (
    <div className="flex-1 bg-p-bg min-h-screen">
      <main className="max-w-7xl mx-auto px-8 py-12">

        {/* Page header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-p-text">Inbox</h1>
            <p className="text-[15px] text-p-secondary mt-1.5">Track submissions through the approval pipeline.</p>
          </div>

          {/* Quick stats */}
          {hasAnySubmissions && (
            <div className="flex items-center gap-4 text-[12px]">
              {needsAction.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-p-error" />
                  <span className="text-p-secondary font-medium">{needsAction.length} need action</span>
                </div>
              )}
              {inReview.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-p-warning animate-pulse-soft" />
                  <span className="text-p-secondary font-medium">{inReview.length} in review</span>
                </div>
              )}
              {done.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-p-success" />
                  <span className="text-p-secondary font-medium">{done.length} done</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search + filter bar */}
        {hasAnySubmissions && (
          <div className="flex gap-2.5 mb-7">
            <div className="relative flex-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-p-quaternary pointer-events-none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z"/>
              </svg>
              <input
                type="text"
                placeholder="Search by title or description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-p-surface border border-p-border rounded-2xl pl-10 pr-4 py-3 text-[14px] text-p-text shadow-sm placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent-soft transition-all"
              />
            </div>
            {workflowOptions.length > 1 && (
              <select
                value={wfFilter}
                onChange={e => setWfFilter(e.target.value)}
                className="bg-p-surface border border-p-border rounded-2xl px-3.5 py-2.5 text-[13px] text-p-text focus:outline-none focus:border-p-border-strong transition-colors appearance-none cursor-pointer pr-8"
              >
                <option value="all">All Workflows</option>
                {workflowOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Swimlane grid ── */}
        {!hasAnySubmissions && !loading ? (
          // Global empty state (no submissions at all)
          <div className="bg-p-surface rounded-[2rem] border border-p-border shadow-card p-20 text-center max-w-2xl mx-auto mt-10">
            <div className="w-16 h-16 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="text-p-tertiary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-p-text mb-2">No submissions yet</h2>
            <p className="text-[14px] text-p-secondary mb-8 max-w-sm mx-auto leading-relaxed">
              Create a submission and send it through an approval workflow to get started.
            </p>
            <Link href="/submit" className="inline-flex items-center gap-2 bg-p-accent hover:bg-p-accent-h text-white text-[15px] font-medium px-6 py-3 rounded-full transition-all duration-300 shadow-accent hover:-translate-y-0.5">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              New Request
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start mt-10">

            {/* Main Feed: Tasks & Needs Action & In Review */}
            <div className="lg:col-span-3">
              
              {/* Tasks Section */}
              {(!loading && tasks.length > 0) && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-[13px] font-bold uppercase tracking-widest text-p-text flex items-center gap-2">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-accent">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Open Tasks
                    </h2>
                    <span className="text-[11px] font-semibold text-p-tertiary bg-white border border-p-border px-2 py-0.5 rounded-md">
                      {tasks.length} tasks
                    </span>
                  </div>
                  <div>
                    {tasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
                    {tasks.length > 5 && (
                      <Link href="/tasks" className="block text-center text-[12px] font-semibold text-p-accent hover:text-p-accent-h mt-2 transition-colors">
                        View all {tasks.length} tasks &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-p-text">Active Pipeline</h2>
                {!loading && (
                  <span className="text-[11px] font-semibold text-p-tertiary">
                    {needsAction.length + inReview.length} active
                  </span>
                )}
              </div>
              
              {loading ? (
                <div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
              ) : (needsAction.length + inReview.length === 0) ? (
                <div className="bg-transparent rounded-3xl border-2 border-p-border border-dashed p-12 text-center transition-colors hover:bg-p-surface/50">
                  <div className="w-12 h-12 rounded-2xl bg-p-surface shadow-card flex items-center justify-center mx-auto mb-4 text-p-tertiary">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <p className="font-display text-[15px] font-semibold text-p-text mb-1.5">Inbox Zero!</p>
                  <p className="text-[13px] text-p-tertiary leading-relaxed">No active items waiting for your review.</p>
                </div>
              ) : (
                <div>
                  {/* Needs Action List */}
                  {needsAction.length > 0 && (
                    <div className="mb-6">
                      {needsAction.map(s => <SubmissionRow key={s.id} sub={s} />)}
                    </div>
                  )}

                  {/* In Review List */}
                  {inReview.length > 0 && (
                    <div>
                      {needsAction.length > 0 && <div className="text-[11px] font-semibold uppercase tracking-widest text-p-quaternary mb-3 px-1 mt-6">Also In pipeline</div>}
                      {inReview.map(s => <SubmissionRow key={s.id} sub={s} />)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Completed & Team */}
            <div className="lg:col-span-2 space-y-10">
              {/* Recently Completed */}
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-[13px] font-bold uppercase tracking-widest text-p-secondary">Recently Completed</h2>
                  {!loading && done.length > 0 && (
                    <span className="text-[11px] font-semibold text-p-success bg-p-success-soft px-2 py-0.5 rounded-md">
                      {done.length} done
                    </span>
                  )}
                </div>

                {loading ? (
                  <div><SkeletonRow /><SkeletonRow /></div>
                ) : done.length === 0 ? (
                  <div className="bg-transparent rounded-3xl border border-p-border border-dashed p-8 text-center bg-p-surface/30">
                    <p className="text-[13px] font-medium text-p-secondary">No completed items yet</p>
                  </div>
                ) : (
                  <div>
                    {done.slice(0, 5).map(s => <SubmissionRow key={s.id} sub={s} />)}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── Review Team ── */}
        {team.length > 0 && (
          <div className="mt-10 pt-8 border-t border-p-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-semibold text-p-tertiary uppercase tracking-widest">Review Team</h2>
              <Link href="/admin" className="text-[12px] font-medium text-p-accent hover:text-p-accent-h transition-colors">
                Manage →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {team.slice(0, 6).map((member, i) => (
                <div key={member.id} className="bg-p-surface rounded-2xl border border-p-border shadow-card p-4 flex items-center gap-3 group">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-[13px] flex-shrink-0"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {member.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-p-text truncate">{member.name}</div>
                    <div className="text-[11px] text-p-tertiary mt-0.5 truncate">
                      {member.step ? `Step ${member.step}` : member.role === 'admin' ? 'Admin' : 'Member'}
                    </div>
                  </div>
                  <button
                    onClick={() => copyLink(member.token)}
                    title="Copy review link"
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all flex-shrink-0
                      ${copied === member.token
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-p-fill border-p-border text-p-secondary hover:border-p-accent/40 hover:text-p-accent hover:bg-p-accent-soft'
                      }`}
                  >
                    {copied === member.token ? (
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                    ) : (
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* How it works strip */}
            <div className="mt-4 rounded-2xl bg-p-nav px-6 py-4 flex items-center gap-8">
              <p className="text-[11px] font-semibold text-white/50 flex-shrink-0">How it works</p>
              <div className="flex items-center gap-3 flex-wrap">
                {team.filter(m => m.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)).map((m, i, arr) => (
                  <div key={m.id} className="flex items-center gap-3">
                    {i > 0 && (
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-white/20 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-white/10 text-white/50 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {m.step}
                      </span>
                      <span className="text-[11px] text-white/50">{m.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ml-auto flex-shrink-0">
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[11px] font-medium transition-colors"
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Admin Panel
                </Link>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  priority: 'low' | 'medium' | 'high'
  assignee: { name: string } | null
  due_date: string | null
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

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  const d = new Date(s), diff = Date.now() - d.getTime()
  if (diff < 60000)    return 'Just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#0EA572', '#E8882C', '#DC3545']

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
}

// ── Sub-components ────────────────────────────────────────────────────────

function SubmissionRow({ sub }: { sub: Submission }) {
  const isRevision = sub.status === 'changes_requested'
  const isDone     = sub.status === 'approved'
  const isReview   = sub.status === 'in_review'

  const dotClass = isRevision ? 'bg-red-400'
    : isReview   ? 'bg-amber-400 animate-pulse-soft'
    : isDone     ? 'bg-emerald-400'
    : 'bg-stone-300'

  const dotRing = isRevision ? 'ring-red-400/20'
    : isReview   ? 'ring-amber-400/20'
    : isDone     ? 'ring-emerald-400/20'
    : 'ring-transparent'

  return (
    <Link
      href={`/submission/${sub.id}`}
      className="group flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-transparent hover:border-p-border/60 shadow-sm hover:shadow-card transition-all duration-300 mb-3 animate-fade-in"
    >
      {/* Status dot */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ${dotClass} ${dotRing}`} />

      {/* Title */}
      <p className="flex-1 text-[14.5px] font-semibold text-p-text group-hover:text-p-accent transition-colors truncate min-w-0">
        {sub.title}
      </p>

      {/* Needs action badge */}
      {isRevision && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100">
          Revise
        </span>
      )}

      {/* Reviewer chip */}
      {isReview && sub.current_reviewer && (
        <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
            <span className="text-[10px] font-bold text-amber-700">{sub.current_reviewer.name[0]}</span>
          </div>
          <span className="text-[12px] text-amber-700 font-semibold hidden lg:block">{sub.current_reviewer.name}</span>
        </div>
      )}

      {/* Meta */}
      <div className="flex-shrink-0 text-right hidden md:block">
        <span className="text-[12px] text-p-tertiary tabular-nums">
          {sub.design_count === 1 ? '1 design' : `${sub.design_count} designs`} · {fmtDate(sub.created_at)}
        </span>
      </div>

      {/* Arrow */}
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        className="text-p-quaternary group-hover:text-p-accent transition-colors flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-transparent shadow-sm animate-pulse mb-3">
      <div className="w-2.5 h-2.5 rounded-full bg-p-fill flex-shrink-0" />
      <div className="flex-1 h-4 bg-p-fill rounded-lg" />
      <div className="h-3.5 bg-p-fill rounded-lg w-32 hidden md:block" />
      <div className="w-3.5 h-3.5 bg-p-fill rounded flex-shrink-0" />
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  return (
    <div className="group flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-transparent hover:border-p-border/60 shadow-sm hover:shadow-card transition-all duration-300 mb-3">
      {/* Priority dot */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-stone-300'}`} />

      {/* Project + title */}
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-p-text group-hover:text-p-accent transition-colors truncate">
          {task.title}
        </p>
        <p className="text-[12px] text-p-tertiary truncate mt-0.5">{task.project_name}</p>
      </div>

      {/* Due date */}
      {task.due_date && (
        <span className={`text-[11px] font-bold flex-shrink-0 hidden lg:block ${isOverdue ? 'text-red-500' : 'text-p-tertiary'}`}>
          {isOverdue ? 'Overdue' : new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}

      {/* Assignee */}
      {task.assignee && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-p-fill flex items-center justify-center border-2 border-p-border">
            <span className="text-[10px] font-bold text-p-secondary">{task.assignee.name[0]}</span>
          </div>
          <span className="text-[12px] font-semibold text-p-secondary hidden xl:block">{task.assignee.name}</span>
        </div>
      )}

      {/* Submit CTA */}
      <Link
        href={`/submit?task_id=${task.id}`}
        onClick={e => e.stopPropagation()}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all text-p-accent bg-p-accent-soft hover:bg-p-accent hover:text-white border border-transparent hover:border-p-accent"
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Submit
      </Link>
    </div>
  )
}

// ── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
      {children}
      <span className="flex-1 h-px bg-p-border" />
    </h2>
  )
}

// ── Stats pill ─────────────────────────────────────────────────────────────

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold ${color}`}>
      <span className="text-[17px] font-display leading-none">{count}</span>
      <span className="font-semibold opacity-80">{label}</span>
    </div>
  )
}

// ── Filter tabs ────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'action' | 'in_review' | 'done'

// ── Page ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user: authUser }            = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tasks, setTasks]             = useState<Task[]>([])
  const [team, setTeam]               = useState<TeamMember[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [wfFilter, setWfFilter]       = useState('all')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [copied, setCopied]           = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: / → focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/submissions').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
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

  const workflowOptions = useMemo(() => {
    const map = new Map<string, string>()
    submissions.forEach(s => { if (s.workflow_id) map.set(s.workflow_id, s.workflow_name) })
    return Array.from(map.entries())
  }, [submissions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return submissions.filter(s => {
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      const matchWf     = wfFilter === 'all' || s.workflow_id === wfFilter
      return matchSearch && matchWf
    })
  }, [submissions, search, wfFilter])

  const needsAction = filtered.filter(s => s.status === 'draft' || s.status === 'changes_requested')
  const inReview    = filtered.filter(s => s.status === 'in_review')
  const done        = filtered.filter(s => s.status === 'approved')

  const pipelineItems = useMemo(() => {
    if (activeFilter === 'action')    return needsAction
    if (activeFilter === 'in_review') return inReview
    if (activeFilter === 'done')      return done
    return [...needsAction, ...inReview]
  }, [activeFilter, needsAction, inReview, done])

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const hasAnySubmissions = !loading && submissions.length > 0

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',       label: 'Active',      count: needsAction.length + inReview.length },
    { key: 'action',    label: 'Need Action', count: needsAction.length },
    { key: 'in_review', label: 'In Review',   count: inReview.length },
    { key: 'done',      label: 'Approved',    count: done.length },
  ]

  return (
    <div className="flex-1 bg-p-bg">
      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-10">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-p-text leading-tight">
              Dashboard
            </h1>
            <p className="text-[15px] text-p-secondary mt-2.5">Track submissions through the approval pipeline.</p>
          </div>

          {/* Quick stats */}
          {hasAnySubmissions && (
            <div className="flex items-center gap-2.5 mt-1">
              {inReview.length > 0 && (
                <StatPill count={inReview.length} label="in review" color="bg-amber-50 text-amber-700 border border-amber-100" />
              )}
              {needsAction.length > 0 && (
                <StatPill count={needsAction.length} label="need action" color="bg-red-50 text-red-600 border border-red-100" />
              )}
              {done.length > 0 && (
                <StatPill count={done.length} label="approved" color="bg-emerald-50 text-emerald-700 border border-emerald-100" />
              )}
            </div>
          )}
        </div>

        {/* ── Search + Filter bar ── */}
        {hasAnySubmissions && (
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {/* Search */}
            <div className="relative flex-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-p-quaternary pointer-events-none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z"/>
              </svg>
              <input
                ref={searchRef}
                id="search-input"
                type="text"
                placeholder="Search submissions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border-2 border-transparent focus:border-p-border/60 rounded-2xl pl-10 pr-12 py-3.5 text-[14px] text-p-text shadow-sm placeholder:text-p-quaternary focus:outline-none focus:shadow-card transition-all"
              />
              {!search && (
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">/</kbd>
              )}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-p-quaternary hover:text-p-secondary transition-colors"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Workflow filter */}
            {workflowOptions.length > 1 && (
              <select
                value={wfFilter}
                onChange={e => setWfFilter(e.target.value)}
                className="bg-white border-2 border-transparent rounded-2xl px-4 py-3.5 text-[13px] text-p-secondary focus:outline-none focus:border-p-border/60 cursor-pointer appearance-none pr-8 shadow-sm"
              >
                <option value="all">All Workflows</option>
                {workflowOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {!hasAnySubmissions && !loading ? (
          // Empty state
          <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center max-w-2xl mx-auto mt-8 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="text-p-tertiary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-p-text mb-3">No submissions yet</h2>
            <p className="text-[15px] text-p-secondary mb-10 max-w-xs mx-auto leading-relaxed">
              Create a submission and send it through an approval workflow to get started.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2.5 text-white text-[14px] font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-1 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Request
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

            {/* ── Left col: Tasks + Active Pipeline ── */}
            <div className="lg:col-span-3">

              {/* Tasks section */}
              {(!loading && tasks.length > 0) && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} className="text-p-accent flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Open Tasks
                    </SectionHeader>
                    <span className="text-[12px] font-bold text-p-tertiary bg-white border-2 border-p-border px-3 py-1.5 rounded-full shadow-sm -mt-6">
                      {tasks.length}
                    </span>
                  </div>
                  {tasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
                  {tasks.length > 5 && (
                    <Link href="/tasks" className="block text-center text-[13px] font-bold text-p-accent hover:text-p-accent-h mt-3 transition-colors py-2">
                      View all {tasks.length} tasks →
                    </Link>
                  )}
                </div>
              )}

              {/* Pipeline header + filter tabs */}
              <div className="flex items-center justify-between mb-6">
                <SectionHeader>Pipeline</SectionHeader>
                {hasAnySubmissions && (
                  <div className="flex items-center gap-1 bg-p-fill rounded-2xl p-1 border border-p-border -mt-6">
                    {filterTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center gap-1.5
                          ${activeFilter === tab.key
                            ? 'bg-white text-p-text shadow-sm'
                            : 'text-p-tertiary hover:text-p-secondary'
                          }`}
                      >
                        {tab.label}
                        {tab.count > 0 && (
                          <span className={`text-[10px] font-bold rounded-full px-1.5 min-w-[16px] text-center leading-4
                            ${activeFilter === tab.key ? 'bg-p-fill text-p-secondary' : 'text-p-quaternary'}`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pipeline list */}
              {loading ? (
                <div><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
              ) : pipelineItems.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-p-border p-16 text-center bg-white/40 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-3xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-p-tertiary">
                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <p className="font-display text-[15px] font-bold text-p-secondary">
                    {activeFilter === 'done' ? 'Nothing approved yet' : 'All clear!'}
                  </p>
                  <p className="text-[13px] text-p-tertiary mt-1.5">
                    {activeFilter === 'done' ? 'Approved submissions will appear here.' : 'No items waiting for action.'}
                  </p>
                </div>
              ) : (
                <div>
                  {activeFilter === 'all' && needsAction.length > 0 && inReview.length > 0 ? (
                    <>
                      {needsAction.map(s => <SubmissionRow key={s.id} sub={s} />)}
                      <div className="flex items-center gap-4 my-5">
                        <div className="flex-1 h-px bg-p-border" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-p-quaternary">Also in pipeline</span>
                        <div className="flex-1 h-px bg-p-border" />
                      </div>
                      {inReview.map(s => <SubmissionRow key={s.id} sub={s} />)}
                    </>
                  ) : (
                    pipelineItems.map(s => <SubmissionRow key={s.id} sub={s} />)
                  )}
                </div>
              )}
            </div>

            {/* ── Right col: Approved + Team ── */}
            <div className="lg:col-span-2 space-y-10">

              {/* Recently Approved */}
              {activeFilter !== 'done' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader>Recently Approved</SectionHeader>
                    {done.length > 0 && (
                      <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full -mt-6">
                        {done.length} done
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <div><SkeletonRow /><SkeletonRow /></div>
                  ) : done.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-p-border p-10 text-center bg-white/40">
                      <p className="text-[13px] font-semibold text-p-tertiary">No approvals yet</p>
                    </div>
                  ) : (
                    done.slice(0, 4).map(s => <SubmissionRow key={s.id} sub={s} />)
                  )}
                </div>
              )}

              {/* Review Team */}
              {team.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <SectionHeader>Review Team</SectionHeader>
                    <Link href="/admin" className="text-[12px] font-bold text-p-accent hover:text-p-accent-h transition-colors -mt-6">
                      Manage →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {team.slice(0, 6).map((member, i) => (
                      <div key={member.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border-2 border-transparent hover:border-p-border/60 shadow-sm transition-all">
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0"
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                        >
                          {member.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-bold text-p-text truncate">{member.name}</div>
                          <div className="text-[11px] text-p-tertiary mt-px">
                            {member.step ? `Step ${member.step}${member.focus ? ` · ${member.focus}` : ''}` : member.role === 'admin' ? 'Admin' : 'Member'}
                          </div>
                        </div>
                        <button
                          onClick={() => copyLink(member.token)}
                          title="Copy review link"
                          className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 transition-all text-[11px] font-bold flex items-center gap-1.5
                            ${copied === member.token
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-p-fill border-p-border text-p-tertiary hover:border-p-accent/40 hover:text-p-accent hover:bg-p-accent-soft'
                            }`}
                        >
                          {copied === member.token ? (
                            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          ) : (
                            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                          )}
                          {copied === member.token ? 'Copied' : 'Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  )
}

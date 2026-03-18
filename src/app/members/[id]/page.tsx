'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Avatar from '@/components/Avatar'

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
}

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-stone-300',
  in_progress: 'bg-blue-400',
  in_review:   'bg-amber-400',
  completed:   'bg-emerald-400',
  draft:       'bg-stone-300',
  approved:    'bg-emerald-400',
  changes_requested: 'bg-red-400',
}

type MemberData = {
  member: {
    id: string
    name: string
    email: string
    role: 'admin' | 'member'
    avatar_url: string | null
    token: string
    created_at: string
  }
  stats: {
    tasks_assigned: number
    tasks_completed: number
    tasks_open: number
    submissions_total: number
    submissions_approved: number
    submissions_in_review: number
  }
  recentTasks: {
    id: string
    title: string
    status: string
    priority: string
    due_date: string | null
    assignee: { name: string } | null
    assignor: { name: string } | null
  }[]
  recentSubmissions: {
    id: string
    title: string
    status: string
    created_at: string
  }[]
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-1 ${color}`}>
      <span className="font-display text-3xl font-semibold leading-none">{value}</span>
      <span className="text-[12px] font-semibold opacity-80">{label}</span>
    </div>
  )
}

export default function MemberPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/members/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(setData)
      .catch(() => setError('Member not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 bg-p-bg">
        <main className="max-w-5xl mx-auto px-8 lg:px-12 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-p-fill rounded-2xl w-32" />
            <div className="h-32 bg-white rounded-3xl shadow-sm" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl shadow-sm" />)}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex-1 bg-p-bg">
        <main className="max-w-5xl mx-auto px-8 lg:px-12 py-10">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-bold text-p-tertiary hover:text-p-text transition-colors mb-8">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Dashboard
          </Link>
          <p className="text-p-secondary text-[15px]">{error || 'Member not found'}</p>
        </main>
      </div>
    )
  }

  const { member, stats, recentTasks, recentSubmissions } = data

  return (
    <div className="flex-1 bg-p-bg">
      <main className="max-w-5xl mx-auto px-8 lg:px-12 py-10">

        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-bold text-p-tertiary hover:text-p-text transition-colors mb-8">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Dashboard
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-3xl shadow-sm border-2 border-transparent p-8 mb-6">
          <div className="flex items-center gap-6">
            <Avatar src={member.avatar_url} name={member.name} size={80} colorIndex={0} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl font-semibold text-p-text tracking-tight">{member.name}</h1>
              <p className="text-[15px] text-p-secondary mt-1">{member.email}</p>
              <div className="flex items-center gap-2.5 mt-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-p-fill border-2 border-p-border text-p-tertiary">
                  {member.role}
                </span>
                <span className="text-[12px] text-p-quaternary">
                  Member since {fmtDate(member.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard value={stats.tasks_completed} label="Tasks completed" color="bg-emerald-50 text-emerald-700 border border-emerald-100" />
          <StatCard value={stats.tasks_open} label="Tasks open" color="bg-blue-50 text-blue-700 border border-blue-100" />
          <StatCard value={stats.submissions_approved} label="Submissions approved" color="bg-amber-50 text-amber-700 border border-amber-100" />
          <StatCard value={stats.submissions_in_review} label="In review" color="bg-stone-50 text-stone-600 border border-stone-200" />
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent tasks */}
          <div className="bg-white rounded-3xl shadow-sm border-2 border-transparent p-6">
            <h2 className="font-bold text-[15px] text-p-text mb-5">Recent Tasks</h2>
            {recentTasks.length === 0 ? (
              <p className="text-[13px] text-p-tertiary">No tasks yet.</p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-2xl border-2 border-p-border bg-p-bg/40">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${PRIORITY_DOT[task.priority] ?? 'bg-stone-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-p-text truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[task.status] ?? 'bg-stone-300'}`} />
                        <span className="text-[11px] text-p-tertiary capitalize">{task.status.replace('_', ' ')}</span>
                      </div>
                      {(task.assignor || task.assignee) && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-p-quaternary">
                          {task.assignor && <span>{task.assignor.name}</span>}
                          {task.assignor && task.assignee && (
                            <svg width="8" height="8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                            </svg>
                          )}
                          {task.assignee && <span className="font-semibold text-p-secondary">assigned to {task.assignee.name}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent submissions */}
          <div className="bg-white rounded-3xl shadow-sm border-2 border-transparent p-6">
            <h2 className="font-bold text-[15px] text-p-text mb-5">Recent Submissions</h2>
            {recentSubmissions.length === 0 ? (
              <p className="text-[13px] text-p-tertiary">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map(sub => (
                  <Link
                    key={sub.id}
                    href={`/submission/${sub.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl border-2 border-p-border bg-p-bg/40 hover:border-p-border/80 hover:bg-white transition-all group"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[sub.status] ?? 'bg-stone-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-p-text truncate group-hover:text-p-accent transition-colors">{sub.title}</p>
                      <p className="text-[11px] text-p-tertiary mt-0.5">{fmtDate(sub.created_at)}</p>
                    </div>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="text-p-quaternary group-hover:text-p-accent flex-shrink-0 transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  )
}

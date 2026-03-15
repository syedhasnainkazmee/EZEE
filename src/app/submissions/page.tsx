'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Submission = {
  id: string
  title: string
  description: string
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested'
  workflow_name: string
  design_count: number
  version: number
  created_at: string
  current_reviewer: { name: string; role: string } | null
  changes_review: { reviewer_name: string; comment: string } | null
}

function fmtDate(s: string) {
  const d = new Date(s), diff = Date.now() - d.getTime()
  if (diff < 60000)    return 'Just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-transparent shadow-sm animate-pulse mb-3">
      <div className="w-2.5 h-2.5 rounded-full bg-p-fill flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-p-fill rounded-lg w-1/2" />
        <div className="h-3 bg-p-fill rounded-lg w-1/3" />
      </div>
      <div className="h-3.5 bg-p-fill rounded-lg w-20 hidden md:block" />
      <div className="w-3.5 h-3.5 bg-p-fill rounded flex-shrink-0" />
    </div>
  )
}

function SubmissionRow({ sub }: { sub: Submission }) {
  const isChanges  = sub.status === 'changes_requested'
  const isApproved = sub.status === 'approved'
  const isDraft    = sub.status === 'draft'
  const isInReview = sub.status === 'in_review'

  const dotClass = isChanges  ? 'bg-red-400'
    : isInReview ? 'bg-amber-400 animate-pulse-soft'
    : isApproved ? 'bg-emerald-400'
    : 'bg-stone-300'

  const dotRing = isChanges  ? 'ring-red-400/20'
    : isInReview ? 'ring-amber-400/20'
    : isApproved ? 'ring-emerald-400/20'
    : 'ring-transparent'

  return (
    <Link
      href={`/submission/${sub.id}`}
      className="group flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-transparent hover:border-p-border/60 shadow-sm hover:shadow-card transition-all duration-300 mb-3 animate-fade-in"
    >
      {/* Status dot */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ${dotClass} ${dotRing}`} />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-p-text group-hover:text-p-accent transition-colors truncate">
          {sub.title}
        </p>
        <p className="text-[12px] text-p-tertiary truncate mt-0.5">
          {sub.workflow_name}
          {' · '}{sub.design_count} design{sub.design_count !== 1 ? 's' : ''}
          {isInReview && sub.current_reviewer ? ` · ${sub.current_reviewer.name}` : ''}
        </p>
      </div>

      {/* Action badge */}
      {isChanges && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100">
          Revise
        </span>
      )}
      {isDraft && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-p-secondary bg-p-fill border border-p-border">
          Draft
        </span>
      )}

      {/* Version */}
      {sub.version > 1 && (
        <span className="flex-shrink-0 text-[11px] font-bold text-p-tertiary bg-p-fill border-2 border-p-border px-2.5 py-1 rounded-full hidden sm:block">
          v{sub.version}
        </span>
      )}

      {/* Reviewer chip */}
      {isInReview && sub.current_reviewer && (
        <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
            <span className="text-[10px] font-bold text-amber-700">{sub.current_reviewer.name[0]}</span>
          </div>
        </div>
      )}

      {/* Date */}
      <div className="flex-shrink-0 hidden md:block">
        <span className="text-[12px] text-p-tertiary tabular-nums">{fmtDate(sub.created_at)}</span>
      </div>

      {/* Arrow */}
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        className="text-p-quaternary group-hover:text-p-accent transition-colors flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  )
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    fetch('/api/my/submissions')
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions ?? []))
      .finally(() => setLoading(false))
  }, [])

  const needsAction = submissions.filter(s => s.status === 'draft' || s.status === 'changes_requested')
  const active      = submissions.filter(s => s.status === 'in_review')
  const done        = submissions.filter(s => s.status === 'approved')

  return (
    <div className="flex-1 bg-p-bg">
      <main className="max-w-5xl mx-auto px-8 lg:px-12 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-p-text leading-tight">
              My Submissions
            </h1>
            <p className="text-[15px] text-p-secondary mt-2.5">Your design submissions and their current status.</p>
          </div>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2.5 text-white text-[14px] font-bold px-7 py-4 rounded-2xl hover:-translate-y-1 active:translate-y-0 transition-all mt-1"
            style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            New Submission
          </Link>
        </div>

        {loading ? (
          <div><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
        ) : submissions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center max-w-2xl mx-auto mt-8 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="text-p-tertiary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-p-text mb-3">No submissions yet</h2>
            <p className="text-[15px] text-p-secondary mb-10 max-w-xs mx-auto leading-relaxed">
              Create your first submission to start the design review process.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2.5 text-white text-[14px] font-bold px-7 py-4 rounded-2xl hover:-translate-y-1 active:translate-y-0 transition-all"
              style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Submission
            </Link>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Needs Action */}
            {needsAction.length > 0 && (
              <div>
                <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} className="text-p-accent flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Needs Your Action
                  <span className="flex-1 h-px bg-p-border" />
                  <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full flex-shrink-0">
                    {needsAction.length}
                  </span>
                </h2>
                {needsAction.map(s => <SubmissionRow key={s.id} sub={s} />)}
              </div>
            )}

            {/* In Review */}
            {active.length > 0 && (
              <div>
                <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} className="text-amber-500 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  In Review
                  <span className="flex-1 h-px bg-p-border" />
                  <span className="text-[11px] font-bold text-p-tertiary flex-shrink-0">{active.length}</span>
                </h2>
                {active.map(s => <SubmissionRow key={s.id} sub={s} />)}
              </div>
            )}

            {/* Approved */}
            {done.length > 0 && (
              <div>
                <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} className="text-emerald-500 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Approved
                  <span className="flex-1 h-px bg-p-border" />
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full flex-shrink-0">
                    {done.length} done
                  </span>
                </h2>
                {done.map(s => <SubmissionRow key={s.id} sub={s} />)}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}

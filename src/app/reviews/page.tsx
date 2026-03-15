'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

type ReviewItem = {
  id: string
  title: string
  workflow_name: string
  status: string
  my_step: number
  my_focus: string
  my_action: 'approved' | 'changes_requested' | null
  my_comment: string | null
  designs: { id: string; filename: string }[]
  previousReviews: { reviewer: { name: string } | null; action: string | null; comment: string }[]
  created_at: string
}

function fmtDate(s: string) {
  const d = new Date(s), diff = Date.now() - d.getTime()
  if (diff < 60000)    return 'Just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
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

function ReviewRow({ item, userToken }: { item: ReviewItem; userToken: string }) {
  const isPending  = item.my_action === null && item.status === 'in_review'
  const isApproved = item.my_action === 'approved'
  const isRevision = item.my_action === 'changes_requested'

  const dotClass = isPending  ? 'bg-amber-400 animate-pulse-soft ring-amber-400/20'
    : isApproved ? 'bg-emerald-400 ring-emerald-400/20'
    : isRevision ? 'bg-red-400 ring-red-400/20'
    : 'bg-stone-300 ring-transparent'

  return (
    <div className={`group flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 shadow-sm transition-all duration-300 mb-3 animate-fade-in
      ${isPending ? 'border-amber-200/80 hover:border-amber-300' : 'border-transparent hover:border-p-border/60 hover:shadow-card'}`}>

      {/* Status dot */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ${dotClass}`} />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-p-text truncate">
          {item.title}
        </p>
        <p className="text-[12px] text-p-tertiary truncate mt-0.5">
          {item.workflow_name} · Step {item.my_step}
          {item.my_focus ? ` · ${item.my_focus}` : ''}
        </p>
      </div>

      {/* State badge */}
      {isPending && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100">
          Awaiting
        </span>
      )}
      {isApproved && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100">
          Approved
        </span>
      )}
      {isRevision && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100">
          Changes
        </span>
      )}

      {/* Design thumbnails */}
      {item.designs.length > 0 && (
        <div className="flex -space-x-2.5 flex-shrink-0 hidden sm:flex">
          {item.designs.slice(0, 3).map(d => (
            <div key={d.id} className="w-9 h-9 rounded-2xl border-2 border-p-bg bg-p-fill overflow-hidden shadow-sm">
              <img src={`/uploads/${d.filename}`} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {item.designs.length > 3 && (
            <div className="w-9 h-9 rounded-2xl border-2 border-p-bg bg-p-fill flex items-center justify-center text-[10px] font-bold text-p-tertiary shadow-sm">
              +{item.designs.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Date */}
      <span className="text-[12px] text-p-tertiary flex-shrink-0 hidden md:block tabular-nums">
        {fmtDate(item.created_at)}
      </span>

      {/* CTA */}
      {isPending ? (
        <Link
          href={`/review/${userToken}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all text-p-accent bg-p-accent-soft hover:bg-p-accent hover:text-white border-2 border-transparent hover:border-p-accent"
        >
          Review →
        </Link>
      ) : (
        <Link
          href={`/review/${userToken}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 p-2 rounded-xl text-p-quaternary hover:text-p-accent hover:bg-p-fill transition-all"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </Link>
      )}
    </div>
  )
}

export default function ReviewsPage() {
  const { user }                  = useAuth()
  const [reviews, setReviews]     = useState<ReviewItem[]>([])
  const [userToken, setUserToken] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/my/reviews')
      .then(r => r.json())
      .then(d => {
        setReviews(d.reviews ?? [])
        setUserToken(d.userToken ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const pending  = reviews.filter(r => r.my_action === null && r.status === 'in_review')
  const reviewed = reviews.filter(r => r.my_action !== null || r.status !== 'in_review')

  return (
    <div className="flex-1 bg-p-bg">
      <main className="max-w-5xl mx-auto px-8 lg:px-12 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-p-text leading-tight">
              My Reviews
            </h1>
            <p className="text-[15px] text-p-secondary mt-2.5">Design submissions waiting for your feedback.</p>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-50 border-2 border-amber-100 text-[12px] font-bold text-amber-700 mt-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-soft" />
              {pending.length} pending
            </div>
          )}
        </div>

        {loading ? (
          <div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
        ) : reviews.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center max-w-2xl mx-auto mt-8 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="text-p-tertiary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-p-text mb-3">No reviews yet</h2>
            <p className="text-[15px] text-p-secondary max-w-xs mx-auto leading-relaxed">
              You&apos;ll see design submissions here once you&apos;re added to a review workflow.
            </p>
          </div>
        ) : (
          <div className="space-y-10">

            {pending.length > 0 && (
              <div>
                <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} className="text-amber-500 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  Awaiting Your Review
                  <span className="flex-1 h-px bg-p-border" />
                  <span className="text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full flex-shrink-0">
                    {pending.length} pending
                  </span>
                </h2>
                {pending.map(r => (
                  <ReviewRow key={r.id} item={r} userToken={userToken ?? ''} />
                ))}
              </div>
            )}

            {reviewed.length > 0 && (
              <div>
                <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
                  Previously Reviewed
                  <span className="flex-1 h-px bg-p-border" />
                  <span className="text-[11px] font-bold text-p-tertiary flex-shrink-0">{reviewed.length}</span>
                </h2>
                {reviewed.map(r => (
                  <ReviewRow key={r.id} item={r} userToken={userToken ?? ''} />
                ))}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}

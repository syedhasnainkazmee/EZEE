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

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9F0A', '#FF2D55']

function fmtDate(s: string) {
  const d = new Date(s), diff = Date.now() - d.getTime()
  if (diff < 60000)    return 'Just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function ReviewCard({ item, userToken }: { item: ReviewItem; userToken: string }) {
  const isPending  = item.my_action === null && item.status === 'in_review'
  const isApproved = item.my_action === 'approved'
  const isRevision = item.my_action === 'changes_requested'

  return (
    <div className={`bg-p-surface rounded-2xl border p-5 mb-3 transition-all duration-200 relative overflow-hidden group ${
      isPending ? 'border-p-warning/50 hover:border-p-warning shadow-sm' : 'border-p-border hover:border-p-border-strong hover:shadow-card'
    }`}>
      {isPending && <div className="absolute left-0 top-0 bottom-0 w-1 bg-p-warning" />}
      {isApproved && <div className="absolute left-0 top-0 bottom-0 w-1 bg-p-success" />}
      {isRevision && <div className="absolute left-0 top-0 bottom-0 w-1 bg-p-error" />}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0 md:pl-2">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {isPending && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                Awaiting your review
              </span>
            )}
            {isApproved && (
              <span className="px-2 py-0.5 rounded-md bg-p-success-soft text-[10px] font-bold text-p-success uppercase tracking-widest">
                You approved
              </span>
            )}
            {isRevision && (
              <span className="px-2 py-0.5 rounded-md bg-p-error-soft text-[10px] font-bold text-p-error uppercase tracking-widest">
                You requested changes
              </span>
            )}
            {!isPending && !isApproved && !isRevision && (
              <span className="px-2 py-0.5 rounded-md bg-p-fill text-[10px] font-bold text-p-tertiary uppercase tracking-widest">
                In your workflow
              </span>
            )}
          </div>

          <h3 className="font-display font-semibold text-[16px] text-p-text mb-1 truncate">{item.title}</h3>
          <p className="text-[12px] text-p-secondary">{item.workflow_name} &middot; Step {item.my_step}</p>

          {item.my_focus && (
            <div className="mt-3 bg-p-fill rounded-xl px-3 py-2 border border-p-border">
              <p className="text-[11px] font-semibold text-p-tertiary uppercase tracking-widest mb-0.5">Your focus</p>
              <p className="text-[13px] text-p-text">{item.my_focus}</p>
            </div>
          )}

          {item.my_comment && (
            <div className="mt-2 text-[13px] text-p-secondary italic border-l-2 border-p-border pl-3">
              &ldquo;{item.my_comment}&rdquo;
            </div>
          )}

          {/* Previous reviews */}
          {item.previousReviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.previousReviews.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-p-fill border border-p-border rounded-xl px-2.5 py-1.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {r.reviewer?.name[0] ?? '?'}
                  </div>
                  <span className="text-[11px] font-medium text-p-text">{r.reviewer?.name ?? 'Unknown'}</span>
                  {r.action === 'approved' && (
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-success">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                  {r.action === 'changes_requested' && (
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-error">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <span className="text-[11px] text-p-tertiary">{fmtDate(item.created_at)}</span>
          {item.designs.length > 0 && (
            <div className="flex -space-x-2">
              {item.designs.slice(0, 3).map(d => (
                <div key={d.id} className="w-10 h-10 rounded-xl border-2 border-white bg-p-fill overflow-hidden shadow-sm">
                  <img src={`/uploads/${d.filename}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {item.designs.length > 3 && (
                <div className="w-10 h-10 rounded-xl border-2 border-white bg-p-fill flex items-center justify-center text-[10px] font-bold text-p-tertiary shadow-sm">
                  +{item.designs.length - 3}
                </div>
              )}
            </div>
          )}
          {isPending && (
            <Link
              href={`/review/${userToken}`}
              className="bg-p-accent hover:bg-p-accent-h text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors shadow-accent"
            >
              Review now →
            </Link>
          )}
          {!isPending && (
            <Link
              href={`/submission/${item.id}`}
              className="bg-p-fill border border-p-border hover:bg-white text-p-text text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              View submission
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReviewsPage() {
  const { user }              = useAuth()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my/reviews')
      .then(r => r.json())
      .then(d => setReviews(d.reviews ?? []))
      .finally(() => setLoading(false))
  }, [])

  const pending  = reviews.filter(r => r.my_action === null && r.status === 'in_review')
  const reviewed = reviews.filter(r => r.my_action !== null || r.status !== 'in_review')

  return (
    <div className="flex-1 bg-p-bg min-h-screen">
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-p-text">My Reviews</h1>
          <p className="text-[15px] text-p-secondary mt-1.5">Design submissions waiting for your feedback.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-p-surface rounded-2xl border border-p-border p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <>
            {pending.length === 0 && reviewed.length === 0 ? (
              <div className="bg-p-surface rounded-3xl border border-p-border p-16 text-center">
                <div className="w-14 h-14 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h2 className="font-display text-xl font-semibold text-p-text mb-2">No reviews yet</h2>
                <p className="text-[14px] text-p-secondary">
                  You&apos;ll see design submissions here once you&apos;re added to a review workflow.
                </p>
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <span className="w-2 h-2 rounded-full bg-p-warning animate-pulse" />
                      <h2 className="text-[13px] font-bold uppercase tracking-widest text-p-text">
                        Awaiting your review
                      </h2>
                      <span className="ml-auto text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md">
                        {pending.length} pending
                      </span>
                    </div>
                    {pending.map(r => (
                      <ReviewCard key={r.id} item={r} userToken={user?.id ?? ''} />
                    ))}
                  </div>
                )}

                {reviewed.length > 0 && (
                  <div>
                    <h2 className="text-[13px] font-bold uppercase tracking-widest text-p-secondary mb-4 px-1">
                      Previously reviewed
                    </h2>
                    {reviewed.map(r => (
                      <ReviewCard key={r.id} item={r} userToken={user?.id ?? ''} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

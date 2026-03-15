'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AnnotationCanvas from '@/components/AnnotationCanvas'
import ProcessLogo from '@/components/ProcessLogo'
import Link from 'next/link'

type Design = { id: string; filename: string; original_name: string; variation_label: string }
type Reviewer = { id: string; name: string; role: string; focus: string; step: number; token: string }
type PreviousReview = {
  reviewer: { name: string; role: string; step: number } | null
  action: string; comment: string
}
type Annotation = { id: string; design_id: string; x: number; y: number; comment: string; number: number; reviewer?: { name: string; role: string } | null; reviewer_id?: string }
type SubmissionItem = {
  id: string; title: string; description: string; status: string; current_step: number | null; created_at: string
  my_action: string | null; my_comment: string | null
  designs: Design[]; previousReviews: PreviousReview[]; annotations: Annotation[]
}

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759']

export default function ReviewPage() {
  const { token } = useParams() as { token: string }

  const [reviewer, setReviewer] = useState<Reviewer | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [comments, setComments] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [canvas, setCanvas] = useState<{ submissionId: string; designIdx: number } | null>(null)
  const [localAnnotations, setLocalAnnotations] = useState<Record<string, Annotation[]>>({})

  function load() {
    setLoading(true)
    fetch(`/api/review/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setReviewer(d.reviewer)
        setSubmissions(d.submissions ?? [])
        const map: Record<string, Annotation[]> = {}
        for (const sub of (d.submissions ?? [])) map[sub.id] = sub.annotations ?? []
        setLocalAnnotations(map)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  // Poll every 15s so reviewers see newly assigned submissions without refresh
  useEffect(() => {
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [token])

  async function submitReview(submissionId: string, action: 'approved' | 'changes_requested') {
    const comment = comments[submissionId] ?? ''
    if (action === 'changes_requested' && !comment.trim()) {
      alert('Please add a comment explaining what needs to change.')
      return
    }
    setSubmitting(prev => ({ ...prev, [submissionId]: true }))
    const res = await fetch(`/api/review/${token}/${submissionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment: comment.trim() }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else load()
    setSubmitting(prev => ({ ...prev, [submissionId]: false }))
  }

  if (loading) return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center">
      <div className="flex items-center gap-2.5 text-p-tertiary">
        <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center px-6">
      <div className="bg-p-surface border border-p-border rounded-3xl p-10 max-w-sm w-full text-center shadow-card">
        <div className="w-12 h-12 rounded-2xl bg-p-fill flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </div>
        <h1 className="font-bold text-p-text mb-2 text-lg">Link not found</h1>
        <p className="text-sm text-p-secondary">{error}</p>
      </div>
    </div>
  )

  const pending = submissions.filter(s => s.my_action == null)
  const done    = submissions.filter(s => s.my_action != null)

  const canvasSub    = canvas ? submissions.find(s => s.id === canvas.submissionId) : null
  const canvasDesign = canvasSub ? canvasSub.designs[canvas!.designIdx] : null
  const canvasPins   = (canvasSub && canvasDesign)
    ? (localAnnotations[canvasSub.id] ?? []).filter(a => a.design_id === canvasDesign.id)
    : []

  const avatarColor = AVATAR_COLORS[(reviewer?.step ?? 1) - 1] ?? '#007AFF'

  return (
    <div className="min-h-screen bg-p-bg flex flex-col lg:flex-row">

      {/* Annotation canvas (fullscreen modal) */}
      {canvas && canvasSub && canvasDesign && reviewer && (
        <AnnotationCanvas
          src={canvasDesign.filename}
          variationLabel={canvasDesign.variation_label}
          designId={canvasDesign.id}
          submissionId={canvasSub.id}
          reviewerToken={token}
          existingPins={canvasPins}
          onPinAdded={pin => setLocalAnnotations(prev => ({ ...prev, [canvasSub.id]: [...(prev[canvasSub.id] ?? []), pin] }))}
          onPinDeleted={id => setLocalAnnotations(prev => ({ ...prev, [canvasSub.id]: (prev[canvasSub.id] ?? []).filter(p => p.id !== id) }))}
          onClose={() => setCanvas(null)}
          onPrev={canvas.designIdx > 0 ? () => setCanvas({ ...canvas, designIdx: canvas.designIdx - 1 }) : undefined}
          onNext={canvas.designIdx < canvasSub.designs.length - 1 ? () => setCanvas({ ...canvas, designIdx: canvas.designIdx + 1 }) : undefined}
        />
      )}

      {/* Left Column: Fixed Studio Info Pane */}
      <div className="w-full lg:w-[380px] xl:w-[440px] bg-white border-r border-p-border p-8 lg:p-12 flex flex-col lg:h-screen lg:sticky lg:top-0 z-10 shrink-0">
        <div className="mb-12">
          <ProcessLogo height={22} />
        </div>
        
        <div className="flex-1">
          <div
            className="w-20 h-20 lg:w-24 lg:h-24 rounded-[2rem] flex items-center justify-center font-bold text-[32px] lg:text-[40px] text-white shadow-sm mb-8"
            style={{ background: avatarColor }}
          >
            {reviewer?.name[0]}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-p-text leading-tight mb-3 tracking-tight">{reviewer?.name}</h1>
          <p className="text-[16px] text-p-secondary font-medium">{reviewer?.role}</p>
          
          {reviewer?.focus && (
            <div className="mt-10 bg-p-accent-soft/30 border-2 border-p-accent/20 rounded-[2rem] p-6 lg:p-8">
              <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </div>
              <p className="text-[11px] font-bold text-p-accent uppercase tracking-widest mb-2">Your Review Scope</p>
              <p className="text-[15px] text-p-text leading-relaxed font-medium">{reviewer.focus}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-p-border flex items-center justify-between">
           <p className="text-[13px] font-semibold text-p-tertiary">Studio Mode</p>
           {pending.length > 0 ? (
             <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
               {pending.length} Pending
             </span>
           ) : done.length > 0 ? (
             <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide flex items-center gap-1.5">
               <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
               All Done
             </span>
           ) : null}
        </div>
      </div>

      {/* Right Column: Queue */}
      <main className="flex-1 bg-p-bg p-6 lg:p-12 xl:p-16 lg:h-screen lg:overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-16">

          {/* Empty state */}
          {pending.length === 0 && done.length === 0 && (
            <div className="bg-white border-2 border-p-border border-dashed rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-20 h-20 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-6 shadow-sm">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="font-display font-semibold text-p-text text-2xl mb-3">All clear</h2>
              <p className="text-[16px] text-p-secondary max-w-sm mx-auto leading-relaxed">Nothing to review right now. You'll receive an email when something is ready for you.</p>
            </div>
          )}

          {/* Pending submissions */}
          {pending.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 lg:mb-8 flex items-center gap-3">
                Action Required
                <span className="flex-1 h-px bg-p-border" />
              </h2>
              <div className="space-y-8 lg:space-y-12">
                {pending.map(sub => (
                  <ReviewCard
                    key={sub.id}
                    sub={sub}
                    token={token}
                    comment={comments[sub.id] ?? ''}
                    onCommentChange={v => setComments(prev => ({ ...prev, [sub.id]: v }))}
                    onApprove={() => submitReview(sub.id, 'approved')}
                    onRequestChanges={() => submitReview(sub.id, 'changes_requested')}
                    submitting={submitting[sub.id] ?? false}
                    onOpenCanvas={idx => setCanvas({ submissionId: sub.id, designIdx: idx })}
                    annotations={localAnnotations[sub.id] ?? []}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Done submissions */}
          {done.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3 opacity-60">
                Previously Reviewed
                <span className="flex-1 h-px bg-p-border" />
              </h2>
              <div className="space-y-4">
                {done.map(sub => (
                  <div key={sub.id} className="bg-white/50 border border-p-border rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
                    <span className="text-[15px] font-semibold text-p-text truncate opacity-80">{sub.title}</span>
                    <span className={`text-[12px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      sub.my_action === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {sub.my_action === 'approved' ? (
                        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>Approved</>
                      ) : (
                        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>Changes Requested</>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}

function ReviewCard({ sub, token, comment, onCommentChange, onApprove, onRequestChanges, submitting, onOpenCanvas, annotations }: {
  sub: SubmissionItem; token: string; comment: string
  onCommentChange: (v: string) => void; onApprove: () => void; onRequestChanges: () => void
  submitting: boolean; onOpenCanvas: (idx: number) => void; annotations: Annotation[]
}) {
  return (
    <div className="bg-white border-2 border-transparent hover:border-p-border/60 rounded-[2.5rem] overflow-hidden shadow-card hover:shadow-card-h transition-all duration-300 p-8 lg:p-10 flex flex-col gap-10">

      {/* Header */}
      <div>
        <h3 className="font-display font-semibold text-p-text text-3xl leading-tight mb-3">{sub.title}</h3>
        {sub.description && <p className="text-[15px] text-p-secondary leading-relaxed max-w-2xl">{sub.description}</p>}
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-bold text-p-tertiary uppercase tracking-widest flex items-center gap-2">
            Asset Gallery
          </p>
          <span className="text-[12px] font-bold text-p-secondary bg-p-fill px-3 py-1.5 rounded-xl">{sub.designs.length} ITEMS</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
          {sub.designs.map((design, idx) => {
            const pinCount = annotations.filter(a => a.design_id === design.id).length
            return (
              <div
                key={design.id}
                className="cursor-pointer group flex flex-col"
                onClick={() => onOpenCanvas(idx)}
              >
                <div
                  className="relative bg-p-bg border-2 border-p-border rounded-3xl overflow-hidden flex items-center justify-center group-hover:border-p-accent transition-all duration-300 shadow-sm group-hover:shadow-md aspect-[4/3] w-full"
                >
                  <img
                    src={design.filename}
                    alt={`Attachment ${design.variation_label}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.03] p-4"
                  />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-p-accent/5 transition-colors flex items-center justify-center backdrop-blur-0 group-hover:backdrop-blur-[2px]">
                    <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-p-accent text-white text-[13px] font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-card transform translate-y-4 group-hover:translate-y-0">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      Open & Annotate
                    </span>
                  </div>
                  {pinCount > 0 && (
                    <div className="absolute top-4 right-4 bg-p-accent text-white text-[12px] font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-card border-2 border-white">
                      {pinCount}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between px-2">
                  <p className="text-[13px] text-p-secondary font-medium uppercase tracking-wide">Var. {design.variation_label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Previous feedback */}
      {sub.previousReviews.length > 0 && (
        <div className="bg-p-bg border border-p-border rounded-3xl p-6 lg:p-8">
          <p className="text-[11px] font-bold text-p-tertiary uppercase tracking-widest mb-5 flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Timeline History
          </p>
          <div className="space-y-6">
            {sub.previousReviews.map((pr, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-p-border text-p-tertiary text-[14px] flex items-center justify-center font-bold flex-shrink-0 mt-1">
                  {pr.reviewer?.name?.[0] ?? '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-bold text-p-text">{pr.reviewer?.name}</span>
                    <span className="w-1 h-1 rounded-full bg-p-border" />
                    <span className="text-[12px] font-medium text-p-tertiary">{pr.reviewer?.role}</span>
                  </div>
                  <div className={`text-[12px] font-bold flex items-center gap-1.5 mb-2 ${pr.action === 'approved' ? 'text-emerald-600' : 'text-p-error'}`}>
                    {pr.action === 'approved'
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved the asset</>
                      : <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Requested changes</>
                    }
                  </div>
                  {pr.comment && (
                    <div className="bg-white border border-p-border rounded-2xl p-4 text-[13px] text-p-secondary leading-relaxed shadow-sm">
                      "{pr.comment}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Action Area */}
      <div className="bg-p-bg border-2 border-p-border rounded-3xl p-6 lg:p-8">
         <div className="mb-6 flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-p-accent/10 flex items-center justify-center text-p-accent">
             <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
             </svg>
           </div>
           <div>
             <label className="block text-[15px] font-bold text-p-text tracking-tight">Your Decision</label>
             <p className="text-[12px] text-p-tertiary mt-0.5 font-medium">Add feedback (required for rejections)</p>
           </div>
         </div>
         
        <textarea
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          placeholder="What do you think? Be specific about any requested changes…"
          rows={3}
          className="w-full border-2 border-p-border rounded-2xl px-5 py-4 text-[14px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent focus:ring-4 focus:ring-p-accent-soft transition-all resize-none mb-6 leading-relaxed bg-white shadow-sm"
        />
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onApprove}
            disabled={submitting}
            className="flex-1 bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white font-bold py-4 rounded-xl text-[14px] transition-all duration-300 flex items-center justify-center gap-2 shadow-accent hover:-translate-y-1 active:translate-y-0"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            {submitting ? 'Processing…' : 'Approve & Pass on'}
          </button>
          <button
            onClick={onRequestChanges}
            disabled={submitting}
            className="flex-1 bg-white border-2 border-p-border hover:border-p-error hover:bg-red-50 disabled:opacity-50 text-p-text hover:text-p-error font-bold py-4 rounded-xl text-[14px] transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
            Request Changes
          </button>
        </div>
      </div>

    </div>
  )
}

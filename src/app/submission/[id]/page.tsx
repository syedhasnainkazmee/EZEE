'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AnnotationCanvas from '@/components/AnnotationCanvas'
import { useAuth } from '@/components/AuthProvider'

type Design = { id: string; filename: string; original_name: string; variation_label: string; order_index: number; version: number; liked?: boolean; model?: string | null; concept_notes?: string | null; copy?: string | null }
type Reviewer = { id: string; name: string; role: string; focus: string; step: number; token: string }
type Review = {
  id: string; submission_id: string; reviewer_id: string; action: string | null
  comment: string; created_at: string; version: number
  reviewer: { id: string; name: string; role: string; focus: string; step: number; token: string }
}
type Annotation = { id: string; design_id: string; x: number; y: number; comment: string; number: number; reviewer?: { name: string; role: string } | null }
type Submission = {
  id: string; title: string; description: string; status: string
  current_step: number | null; created_at: string; version: number
  drive_folder_url?: string | null; submitted_by?: string | null
  workflow_id?: string | null; task_id?: string | null; tags?: string | null
}

const STATUS: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  draft:             { label: 'Draft',            dot: 'bg-p-quaternary',             bg: 'bg-p-fill',     text: 'text-p-secondary' },
  in_review:         { label: 'In Review',         dot: 'bg-p-warning animate-pulse-soft', bg: 'bg-amber-50',   text: 'text-amber-600' },
  approved:          { label: 'Approved',          dot: 'bg-p-success',                bg: 'bg-emerald-50', text: 'text-emerald-700' },
  changes_requested: { label: 'Revisions Needed',  dot: 'bg-p-error',                  bg: 'bg-red-50',     text: 'text-red-600' },
}

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759']

export default function SubmissionDetail() {
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<{
    submission: Submission; designs: Design[]; reviews: Review[]; reviewers: Reviewer[]
  } | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [canvas, setCanvas] = useState<number | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [regenStep, setRegenStep] = useState<'idle' | 'prompting' | 'generating' | 'uploading' | 'done' | 'error'>('idle')
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const { user: authUser } = useAuth()

  function load() {
    setLoading(true)
    Promise.all([
      fetch(`/api/submissions/${id}`).then(r => r.json()),
      fetch(`/api/annotations?submissionId=${id}`).then(r => r.json()),
    ]).then(([subData, annData]) => {
      setData(subData)
      setAnnotations(annData.annotations ?? [])
      if (selectedVersion === null && subData.submission) {
        setSelectedVersion(subData.submission.version)
      }
      // Initialise liked set from DB state
      const liked = new Set<string>((subData.designs ?? []).filter((d: Design) => d.liked).map((d: Design) => d.id))
      setLikedIds(liked)
    }).finally(() => setLoading(false))
  }

  async function toggleLike(designId: string) {
    const res = await fetch(`/api/designs/${designId}/like`, { method: 'POST' })
    if (!res.ok) return
    const { liked } = await res.json()
    setLikedIds(prev => {
      const next = new Set(prev)
      liked ? next.add(designId) : next.delete(designId)
      return next
    })
  }

  useEffect(() => { load() }, [id])

  // Real-time status updates via SSE
  useEffect(() => {
    // Keep listening if approved but drive_folder_url not yet set
    if (data?.submission?.status === 'approved' && data?.submission?.drive_folder_url) return
    let es: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      es = new EventSource(`/api/events?submissionId=${id}`)
      es.addEventListener('submission', () => { load() })
      es.onerror = () => {
        es?.close(); es = null
        timer = setTimeout(connect, 3_000)
      }
    }

    connect()
    return () => { es?.close(); if (timer) clearTimeout(timer) }
  }, [id, data?.submission?.status, data?.submission?.drive_folder_url])

  async function sendForReview() {
    setSending(true)
    const res = await fetch(`/api/submissions/${id}/send`, { method: 'POST' })
    const json = await res.json()
    if (json.error) alert(json.error)
    else load()
    setSending(false)
  }

  async function addMoreFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingFiles(true)
    const form = new FormData()
    form.append('submissionId', id)
    Array.from(files).forEach(f => form.append('files', f))
    await fetch('/api/upload', { method: 'POST', body: form })
    load()
    setUploadingFiles(false)
  }

  async function submitReview(action: 'approved' | 'changes_requested', reviewerToken: string) {
    setSubmittingReview(true)
    const res = await fetch(`/api/review/${reviewerToken}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment: reviewComment }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else { setReviewComment(''); load() }
    setSubmittingReview(false)
  }

  async function handleResubmit(files: FileList | null) {
    if (!files || files.length === 0) return
    setResubmitting(true)
    const form = new FormData()
    Array.from(files).forEach(f => form.append('files', f))
    await fetch(`/api/submissions/${id}/resubmit`, { method: 'POST', body: form })
    setSelectedVersion((prev) => (prev ? prev + 1 : 2))
    load()
    setResubmitting(false)
  }

  async function regenerate() {
    if (!data) return
    const { submission: sub } = data
    if (!sub.workflow_id) return
    setRegenStep('prompting')
    const tags = sub.tags ? (() => { try { return JSON.parse(sub.tags!) } catch { return [] } })() : []
    const cleanTitle = sub.title.replace(/^\[AI\]\s*/i, '')
    const payload = { title: cleanTitle, description: sub.description, tags, task_id: sub.task_id, workflow_id: sub.workflow_id }
    try {
      const r1 = await fetch('/api/agent/designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, step: 'concepts' }),
      })
      const d1 = await r1.json()
      if (!r1.ok || d1.error) { setRegenStep('error'); return }
      setRegenStep('generating')
      const r2 = await fetch('/api/agent/designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, step: 'render', concepts: d1.concepts }),
      })
      setRegenStep('uploading')
      const d2 = await r2.json()
      if (!r2.ok || d2.error) { setRegenStep('error'); return }
      setRegenStep('done')
      window.location.href = `/submission/${d2.submissionId}`
    } catch {
      setRegenStep('error')
    }
  }

  if (loading) return (
    <div className="flex-1 bg-p-bg flex items-center justify-center">
      <div className="flex items-center gap-2.5 text-p-tertiary text-sm">
        <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading…
      </div>
    </div>
  )
  if (!data) return (
    <div className="flex-1 bg-p-bg flex items-center justify-center">
      <p className="text-p-secondary">Submission not found.</p>
    </div>
  )

  const { submission, designs: allDesigns, reviews: allReviews, reviewers } = data
  const st = STATUS[submission.status] ?? STATUS.draft
  const isAgentSubmission = submission.submitted_by === 'ai-designer-agent'
  const viewVersion = selectedVersion ?? submission.version

  const designs = allDesigns.filter(d => d.version === viewVersion)
  const reviews = allReviews.filter(r => r.version === viewVersion)

  const isCurrentVersion = viewVersion === submission.version
  const canSend = isCurrentVersion && (submission.status === 'draft') && designs.length > 0
  const canAdd = isCurrentVersion && submission.status === 'draft'
  const canResubmit = isCurrentVersion && submission.status === 'changes_requested'

  const canvasDesign = canvas !== null ? designs[canvas] : null
  const canvasPins = canvasDesign ? annotations.filter(a => a.design_id === canvasDesign.id) : []

  // Is the logged-in user the current pending reviewer for this version?
  const myReviewer = isCurrentVersion && submission.status === 'in_review'
    ? reviewers.find(r => r.id === authUser?.id && r.step === submission.current_step)
    : null

  return (
    <div className="flex-1 bg-p-bg">
      {/* Regeneration progress modal */}
      {regenStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-modal p-8 w-[360px] flex flex-col items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-violet-600">
                <path d="M12 2a1 1 0 01.894.553l2.184 4.424 4.882.71a1 1 0 01.554 1.706l-3.532 3.442.834 4.862a1 1 0 01-1.451 1.054L12 16.347l-4.365 2.404a1 1 0 01-1.451-1.054l.834-4.862L3.486 9.393a1 1 0 01.554-1.706l4.882-.71L11.106 2.553A1 1 0 0112 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-[15px] text-p-text mb-1">
                {regenStep === 'error' ? 'Generation Failed' : regenStep === 'done' ? 'Done!' : 'Generating New Concepts'}
              </p>
              <p className="text-[12px] text-p-tertiary">
                {regenStep === 'error' ? 'Something went wrong. Please try again.' : regenStep === 'done' ? 'Redirecting to your new designs…' : 'This takes about 60 seconds'}
              </p>
            </div>
            <div className="w-full space-y-2.5">
              {[
                { key: 'prompting',   label: 'Developing concepts with Kimi K2' },
                { key: 'generating',  label: 'Rendering images across models' },
                { key: 'uploading',   label: 'Saving designs' },
              ].map(({ key, label }) => {
                const steps = ['prompting', 'generating', 'uploading', 'done']
                const stepIdx = steps.indexOf(key)
                const curIdx  = steps.indexOf(regenStep === 'error' ? 'prompting' : regenStep)
                const done    = regenStep !== 'error' && curIdx > stepIdx
                const active  = regenStep !== 'error' && curIdx === stepIdx
                return (
                  <div key={key} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-medium transition-all ${
                    done   ? 'bg-emerald-50 text-emerald-700' :
                    active ? 'bg-violet-50 text-violet-700'   :
                             'bg-p-fill text-p-quaternary'
                  }`}>
                    <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                      {done ? (
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      ) : active ? (
                        <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-p-border" />
                      )}
                    </span>
                    {label}
                  </div>
                )
              })}
            </div>
            {regenStep === 'error' && (
              <button
                onClick={() => setRegenStep('idle')}
                className="text-[13px] font-bold text-p-secondary hover:text-p-text transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {canvas !== null && canvasDesign && (
        <AnnotationCanvas
          src={canvasDesign.filename}
          variationLabel={canvasDesign.variation_label}
          designId={canvasDesign.id}
          submissionId={id}
          reviewerToken=""
          existingPins={canvasPins}
          readOnly
          onClose={() => setCanvas(null)}
          onPrev={canvas > 0 ? () => setCanvas(canvas - 1) : undefined}
          onNext={canvas < designs.length - 1 ? () => setCanvas(canvas + 1) : undefined}
        />
      )}

      {/* Header */}
      <header className="bg-p-bg/90 border-b-2 border-p-border sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-p-quaternary hover:text-p-secondary flex-shrink-0 transition-colors p-2 -ml-2 rounded-2xl hover:bg-p-fill">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <span className="text-p-border flex-shrink-0 text-lg font-light">/</span>
            <span className="text-[14px] font-semibold text-p-text truncate">{submission.title}</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide flex-shrink-0 border ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {isAgentSubmission && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex-shrink-0 bg-violet-50 text-violet-700 border border-violet-200">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1 1 0 01.894.553l2.184 4.424 4.882.71a1 1 0 01.554 1.706l-3.532 3.442.834 4.862a1 1 0 01-1.451 1.054L12 16.347l-4.365 2.404a1 1 0 01-1.451-1.054l.834-4.862L3.486 9.393a1 1 0 01.554-1.706l4.882-.71L11.106 2.553A1 1 0 0112 2z"/></svg>
                AI Generated
              </span>
            )}
            {submission.version > 1 && (
              <select
                className="ml-2 bg-p-fill border-2 border-p-border text-p-text text-[12px] font-bold px-3 py-1.5 rounded-2xl focus:outline-none focus:border-p-accent/60 cursor-pointer"
                value={viewVersion}
                onChange={e => {
                  setSelectedVersion(Number(e.target.value))
                  setCanvas(null)
                }}
              >
                {Array.from({ length: submission.version }, (_, i) => i + 1).map(v => (
                  <option key={v} value={v}>Version {v} {v === submission.version ? '(Current)' : ''}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canSend && isAgentSubmission && (
              <button
                onClick={regenerate}
                disabled={regenStep !== 'idle'}
                className="inline-flex items-center gap-2 disabled:opacity-50 text-[13px] font-bold px-5 py-3 rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-0 border-2 border-p-border bg-white text-p-text hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Generate More
              </button>
            )}
            {canSend && (
              <button
                onClick={sendForReview}
                disabled={sending}
                className="inline-flex items-center gap-2 disabled:opacity-50 text-white text-[13px] font-bold px-5 py-3 rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 4px 14px -3px rgba(212,81,46,0.38)' }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
                {sending ? 'Sending…' : 'Send for Review'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="grid grid-cols-3 gap-8">

          {/* Designs */}
          <div className="col-span-2 space-y-4">
            {submission.description && (
              <div className="bg-white border-2 border-transparent rounded-2xl px-6 py-5 text-[13px] text-p-secondary leading-relaxed shadow-sm">
                <span className="font-bold text-p-text">Notes — </span>{submission.description}
              </div>
            )}

            {designs.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p className="text-[15px] text-p-secondary">No designs uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {designs.map((design, idx) => {
                  const pinCount = annotations.filter(a => a.design_id === design.id).length
                  return (
                    <div
                      key={design.id}
                      className="bg-white border-2 border-transparent hover:border-p-border/60 rounded-2xl overflow-hidden cursor-pointer hover:shadow-card transition-all duration-300 group shadow-sm"
                      onClick={() => setCanvas(idx)}
                    >
                      <div className="relative flex items-center justify-center bg-p-bg" style={{ height: '240px' }}>
                        <img
                          src={design.filename}
                          alt={`Variation ${design.variation_label}`}
                          style={{ maxWidth: '100%', maxHeight: '240px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white shadow-popup text-p-text text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            View
                          </span>
                        </div>
                        {pinCount > 0 && (
                          <div className="absolute top-3 right-3 bg-p-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                            <svg width="8" height="8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            </svg>
                            {pinCount}
                          </div>
                        )}
                      </div>
                      <div className="px-5 pt-3.5 pb-1 border-t-2 border-p-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-xl bg-p-accent/10 text-p-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {design.variation_label}
                        </span>
                        <span className="text-[12px] text-p-tertiary truncate flex-1">{design.original_name}</span>
                        {isAgentSubmission && design.model && (
                          <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                            design.model === 'flux'
                              ? 'bg-blue-50 text-blue-600'
                              : design.model === 'sd3-medium'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-orange-50 text-orange-600'
                          }`}>
                            {design.model === 'flux' ? 'Flux' : design.model === 'sd3-medium' ? 'SD3' : 'SD3.5'}
                          </span>
                        )}
                        {isAgentSubmission && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleLike(design.id) }}
                            title={likedIds.has(design.id) ? 'Remove from agent training' : 'Like — agent learns from this'}
                            className={`flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                              likedIds.has(design.id)
                                ? 'bg-pink-100 text-pink-500'
                                : 'bg-p-fill text-p-quaternary hover:bg-pink-50 hover:text-pink-400'
                            }`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={likedIds.has(design.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      {isAgentSubmission && (() => {
                        const adCopy = design.copy ? (() => { try { return JSON.parse(design.copy!) } catch { return null } })() : null
                        return (adCopy?.headline || design.concept_notes) ? (
                          <div className="px-5 pb-4 pt-1 space-y-1.5 border-t border-p-border/50 mt-1">
                            {adCopy?.headline && (
                              <p className="text-[12px] font-bold text-p-text leading-snug">{adCopy.headline}</p>
                            )}
                            {adCopy?.body && (
                              <p className="text-[11px] text-p-secondary leading-relaxed">{adCopy.body}</p>
                            )}
                            {design.concept_notes && (
                              <p className="text-[10px] text-p-quaternary leading-relaxed pt-0.5 line-clamp-2 italic">{design.concept_notes}</p>
                            )}
                          </div>
                        ) : null
                      })()}
                    </div>
                  )
                })}

                {canAdd && (
                  <label
                    className="border-2 border-dashed border-p-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-p-accent/50 hover:bg-p-accent-soft/50 transition-all duration-150"
                    style={{ minHeight: '286px' }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-p-fill flex items-center justify-center mb-3">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                    <div className="text-[13px] font-bold text-p-tertiary">{uploadingFiles ? 'Uploading…' : 'Add variation'}</div>
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={e => addMoreFiles(e.target.files)} disabled={uploadingFiles} />
                  </label>
                )}

                {canResubmit && (
                  <label
                    className="border-2 border-dashed border-p-accent/40 bg-p-accent/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-p-accent hover:bg-p-accent/10 transition-all duration-150 relative overflow-hidden"
                    style={{ minHeight: '286px' }}
                  >
                    <div className="absolute top-0 right-0 max-w-[120px] text-center pt-8 pr-8 opacity-10">
                      <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 z-10 text-p-accent">
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-[14px] font-bold text-p-nav z-10 mb-1">{resubmitting ? 'Uploading V' + (submission.version + 1) + '…' : 'Upload Version ' + (submission.version + 1)}</div>
                    <div className="text-[13px] text-p-secondary z-10">Select files to restart review</div>
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={e => handleResubmit(e.target.files)} disabled={resubmitting} />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Sidebar — Review Chain */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-bold text-p-tertiary uppercase tracking-widest mb-6 flex items-center gap-3">
              Review Chain
              <span className="flex-1 h-px bg-p-border" />
            </h2>

            {/* Reviewer action panel — shown when the logged-in user is the current pending reviewer */}
            {myReviewer && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 shadow-sm mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">Your Review</p>
                </div>
                <p className="text-[13px] text-amber-700 mb-4 leading-relaxed">{myReviewer.focus}</p>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Leave a comment (optional)…"
                  rows={3}
                  className="w-full text-[13px] bg-white border-2 border-amber-200 rounded-2xl px-4 py-3 text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-amber-400 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => submitReview('approved', myReviewer.token)}
                    disabled={submittingReview}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[13px] font-bold py-3.5 rounded-2xl transition-colors"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => submitReview('changes_requested', myReviewer.token)}
                    disabled={submittingReview}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[13px] font-bold py-3.5 rounded-2xl transition-colors"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Request Changes
                  </button>
                </div>
              </div>
            )}

            {reviewers.map((reviewer, i) => {
              const review = reviews.find(r => r.reviewer_id === reviewer.id)
              const isActive = isCurrentVersion && submission.current_step === reviewer.step
              const done = review?.action != null
              const pending = !done && (!isCurrentVersion || !isActive)
              const approved = done && review?.action === 'approved'
              const changes = done && review?.action === 'changes_requested'

              return (
                <div
                  key={reviewer.id}
                  className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all duration-200
                    ${isActive  ? 'border-amber-300' : ''}
                    ${approved  ? 'border-emerald-200' : ''}
                    ${changes   ? 'border-red-200' : ''}
                    ${pending   ? 'border-transparent opacity-40' : ''}
                    ${!isActive && !approved && !changes && !pending ? 'border-transparent' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 text-white`}
                      style={{ background: approved ? '#34C759' : changes ? '#FF3B30' : isActive ? '#FF9F0A' : AVATAR_COLORS[i % 3] }}
                    >
                      {approved
                        ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        : reviewer.name[0]
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-bold text-[13px] text-p-text">{reviewer.name}</span>
                        {isActive  && <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold border border-amber-200">Waiting</span>}
                        {approved  && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-200">Approved</span>}
                        {changes   && <span className="text-[10px] bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-bold border border-red-200">Changes</span>}
                      </div>
                      <div className="text-[11px] text-p-tertiary">{reviewer.role}</div>

                      <div className="text-[11px] text-p-secondary mt-2.5 bg-p-bg border border-p-border rounded-2xl px-3 py-2.5 leading-relaxed">
                        {reviewer.focus}
                      </div>

                      {review?.comment && (
                        <div className={`mt-2 text-[11px] rounded-2xl px-3 py-2.5 leading-relaxed border-l-2
                          ${approved ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-red-50 text-red-800 border-red-400'}
                        `}>
                          "{review.comment}"
                        </div>
                      )}

                      {(() => {
                        const count = annotations.filter(a => a.reviewer?.name === reviewer.name).length
                        return count > 0 ? (
                          <div className="mt-2 text-[11px] text-p-accent font-bold flex items-center gap-1">
                            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            </svg>
                            {count} pin{count !== 1 ? 's' : ''}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Status banners (only show if viewing current version) */}
            {isCurrentVersion && submission.status === 'approved' && (
              <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-sm">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div className="font-bold text-[16px]">Approved</div>
                </div>
                <div className="text-emerald-100 text-[13px]">All reviewers have signed off on this submission.</div>
                {submission.drive_folder_url && (
                  <a
                    href={submission.drive_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2.5 bg-white/15 hover:bg-white/25 transition-colors rounded-2xl px-4 py-3 w-fit"
                  >
                    <svg viewBox="0 0 87.3 78" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#fff"/>
                      <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#fff"/>
                      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#fff"/>
                    </svg>
                    <span className="text-[13px] font-semibold">View deliverables in Google Drive</span>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} className="opacity-70">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
            {isCurrentVersion && submission.status === 'changes_requested' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5">
                <div className="font-bold text-red-700 text-[15px] mb-1.5">Revisions Needed</div>
                <div className="text-red-500 text-[13px] leading-relaxed">Upload revised designs using the panel on the left, then click <span className="font-bold">Send for Review</span> to resubmit to the reviewer.</div>
              </div>
            )}
            {isCurrentVersion && submission.status === 'draft' && (
              <div className="bg-white border-2 border-p-border rounded-2xl p-5 text-[13px] text-p-secondary leading-relaxed shadow-sm">
                Upload designs and click{' '}
                <span className="font-bold text-p-accent">Send for Review</span>{' '}
                to start the chain.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

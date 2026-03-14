'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AnnotationCanvas from '@/components/AnnotationCanvas'

type Design = { id: string; filename: string; original_name: string; variation_label: string; order_index: number; version: number }
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
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

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
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

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
  if (!data) return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center">
      <p className="text-p-secondary">Submission not found.</p>
    </div>
  )

  const { submission, designs: allDesigns, reviews: allReviews, reviewers } = data
  const st = STATUS[submission.status] ?? STATUS.draft
  const viewVersion = selectedVersion ?? submission.version

  const designs = allDesigns.filter(d => d.version === viewVersion)
  const reviews = allReviews.filter(r => r.version === viewVersion)

  const isCurrentVersion = viewVersion === submission.version
  const canSend = isCurrentVersion && (submission.status === 'draft') && designs.length > 0
  const canAdd = isCurrentVersion && submission.status === 'draft'
  const canResubmit = isCurrentVersion && submission.status === 'changes_requested'

  const canvasDesign = canvas !== null ? designs[canvas] : null
  const canvasPins = canvasDesign ? annotations.filter(a => a.design_id === canvasDesign.id) : []

  return (
    <div className="min-h-screen bg-p-bg">
      {canvas !== null && canvasDesign && (
        <AnnotationCanvas
          src={`/uploads/${canvasDesign.filename}`}
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
      <header className="bg-p-surface border-b border-p-border sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-p-quaternary hover:text-p-secondary flex-shrink-0 transition-colors p-1 -ml-1 rounded-lg hover:bg-p-fill">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <span className="text-p-border flex-shrink-0 text-lg font-light">/</span>
            <span className="text-[14px] font-semibold text-p-text truncate">{submission.title}</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {submission.version > 1 && (
              <select
                className="ml-2 bg-p-fill border border-p-border text-p-text text-[12px] font-semibold px-2 py-1 rounded-lg focus:outline-none focus:border-p-accent cursor-pointer"
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

          {canSend && (
            <button
              onClick={sendForReview}
              disabled={sending}
              className="flex items-center gap-2 bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex-shrink-0"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
              {sending ? 'Sending…' : 'Send for Review'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">

          {/* Designs */}
          <div className="col-span-2 space-y-4">
            {submission.description && (
              <div className="bg-p-surface border border-p-border rounded-2xl px-5 py-4 text-[13px] text-p-secondary leading-relaxed shadow-card">
                <span className="font-semibold text-p-text">Notes — </span>{submission.description}
              </div>
            )}

            {designs.length === 0 ? (
              <div className="bg-p-surface border-2 border-dashed border-p-border rounded-3xl p-20 text-center shadow-card">
                <div className="w-12 h-12 rounded-2xl bg-p-fill flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p className="text-[13px] text-p-tertiary">No designs uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {designs.map((design, idx) => {
                  const pinCount = annotations.filter(a => a.design_id === design.id).length
                  return (
                    <div
                      key={design.id}
                      className="bg-p-surface border border-p-border rounded-2xl overflow-hidden cursor-pointer hover:border-p-accent/40 hover:shadow-card-h transition-all duration-200 group shadow-card"
                      onClick={() => setCanvas(idx)}
                    >
                      <div className="relative flex items-center justify-center bg-p-bg" style={{ height: '240px' }}>
                        <img
                          src={`/uploads/${design.filename}`}
                          alt={`Variation ${design.variation_label}`}
                          style={{ maxWidth: '100%', maxHeight: '240px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white shadow-popup text-p-text text-[12px] font-semibold px-4 py-2 rounded-full flex items-center gap-1.5">
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            View
                          </span>
                        </div>
                        {pinCount > 0 && (
                          <div className="absolute top-3 right-3 bg-p-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                            <svg width="8" height="8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            </svg>
                            {pinCount}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3 border-t border-p-border flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-p-accent/10 text-p-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {design.variation_label}
                        </span>
                        <span className="text-[12px] text-p-tertiary truncate">{design.original_name}</span>
                      </div>
                    </div>
                  )
                })}

                {canAdd && (
                  <label
                    className="border-2 border-dashed border-p-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-p-accent/50 hover:bg-p-accent-soft/50 transition-all duration-150"
                    style={{ minHeight: '286px' }}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-p-fill flex items-center justify-center mb-2">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                    <div className="text-[13px] font-medium text-p-tertiary">{uploadingFiles ? 'Uploading…' : 'Add variation'}</div>
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
                    <div className="text-[14px] font-semibold text-p-nav z-10 mb-1">{resubmitting ? 'Uploading V' + (submission.version + 1) + '…' : 'Upload Version ' + (submission.version + 1)}</div>
                    <div className="text-[12px] text-p-secondary z-10">Select files to restart review</div>
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={e => handleResubmit(e.target.files)} disabled={resubmitting} />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Sidebar — Review Chain */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold text-p-tertiary uppercase tracking-widest">Review Chain</h2>

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
                  className={`bg-p-surface rounded-2xl border p-4 shadow-card transition-all duration-200
                    ${isActive  ? 'border-amber-300 shadow-amber-100 shadow-md' : ''}
                    ${approved  ? 'border-emerald-200' : ''}
                    ${changes   ? 'border-red-200' : ''}
                    ${pending   ? 'border-p-border opacity-40' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 text-white`}
                      style={{ background: approved ? '#34C759' : changes ? '#FF3B30' : isActive ? '#FF9F0A' : AVATAR_COLORS[i % 3] }}
                    >
                      {approved
                        ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        : reviewer.name[0]
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-[13px] text-p-text">{reviewer.name}</span>
                        {isActive  && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Waiting</span>}
                        {approved  && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Approved</span>}
                        {changes   && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Changes</span>}
                      </div>
                      <div className="text-[11px] text-p-tertiary">{reviewer.role}</div>

                      <div className="text-[11px] text-p-secondary mt-2 bg-p-fill rounded-xl px-3 py-2 leading-relaxed">
                        {reviewer.focus}
                      </div>

                      {review?.comment && (
                        <div className={`mt-2 text-[11px] rounded-xl px-3 py-2.5 leading-relaxed border-l-2
                          ${approved ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-red-50 text-red-800 border-red-400'}
                        `}>
                          "{review.comment}"
                        </div>
                      )}

                      {(() => {
                        const count = annotations.filter(a => a.reviewer?.name === reviewer.name).length
                        return count > 0 ? (
                          <div className="mt-2 text-[11px] text-p-accent font-medium flex items-center gap-1">
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
              <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-card">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div className="font-bold text-[15px]">Approved</div>
                </div>
                <div className="text-emerald-100 text-[12px]">All reviewers have signed off on this submission.</div>
              </div>
            )}
            {isCurrentVersion && submission.status === 'changes_requested' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-card">
                <div className="font-bold text-red-700 text-[14px] mb-1">Revisions Needed</div>
                <div className="text-red-500 text-[12px] leading-relaxed">Update the designs and re-send for review.</div>
              </div>
            )}
            {isCurrentVersion && submission.status === 'draft' && (
              <div className="bg-p-fill rounded-2xl border border-p-border p-4 text-[12px] text-p-secondary leading-relaxed">
                Upload designs and click{' '}
                <span className="font-semibold text-p-accent">Send for Review</span>{' '}
                to start the chain.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

type Submission = {
  id: string
  title: string
  description: string
  status: 'draft' | 'in_review' | 'approved' | 'changes_requested'
  workflow_name: string
  design_count: number
  version: number
  created_at: string
  submitted_by: string | null
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

function SubmissionRow({
  sub, canEdit, onEdit, onDelete,
}: {
  sub: Submission
  canEdit: boolean
  onEdit: (sub: Submission) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const isChanges  = sub.status === 'changes_requested'
  const isApproved = sub.status === 'approved'
  const isDraft    = sub.status === 'draft'
  const isInReview = sub.status === 'in_review'
  const isEditable = isDraft || isChanges

  const dotClass = isChanges  ? 'bg-red-400'
    : isInReview ? 'bg-amber-400 animate-pulse-soft'
    : isApproved ? 'bg-emerald-400'
    : 'bg-stone-300'

  const dotRing = isChanges  ? 'ring-red-400/20'
    : isInReview ? 'ring-amber-400/20'
    : isApproved ? 'ring-emerald-400/20'
    : 'ring-transparent'

  return (
    <div className="relative group mb-3 animate-fade-in">
      <Link
        href={`/submission/${sub.id}`}
        className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border-2 border-transparent hover:border-p-border/60 shadow-sm hover:shadow-card transition-all duration-300"
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ${dotClass} ${dotRing}`} />

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

        {sub.version > 1 && (
          <span className="flex-shrink-0 text-[11px] font-bold text-p-tertiary bg-p-fill border-2 border-p-border px-2.5 py-1 rounded-full hidden sm:block">
            v{sub.version}
          </span>
        )}

        {isInReview && sub.current_reviewer && (
          <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
              <span className="text-[10px] font-bold text-amber-700">{sub.current_reviewer.name[0]}</span>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 hidden md:block">
          <span className="text-[12px] text-p-tertiary tabular-nums">{fmtDate(sub.created_at)}</span>
        </div>

        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          className="text-p-quaternary group-hover:text-p-accent transition-colors flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </Link>

      {/* ⋯ menu — only for editable submissions */}
      {canEdit && isEditable && (
        <div className="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v) }}
              className="w-8 h-8 rounded-xl bg-white border-2 border-p-border flex items-center justify-center text-p-tertiary hover:text-p-text hover:border-p-text/30 transition-all shadow-sm"
            >
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 bg-white border-2 border-p-border rounded-2xl shadow-popup overflow-hidden min-w-[140px] animate-fade-in">
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onEdit(sub) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-semibold text-p-text hover:bg-p-fill transition-colors text-left"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Edit
                  </button>
                  <div className="h-px bg-p-border mx-3" />
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(sub.id) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MySubmissionsPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)
  const [editingSub, setEditingSub]   = useState<Submission | null>(null)
  const [editTitle, setEditTitle]     = useState('')
  const [editDesc, setEditDesc]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    fetch('/api/my/submissions')
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions ?? []))
      .finally(() => setLoading(false))
  }, [])

  function openEdit(sub: Submission) {
    setEditingSub(sub)
    setEditTitle(sub.title)
    setEditDesc(sub.description)
  }

  async function saveEdit() {
    if (!editingSub || !editTitle.trim()) return
    setSaving(true)
    const res = await fetch(`/api/submissions/${editingSub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim(), description: editDesc }),
    })
    if (res.ok) {
      setSubmissions(prev => prev.map(s =>
        s.id === editingSub.id ? { ...s, title: editTitle.trim(), description: editDesc } : s
      ))
      setEditingSub(null)
    }
    setSaving(false)
  }

  async function confirmDelete(id: string) {
    setDeleting(true)
    const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSubmissions(prev => prev.filter(s => s.id !== id))
    }
    setDeleting(false)
    setDeleteConfirm(null)
  }

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
                {needsAction.map(s => (
                  <SubmissionRow
                    key={s.id} sub={s} canEdit={true}
                    onEdit={openEdit} onDelete={setDeleteConfirm}
                  />
                ))}
              </div>
            )}

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
                {active.map(s => (
                  <SubmissionRow key={s.id} sub={s} canEdit={false} onEdit={openEdit} onDelete={setDeleteConfirm} />
                ))}
              </div>
            )}

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
                {done.map(s => (
                  <SubmissionRow key={s.id} sub={s} canEdit={false} onEdit={openEdit} onDelete={setDeleteConfirm} />
                ))}
              </div>
            )}

          </div>
        )}
      </main>

      {/* ── Edit Modal ── */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-modal w-full max-w-lg overflow-hidden">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #D4512E, #FF7A58)' }} />
            <div className="p-8">
              <h2 className="font-display text-2xl font-bold text-p-text mb-6">Edit submission</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Title</label>
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full border-2 border-p-border rounded-2xl px-5 py-3.5 text-[15px] font-semibold text-p-text focus:outline-none focus:border-p-accent/60 transition-all bg-p-bg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text focus:outline-none focus:border-p-accent/60 transition-all resize-none bg-p-bg"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-7">
                <button
                  onClick={() => setEditingSub(null)}
                  className="px-6 py-3 rounded-2xl text-[14px] font-bold text-p-secondary hover:text-p-text hover:bg-p-fill border-2 border-transparent hover:border-p-border transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving || !editTitle.trim()}
                  className="px-8 py-3 rounded-2xl text-[14px] font-bold text-white disabled:opacity-50 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 4px 14px -3px rgba(212,81,46,0.38)' }}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-modal w-full max-w-sm overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" fill="none" stroke="#DC2626" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-p-text mb-2">Delete submission?</h2>
              <p className="text-[13px] text-p-secondary leading-relaxed mb-7">
                This will permanently delete the submission and all its designs. This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-p-secondary hover:text-p-text bg-p-fill hover:bg-p-border transition-all border-2 border-p-border"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDelete(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

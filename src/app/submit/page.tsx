'use client'
import { upload } from '@vercel/blob/client'
import { useState, useRef, DragEvent, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AgentGenerationScreen from '@/components/AgentGenerationScreen'

type UploadStatus = 'uploading' | 'done' | 'error'
type FilePreview = {
  id: string
  file: File
  preview: string
  label: string
  status: UploadStatus
  blobUrl?: string
}

type WorkflowOption = { id: string; name: string; description: string }
type TaskOption    = { id: string; title: string; project_name: string }

const LABELS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','P']
const MAX_CONCURRENT = 3

const TAG_OPTIONS = [
  'Instagram Story', 'Instagram Post', 'Facebook Ad', 'Facebook Post',
  'LinkedIn Post', 'Twitter/X Post', 'Email Header', 'Banner',
  'Logo', 'Branding', 'Print', 'Presentation', 'Web Design', 'Other',
]

export default function SubmitPage() {
  const router = useRouter()
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [workflowId, setWorkflowId]   = useState('')
  const [taskId, setTaskId]           = useState<string | null>(null)
  const [tags, setTags]               = useState<string[]>([])
  const [workflows, setWorkflows]     = useState<WorkflowOption[]>([])
  const [tasks, setTasks]             = useState<TaskOption[]>([])
  const [loadingWf, setLoadingWf]     = useState(true)
  const [files, setFiles]             = useState<FilePreview[]>([])
  const [dragging, setDragging]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitLabel, setSubmitLabel] = useState('')
  const [error, setError]             = useState('')

  // ── Designer Agent state ──────────────────────────────────────────────────
  type AgentStep = 'idle' | 'prompting' | 'generating' | 'uploading' | 'done' | 'error'
  const [agentStep, setAgentStep]       = useState<AgentStep>('idle')
  const [agentSubId, setAgentSubId]     = useState<string | null>(null)
  const [agentError, setAgentError]     = useState('')
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [showAgentScreen, setShowAgentScreen] = useState(false)
  const [agentPayload, setAgentPayload] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeUploads = useRef(0)

  useEffect(() => {
    fetch('/api/admin/workflows')
      .then(r => r.json())
      .then(d => {
        const active = (d.workflows ?? []).filter((w: any) => w.is_active)
        setWorkflows(active)
        if (active.length === 1) setWorkflowId(active[0].id)
      })
      .finally(() => setLoadingWf(false))

    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => {
        const openTasks = (d.tasks ?? []).filter((t: any) => t.status !== 'completed' && t.status !== 'in_review')
        setTasks(openTasks)
      })
  }, [])

  const startUpload = useCallback(async (fp: FilePreview) => {
    while (activeUploads.current >= MAX_CONCURRENT) {
      await new Promise(r => setTimeout(r, 150))
    }
    activeUploads.current++
    try {
      const ext  = fp.file.name.split('.').pop() || 'png'
      const blob = await upload(`designs/${crypto.randomUUID()}.${ext}`, fp.file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      setFiles(prev => prev.map(f => f.id === fp.id ? { ...f, status: 'done', blobUrl: blob.url } : f))
    } catch {
      setFiles(prev => prev.map(f => f.id === fp.id ? { ...f, status: 'error' } : f))
    } finally {
      activeUploads.current--
    }
  }, [])

  function addFiles(incoming: File[]) {
    const valid = incoming.filter(f => f.type.startsWith('image/'))
    setFiles(prev => {
      const next = [
        ...prev,
        ...valid.map((file, i) => ({
          id:      crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          label:   LABELS[(prev.length + i) % LABELS.length],
          status:  'uploading' as UploadStatus,
        })),
      ]
      return next.map((f, i) => ({ ...f, label: LABELS[i] }))
    })
    valid.forEach((file, i) => {
      setTimeout(() => {
        setFiles(prev => {
          const target = prev.find(f => f.file === file && f.status === 'uploading' && !f.blobUrl)
          if (target) startUpload(target)
          return prev
        })
      }, 50 * i)
    })
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(files[index].preview)
    setFiles(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, label: LABELS[i] })))
  }

  function retryFile(fp: FilePreview) {
    setFiles(prev => prev.map(f => f.id === fp.id ? { ...f, status: 'uploading', blobUrl: undefined } : f))
    startUpload({ ...fp, status: 'uploading', blobUrl: undefined })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function handleActivateAgent() {
    if (!title.trim()) { setError('Please give this submission a title first.'); return }
    if (!workflowId)   { setError('Please select an approval workflow first.'); return }

    setError('')
    setAgentPayload({
      title:       title.trim(),
      description: description.trim(),
      tags,
      task_id:     taskId,
      workflow_id: workflowId,
    })
    setShowAgentScreen(true)
  }

  async function handleSubmit() {
    if (!title.trim())      { setError('Please give this submission a title.'); return }
    if (!workflowId)        { setError('Please select an approval workflow.'); return }
    if (files.length === 0) { setError('Please attach at least one file.'); return }

    const failed = files.filter(f => f.status === 'error')
    if (failed.length > 0) {
      setError(`${failed.length} file(s) failed to upload. Click retry on each.`)
      return
    }

    setError(''); setSubmitting(true)
    try {
      const pending = files.filter(f => f.status === 'uploading')
      if (pending.length > 0) {
        setSubmitLabel(`Waiting for ${pending.length} upload${pending.length > 1 ? 's' : ''}…`)
        await new Promise<void>(resolve => {
          const check = setInterval(() => {
            setFiles(current => {
              const stillPending = current.some(f => f.status === 'uploading')
              if (!stillPending) { clearInterval(check); resolve() }
              return current
            })
          }, 300)
        })
      }

      let currentFiles: FilePreview[] = await new Promise<FilePreview[]>(resolve => {
        setFiles(f => { resolve(f); return f })
      })

      const stillFailed = currentFiles.filter(f => f.status === 'error')
      if (stillFailed.length > 0) {
        setError(`${stillFailed.length} file(s) failed. Please retry them.`)
        setSubmitting(false); return
      }

      setSubmitLabel('Creating submission…')
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), workflow_id: workflowId, task_id: taskId, tags }),
      })
      const { submission, error: e } = await res.json()
      if (e) throw new Error(e)

      setSubmitLabel('Saving designs…')
      const saveRes = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          designs: currentFiles.map((f, i) => ({
            blobUrl:        f.blobUrl!,
            originalName:   f.file.name,
            variationLabel: LABELS[i],
            orderIndex:     i,
            version:        submission.version,
          })),
        }),
      })
      const saveData = await saveRes.json()
      if (saveData.error) throw new Error(saveData.error)

      router.push(`/submission/${submission.id}`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
      setSubmitting(false); setSubmitLabel('')
    }
  }

  const selectedWorkflow = workflows.find(w => w.id === workflowId)
  const uploadingCount   = files.filter(f => f.status === 'uploading').length
  const doneCount        = files.filter(f => f.status === 'done').length
  const errorCount       = files.filter(f => f.status === 'error').length

  return (
    // Full viewport — no page scroll
    <div className="flex h-screen overflow-hidden bg-p-bg">

      {showAgentScreen && agentPayload && (
        <AgentGenerationScreen
          payload={agentPayload}
          onDone={(id) => { router.push('/submission/' + id) }}
          onCancel={() => setShowAgentScreen(false)}
        />
      )}

      {/* ── Left pane: Form ── */}
      <div className="w-[380px] flex-shrink-0 flex flex-col h-full bg-white border-r border-p-border">

        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex-shrink-0">
          <h1 className="font-display text-[22px] font-bold text-p-text tracking-tight">New Request</h1>
          <p className="text-[13px] text-p-tertiary mt-0.5">Fill in the details, then drop your files on the right.</p>
        </div>

        {/* Scrollable form body — only scrolls if viewport is very small */}
        <div className="flex-1 overflow-y-auto px-7 pb-4 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-[10.5px] font-bold text-p-tertiary mb-1.5 uppercase tracking-wide">
              Title <span className="text-p-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q4 Campaign Assets"
              className="w-full border-b-2 border-p-border bg-transparent px-0 py-2 text-[15px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent transition-colors font-medium"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10.5px] font-bold text-p-tertiary mb-1.5 uppercase tracking-wide">
              Notes <span className="text-p-quaternary normal-case tracking-normal font-normal text-[10px]">optional</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Context for reviewers…"
              rows={2}
              className="w-full border-2 border-p-border rounded-xl px-4 py-3 text-[13px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent bg-p-surface transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Task + Workflow row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold text-p-tertiary mb-1.5 uppercase tracking-wide">
                Linked Task <span className="text-p-quaternary normal-case tracking-normal font-normal text-[10px]">opt.</span>
              </label>
              <select
                value={taskId || ''}
                onChange={e => setTaskId(e.target.value || null)}
                className="w-full border-2 border-p-border rounded-xl px-3 py-2.5 text-[13px] font-medium text-p-text focus:outline-none focus:border-p-accent bg-p-surface transition-all appearance-none cursor-pointer"
              >
                <option value="">No task</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-p-tertiary mb-1.5 uppercase tracking-wide">
                Workflow <span className="text-p-error">*</span>
              </label>
              {loadingWf ? (
                <div className="border-2 border-p-border rounded-xl px-3 py-2.5 bg-p-fill animate-pulse h-[42px]" />
              ) : workflows.length === 0 ? (
                <div className="border-2 border-amber-200 rounded-xl px-3 py-2.5 bg-amber-50 text-[11px] text-amber-700">
                  None. <Link href="/admin" className="underline">Create one</Link>.
                </div>
              ) : workflows.length === 1 ? (
                <div className="border-2 border-p-border rounded-xl px-3 py-2.5 bg-p-surface text-[13px] text-p-text font-medium truncate">
                  {workflows[0].name}
                </div>
              ) : (
                <select
                  value={workflowId}
                  onChange={e => setWorkflowId(e.target.value)}
                  className="w-full border-2 border-p-border rounded-xl px-3 py-2.5 text-[13px] font-medium text-p-text focus:outline-none focus:border-p-accent bg-p-surface transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select…</option>
                  {workflows.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Workflow description hint */}
          {selectedWorkflow?.description && (
            <p className="text-[12px] text-p-tertiary leading-relaxed -mt-1 flex items-start gap-1.5">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mt-px text-p-quaternary flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {selectedWorkflow.description}
            </p>
          )}

          {/* Content Type tags */}
          <div>
            <label className="block text-[10.5px] font-bold text-p-tertiary mb-2 uppercase tracking-wide">
              Content Type <span className="text-p-quaternary normal-case tracking-normal font-normal text-[10px]">optional</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map(tag => {
                const active = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150"
                    style={{
                      borderColor: active ? '#D4512E' : 'rgba(0,0,0,0.10)',
                      background:  active ? 'rgba(212,81,46,0.08)' : 'transparent',
                      color:       active ? '#D4512E' : '#9E9892',
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer: status + submit */}
        <div className="flex-shrink-0 px-7 py-5 border-t border-p-border space-y-3">

          {/* Upload status pills */}
          {files.length > 0 && (
            <div className="flex items-center gap-3 text-[11.5px]">
              {uploadingCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <svg className="animate-spin" width="11" height="11" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {uploadingCount} uploading
                </span>
              )}
              {doneCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  {doneCount} ready
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  {errorCount} failed
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 px-3.5 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 border border-red-100 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* AI Designer Agent button */}
          <button
            onClick={handleActivateAgent}
            disabled={submitting || loadingWf || workflows.length === 0}
            className="w-full border-2 border-dashed border-p-border hover:border-p-accent/50 disabled:opacity-40 text-p-tertiary hover:text-p-accent font-semibold py-3 rounded-xl transition-all duration-200 text-[13px] flex items-center justify-center gap-2 group"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="group-hover:rotate-12 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            Activate Designer Agent
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || loadingWf || workflows.length === 0 || errorCount > 0}
            className="w-full bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 text-[14px] shadow-accent hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {submitLabel || 'Processing…'}
              </>
            ) : uploadingCount > 0 ? (
              `Submit (${uploadingCount} still uploading…)`
            ) : (
              <>
                Create Submission
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>


      {/* ── Right pane: Dropzone / Gallery ── */}
      <div className="flex-1 h-full overflow-hidden relative bg-[#FDFDFC]">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))}
        />

        {/* Empty state */}
        {files.length === 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`absolute inset-6 flex flex-col items-center justify-center rounded-[2rem] transition-all duration-300 cursor-pointer
              ${dragging
                ? 'bg-p-accent-soft/30 border-4 border-p-accent border-dashed scale-[0.99]'
                : 'bg-p-surface border-2 border-p-border border-dashed hover:border-p-accent/40 hover:bg-p-surface-h'}
            `}
          >
            <div className={`w-16 h-16 rounded-2xl mb-5 flex items-center justify-center transition-all duration-300 shadow-sm ${dragging ? 'bg-p-accent text-white scale-110' : 'bg-white text-p-tertiary border border-p-border'}`}>
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            </div>
            <p className={`font-display text-[22px] font-semibold mb-1.5 ${dragging ? 'text-p-accent' : 'text-p-text'}`}>
              {dragging ? 'Drop to upload' : 'Drop files here'}
            </p>
            <p className="text-[14px] text-p-tertiary">
              or <span className="text-p-accent font-semibold hover:underline">browse your files</span>
            </p>
            <div className="mt-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-p-border text-[11.5px] font-medium text-p-quaternary shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-p-tertiary" />
              PNG, JPG, WEBP — full quality preserved
            </div>
          </div>
        )}

        {/* Gallery — scrolls internally */}
        {files.length > 0 && (
          <div className="absolute inset-0 overflow-y-auto">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-p-border px-8 py-4 flex items-center justify-between"
            >
              <div>
                <h2 className="font-display text-[17px] font-bold text-p-text">
                  Attachments
                  <span className="ml-2 text-[13px] font-normal text-p-tertiary">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                </h2>
              </div>
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-p-text bg-white border-2 border-p-border px-4 py-2 rounded-xl hover:border-p-text hover:shadow-sm transition-all"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Add More
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[220px]">
              {files.map((f, i) => (
                <div key={f.id} className={`bg-white border rounded-2xl overflow-hidden group border-b-4 transition-all duration-200 shadow-sm hover:shadow-card flex flex-col relative w-full h-full
                  ${f.status === 'done'  ? 'border-emerald-200 border-b-emerald-400' :
                    f.status === 'error' ? 'border-red-200 border-b-red-400' :
                    'border-p-border border-b-p-border hover:border-b-p-accent'}
                `}>
                  <div className="flex-1 bg-gradient-to-b from-p-bg to-white flex items-center justify-center p-3 relative overflow-hidden">
                    <img
                      src={f.preview}
                      alt={`Asset ${f.label}`}
                      className={`max-w-full max-h-[140px] w-auto h-auto object-contain transition-all duration-200 group-hover:scale-[1.03] ${f.status === 'uploading' ? 'opacity-50' : ''}`}
                    />

                    {f.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin text-p-accent" width="22" height="22" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span className="text-[10px] font-semibold text-p-accent">Uploading…</span>
                        </div>
                      </div>
                    )}
                    {f.status === 'done' && (
                      <div className="absolute top-2.5 left-2.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg width="9" height="9" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                    {f.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                            <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </div>
                          <button
                            onClick={() => retryFile(f)}
                            className="text-[10px] font-bold text-red-600 bg-white border border-red-200 px-3 py-1 rounded-full hover:bg-red-50 transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}

                    {f.status !== 'uploading' && (
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/40 hover:bg-p-error rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                      >
                        <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-p-border flex items-center justify-between gap-2 bg-white">
                    <span className="text-[12px] font-medium text-p-text truncate flex-1">{f.file.name}</span>
                    <span className={`w-5 h-5 rounded-lg text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm
                      ${f.status === 'done' ? 'bg-emerald-500' : f.status === 'error' ? 'bg-red-500' : 'bg-p-accent'}`}>
                      {f.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

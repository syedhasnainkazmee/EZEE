'use client'
import { useState, useRef, DragEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'

type FilePreview = { file: File; preview: string; label: string }
type WorkflowOption = { id: string; name: string; description: string }
type TaskOption = { id: string; title: string; project_name: string }

export default function SubmitPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [loadingWf, setLoadingWf] = useState(true)
  const [files, setFiles] = useState<FilePreview[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const LABELS = ['A','B','C','D','E','F','G','H']

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

  function addFiles(incoming: File[]) {
    const valid = incoming.filter(f => f.type.startsWith('image/'))
    setFiles(prev => [
      ...prev,
      ...valid.map((file, i) => ({
        file,
        preview: URL.createObjectURL(file),
        label: LABELS[(prev.length + i) % LABELS.length],
      })),
    ])
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(files[index].preview)
    setFiles(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, label: LABELS[i] })))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Please give this submission a title.'); return }
    if (!workflowId) { setError('Please select an approval workflow.'); return }
    if (files.length === 0) { setError('Please attach at least one file.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), workflow_id: workflowId, task_id: taskId }),
      })
      const { submission, error: e } = await res.json()
      if (e) throw new Error(e)
      const form = new FormData()
      form.append('submissionId', submission.id)
      files.forEach(f => form.append('files', f.file))
      const up = await fetch('/api/upload', { method: 'POST', body: form })
      const upData = await up.json()
      if (upData.error) throw new Error(upData.error)
      router.push(`/submission/${submission.id}`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const selectedWorkflow = workflows.find(w => w.id === workflowId)

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-p-bg">
      {/* Left Pane: Form */}
      <div className="w-full lg:w-[45%] lg:max-w-xl flex flex-col border-r border-p-border bg-white p-8 lg:p-14 lg:min-h-screen">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-p-text mb-3">New Request</h1>
          <p className="text-[16px] text-p-secondary leading-relaxed">Prepare your assets and select an approval workflow to notify your team.</p>
        </div>

        <div className="space-y-6 flex-1">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-wide">
              Request Title <span className="text-p-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q4 Website Redesign Assets"
              className="w-full border-b-2 border-p-border bg-transparent px-0 py-3 text-[18px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent transition-colors font-medium"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-wide">
              Notes <span className="text-p-quaternary normal-case tracking-normal font-medium">— Optional</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide context, references, or specific things reviewers should look for…"
              rows={4}
              className="w-full border-2 border-p-border rounded-2xl px-5 py-4 text-[14px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent focus:ring-4 focus:ring-p-accent-soft bg-p-surface transition-all resize-none leading-relaxed shadow-sm"
            />
          </div>

          {/* Task selector */}
          <div>
            <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-wide">
              Linked Task <span className="text-p-quaternary normal-case tracking-normal font-medium">— Optional</span>
            </label>
            <select
              value={taskId || ''}
              onChange={e => setTaskId(e.target.value || null)}
              className="w-full border-2 border-p-border rounded-2xl px-5 py-4 text-[15px] font-medium text-p-text focus:outline-none focus:border-p-accent focus:ring-4 focus:ring-p-accent-soft bg-p-surface shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="">No task linked</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.project_name} - {t.title}</option>
              ))}
            </select>
          </div>

          {/* Workflow selector */}
          <div>
            <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-wide">
              Approval Workflow <span className="text-p-error">*</span>
            </label>
            {loadingWf ? (
              <div className="border-2 border-p-border rounded-2xl px-5 py-4 bg-p-fill animate-pulse h-[56px]" />
            ) : workflows.length === 0 ? (
              <div className="border-2 border-amber-200 rounded-2xl px-5 py-4 bg-amber-50 text-[13px] text-amber-700 font-medium">
                No active workflows found. <Link href="/admin" className="underline">Create one</Link>.
              </div>
            ) : workflows.length === 1 ? (
              <div className="border-2 border-p-border rounded-2xl px-5 py-4 bg-p-surface shadow-sm text-[15px] text-p-text flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-p-accent-soft text-p-accent flex items-center justify-center">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="font-semibold">{workflows[0].name}</span>
              </div>
            ) : (
              <select
                value={workflowId}
                onChange={e => setWorkflowId(e.target.value)}
                className="w-full border-2 border-p-border rounded-2xl px-5 py-4 text-[15px] font-medium text-p-text focus:outline-none focus:border-p-accent focus:ring-4 focus:ring-p-accent-soft bg-p-surface shadow-sm transition-all appearance-none cursor-pointer"
              >
                <option value="">Select a workflow…</option>
                {workflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )}
            {selectedWorkflow?.description && (
              <p className="text-[13px] text-p-secondary mt-3 leading-relaxed flex items-start gap-2">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mt-0.5 text-p-tertiary flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {selectedWorkflow.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-p-border space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-[13px] font-medium flex items-center gap-2 border border-red-100 shadow-sm animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={submitting || loadingWf || workflows.length === 0}
            className="w-full bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all duration-300 text-[16px] shadow-accent hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing…
              </>
            ) : (
              <>
                Create Submission
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Pane: Dropzone & Gallery */}
      <div className="w-full lg:flex-1 relative bg-[#FDFDFC] lg:min-h-screen">
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => addFiles(Array.from(e.target.files ?? []))} />

        {/* Empty Dropzone State */}
        {files.length === 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`absolute inset-4 lg:inset-8 flex flex-col items-center justify-center rounded-[2.5rem] transition-all duration-500 cursor-pointer
              ${dragging 
                ? 'bg-p-accent-soft/30 border-4 border-p-accent border-dashed scale-[0.98] shadow-inner' 
                : 'bg-p-surface border-2 border-p-border border-dashed hover:border-p-accent/40 hover:bg-p-surface-h'}
            `}
          >
            <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center transition-all duration-300 shadow-sm ${dragging ? 'bg-p-accent text-white scale-110' : 'bg-white text-p-tertiary border border-p-border'}`}>
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            </div>
            <p className={`font-display text-2xl font-semibold mb-2 ${dragging ? 'text-p-accent' : 'text-p-text'}`}>
              {dragging ? 'Drop to upload' : 'Upload your files'}
            </p>
            <p className="text-[15px] text-p-tertiary">Drag and drop images, or <span className="text-p-accent font-semibold hover:underline">browse</span></p>
            <div className="mt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-p-border text-[12px] font-medium text-p-quaternary shadow-sm">
              <span className="w-2 h-2 rounded-full bg-p-tertiary" /> PNG, JPG, WEBP
            </div>
          </div>
        )}

        {/* Filled Gallery State */}
        {files.length > 0 && (
          <div className="absolute inset-0 overflow-y-auto p-8 lg:p-12">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex items-center justify-between mb-8 pb-6 border-b border-p-border transition-all duration-300 rounded-2xl ${dragging ? 'bg-p-accent-soft/30 border-p-accent -m-4 p-4 border-dashed' : ''}`}
            >
              <div>
                <h2 className="font-display text-2xl font-semibold text-p-text">Attachments</h2>
                <p className="text-[13px] text-p-secondary mt-1">{files.length} file{files.length !== 1 ? 's' : ''} prepared for review.</p>
              </div>
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 text-[14px] font-semibold text-p-text bg-white border-2 border-p-border px-5 py-2.5 rounded-xl hover:border-p-text hover:shadow-sm transition-all"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Add More
              </button>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-[240px]">
              {files.map((f, i) => (
                <div key={i} className="bg-white border border-p-border rounded-3xl overflow-hidden group border-b-4 border-b-p-border hover:border-b-p-accent transition-all duration-300 shadow-sm hover:shadow-card flex flex-col relative w-full h-full">
                  <div className="flex-1 bg-gradient-to-b from-p-bg to-white flex items-center justify-center p-4 relative overflow-hidden group-hover:bg-p-accent-soft/5 transition-colors">
                    <img 
                      src={f.preview} 
                      alt={`Asset ${f.label}`}
                      className="max-w-full max-h-[160px] w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-p-error rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <div className="px-5 py-3.5 border-t border-p-border flex items-center justify-between gap-3 bg-white z-10">
                    <span className="text-[13px] font-medium text-p-text truncate flex-1 leading-none">{f.file.name}</span>
                    <span className="w-6 h-6 rounded-lg bg-p-accent text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm leading-none">
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

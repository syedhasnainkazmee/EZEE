'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

type Project    = { id: string; name: string; description: string }
type Task       = {
  id: string; project_id: string; title: string; description: string
  assignor_id: string | null; assignor?: { id: string; name: string } | null
  assignee_id: string | null; assignee: any
  project_name: string; due_date: string | null; priority: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'in_review' | 'completed'; created_at: string
}
type User       = { id: string; name: string; role: string }
type Subtask    = { id: string; task_id: string; title: string; completed: boolean }
type Attachment = { id: string; task_id: string; filename: string; original_name: string; mime_type: string; size: number }

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#0EA572', '#E8882C', '#DC3545']

const PRIORITY_CONFIG = {
  low:    { dot: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Low' },
  medium: { dot: 'bg-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     label: 'Medium' },
  high:   { dot: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50 border-red-200',         label: 'High' },
}

const STATUS_CONFIG = {
  open:        { bar: 'bg-amber-400',   text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',    label: 'Open' },
  in_progress: { bar: 'bg-blue-400',    text: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',      label: 'In Progress' },
  in_review:   { bar: 'bg-violet-400',  text: 'text-violet-700', bg: 'bg-violet-50 border-violet-200',  label: 'In Review' },
  completed:   { bar: 'bg-emerald-400', text: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',label: 'Completed' },
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`
  if (b < 1048576) return `${(b/1024).toFixed(0)}KB`
  return `${(b/1048576).toFixed(1)}MB`
}

function isImage(mime: string) { return mime.startsWith('image/') }

function fmtDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── TaskCard ───────────────────────────────────────────────────────────────

function TaskCard({ task, users, index, onStatusChange, onRefresh }: {
  task: Task; users: User[]; index: number
  onStatusChange: (id: string, status: Task['status']) => void
  onRefresh: () => void
}) {
  const { user: authUser } = useAuth()
  const [expanded, setExpanded]       = useState(false)
  const [subtasks, setSubtasks]       = useState<Subtask[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newSubtask, setNewSubtask]   = useState('')
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pCfg = PRIORITY_CONFIG[task.priority]
  const sCfg = STATUS_CONFIG[task.status]
  const completedCount = subtasks.filter(s => s.completed).length
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  async function loadDetails() {
    setLoadingSubs(true)
    const [sr, ar] = await Promise.all([
      fetch(`/api/tasks/${task.id}/subtasks`).then(r => r.json()),
      fetch(`/api/tasks/${task.id}/attachments`).then(r => r.json()),
    ])
    setSubtasks(sr.subtasks ?? [])
    setAttachments(ar.attachments ?? [])
    setLoadingSubs(false)
  }

  function toggle() {
    if (!expanded) loadDetails()
    setExpanded(v => !v)
  }

  async function addSubtask() {
    if (!newSubtask.trim()) return
    await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSubtask.trim() }),
    })
    setNewSubtask('')
    loadDetails()
  }

  async function toggleSubtask(s: Subtask) {
    await fetch(`/api/tasks/${task.id}/subtasks/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !s.completed }),
    })
    setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, completed: !x.completed } : x))
  }

  async function deleteSubtask(id: string) {
    await fetch(`/api/tasks/${task.id}/subtasks/${id}`, { method: 'DELETE' })
    setSubtasks(prev => prev.filter(x => x.id !== id))
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    await fetch(`/api/tasks/${task.id}/attachments`, { method: 'POST', body: fd })
    loadDetails()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteAttachment(id: string) {
    await fetch(`/api/tasks/${task.id}/attachments/${id}`, { method: 'DELETE' })
    setAttachments(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden
      ${expanded
        ? 'border-p-accent/30 shadow-card-h'
        : 'border-transparent hover:border-p-border/60 shadow-sm hover:shadow-card hover:-translate-y-px'
      }`}
    >
      {/* Status bar — left edge */}
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${sCfg.bar} rounded-l-2xl`} />

        {/* Main row */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 flex-1 cursor-pointer group"
          onClick={toggle}
        >
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-full border ${sCfg.bg} ${sCfg.text}`}>
                {sCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-full border ${pCfg.bg} ${pCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
                {pCfg.label}
              </span>
              {task.due_date && (
                <span className={`text-[11px] font-bold ${isOverdue ? 'text-red-500' : 'text-p-tertiary'}`}>
                  {isOverdue ? '⚠ ' : ''}Due {fmtDate(task.due_date)}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-[16px] font-display font-bold text-p-text group-hover:text-p-accent transition-colors leading-snug mb-1.5">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-[13px] text-p-secondary line-clamp-1 leading-relaxed">{task.description}</p>
            )}

            {/* Subtask progress */}
            {subtasks.length > 0 && (
              <div className="flex items-center gap-2.5 mt-3">
                <div className="w-24 h-1.5 bg-p-fill rounded-full overflow-hidden">
                  <div
                    className="h-full bg-p-success rounded-full transition-all"
                    style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-p-tertiary font-bold tabular-nums">
                  {completedCount}/{subtasks.length}
                </span>
              </div>
            )}
          </div>

          {/* Right: assignee + controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {task.assignee && (
              <div className="flex items-center gap-2 bg-p-fill border-2 border-p-border px-3 py-2 rounded-2xl">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                >
                  {task.assignee.name.charAt(0)}
                </div>
                <span className="text-[12px] font-semibold text-p-secondary">{task.assignee.name}</span>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex items-center gap-1.5 text-p-tertiary">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                <span className="text-[12px] font-bold">{attachments.length}</span>
              </div>
            )}

            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-p-tertiary transition-all
              ${expanded ? 'bg-p-fill rotate-180' : 'group-hover:bg-p-fill'}`}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div
          className="border-t border-p-border px-7 pb-7 pt-6 space-y-6 animate-fade-in bg-p-bg/30"
          onClick={e => e.stopPropagation()}
        >
          {/* Status selector + Submit CTA */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-p-tertiary uppercase tracking-widest">Status</span>
              <select
                value={task.status}
                onChange={e => onStatusChange(task.id, e.target.value as Task['status'])}
                className="text-[13px] font-semibold border-2 border-p-border rounded-2xl px-4 py-2 bg-white text-p-text focus:outline-none focus:border-p-accent/60 transition-all cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <Link
              href={`/submit?task_id=${task.id}`}
              className="inline-flex items-center gap-2 text-[13px] font-bold px-5 py-2.5 rounded-2xl transition-all text-white hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 4px 12px -3px rgba(212,81,46,0.38)' }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Submit design
            </Link>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-[14px] text-p-secondary leading-relaxed">{task.description}</p>
          )}

          {/* Subtasks */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-widest text-p-tertiary mb-4">Subtasks</h5>
            {loadingSubs ? (
              <div className="space-y-2.5">
                {[1,2].map(i => <div key={i} className="h-10 bg-p-fill rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/60 group/sub transition-colors">
                    <button
                      onClick={() => toggleSubtask(s)}
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        s.completed ? 'bg-p-success border-p-success' : 'border-p-border hover:border-p-accent'
                      }`}
                    >
                      {s.completed && (
                        <svg width="8" height="8" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                    </button>
                    <span className={`text-[14px] flex-1 leading-snug ${s.completed ? 'line-through text-p-tertiary' : 'text-p-text'}`}>
                      {s.title}
                    </span>
                    <button
                      onClick={() => deleteSubtask(s.id)}
                      className="opacity-0 group-hover/sub:opacity-100 p-1.5 rounded-xl text-p-quaternary hover:text-p-error hover:bg-red-50 transition-all"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-3 mt-2 px-4">
                  <input
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="Add a subtask…"
                    className="flex-1 text-[13px] bg-transparent border-b-2 border-p-border pb-1.5 focus:outline-none focus:border-p-accent text-p-text placeholder:text-p-quaternary transition-colors"
                  />
                  <button
                    onClick={addSubtask}
                    disabled={!newSubtask.trim()}
                    className="text-[12px] font-bold text-p-accent disabled:text-p-quaternary transition-colors px-3 py-1.5 rounded-xl hover:bg-p-accent-soft"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-widest text-p-tertiary mb-4">Attachments</h5>
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-white border-2 border-p-border rounded-2xl p-3 group/att hover:border-p-border-strong transition-colors">
                    {isImage(a.mime_type) ? (
                      <img src={`/uploads/${a.filename}`} alt={a.original_name}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-p-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-p-fill border border-p-border flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="text-p-tertiary">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-p-text truncate">{a.original_name}</p>
                      <p className="text-[11px] text-p-tertiary mt-px">{formatBytes(a.size)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/att:opacity-100 transition-all">
                      <a href={`/uploads/${a.filename}`} target="_blank" rel="noopener"
                        className="p-1.5 rounded-lg text-p-tertiary hover:text-p-accent transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </a>
                      <button onClick={() => deleteAttachment(a.id)}
                        className="p-1.5 rounded-lg text-p-quaternary hover:text-p-error transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={uploadFile}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 text-[12.5px] font-bold text-p-secondary hover:text-p-accent border-2 border-dashed border-p-border hover:border-p-accent/40 rounded-2xl px-5 py-3 transition-all disabled:opacity-50 bg-p-fill/40 hover:bg-white"
            >
              {uploading ? (
                <span className="w-3.5 h-3.5 border-2 border-p-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              )}
              {uploading ? 'Uploading…' : 'Attach file'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user: authUser } = useAuth()
  const [projects, setProjects]               = useState<Project[]>([])
  const [tasks, setTasks]                     = useState<Task[]>([])
  const [users, setUsers]                     = useState<User[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName]       = useState('')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle]     = useState('')
  const [newTaskDesc, setNewTaskDesc]       = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskDueDate, setNewTaskDueDate]   = useState('')

  useEffect(() => { fetchProjects(); fetchUsers() }, [])
  useEffect(() => { fetchTasks(selectedProject) }, [selectedProject])

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    if (res.ok) setProjects((await res.json()).projects)
  }
  async function fetchTasks(projectId: string | null) {
    const res = await fetch(`/api/tasks${projectId ? `?project_id=${projectId}` : ''}`)
    if (res.ok) setTasks((await res.json()).tasks)
  }
  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers((await res.json()).users ?? [])
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    const res = await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName }),
    })
    if (res.ok) { setNewProjectName(''); setIsCreatingProject(false); fetchProjects() }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !selectedProject) return
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTaskTitle, description: newTaskDesc, project_id: selectedProject,
        assignee_id: newTaskAssignee || null, priority: newTaskPriority,
        due_date: newTaskDueDate || null,
      }),
    })
    if (res.ok) {
      setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskAssignee('')
      setNewTaskPriority('medium'); setNewTaskDueDate('')
      setIsCreatingTask(false); fetchTasks(selectedProject)
    }
  }

  async function handleStatusChange(id: string, status: Task['status']) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const currentProject = projects.find(p => p.id === selectedProject)

  return (
    <div className="flex flex-1 overflow-hidden bg-p-bg text-p-text">

      {/* ── Project Sidebar ── */}
      <div className="w-64 flex-shrink-0 flex flex-col overflow-hidden bg-white border-r border-p-border">
        <div className="px-6 pt-8 pb-5 border-b border-p-border flex-shrink-0">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-p-tertiary">Projects</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {/* All Tasks */}
            <button
              onClick={() => setSelectedProject(null)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[13.5px] font-semibold transition-all duration-200
                ${!selectedProject
                  ? 'bg-p-fill text-p-text border-2 border-p-border shadow-sm'
                  : 'text-p-secondary hover:bg-p-fill/60 hover:text-p-text border-2 border-transparent'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full transition-colors ${!selectedProject ? 'bg-p-accent' : 'bg-p-quaternary'}`} />
                All Tasks
              </div>
              {!selectedProject && tasks.length > 0 && (
                <span className="text-[11px] font-bold text-p-tertiary bg-p-fill border border-p-border rounded-full px-2 py-0.5">
                  {tasks.length}
                </span>
              )}
            </button>

            {/* Project list */}
            {projects.map(p => {
              const isActive = selectedProject === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[13.5px] font-semibold transition-all duration-200
                    ${isActive
                      ? 'bg-p-fill text-p-text border-2 border-p-border shadow-sm'
                      : 'text-p-secondary hover:bg-p-fill/60 hover:text-p-text border-2 border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isActive ? 'bg-p-accent animate-pulse-soft' : 'bg-p-quaternary'}`} />
                    <span className="truncate">{p.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* New Project */}
        <div className="p-4 border-t border-p-border flex-shrink-0">
          {isCreatingProject ? (
            <div className="bg-white rounded-2xl border-2 border-p-border p-4 shadow-sm">
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                placeholder="Project name…"
                className="w-full bg-p-fill border-2 border-p-border rounded-xl px-3 py-2.5 text-[13px] font-medium text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent mb-3 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="flex-1 text-white rounded-xl py-2.5 text-[12px] font-bold disabled:opacity-50 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)' }}
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="flex-1 bg-p-fill text-p-secondary hover:text-p-text rounded-xl py-2.5 text-[12px] font-bold transition-colors border-2 border-p-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingProject(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-p-border text-p-tertiary hover:text-p-accent hover:border-p-accent/40 transition-all font-bold text-[12.5px] hover:bg-p-accent-soft"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Project
            </button>
          )}
        </div>
      </div>

      {/* ── Main Task Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-8 pb-6 border-b border-p-border bg-p-bg/80 backdrop-blur-xl flex-shrink-0">
          <div>
            <h1 className="font-display text-4xl font-semibold text-p-text tracking-tight leading-tight">
              {currentProject?.name ?? 'All Tasks'}
            </h1>
            <p className="text-[15px] text-p-secondary mt-2">
              {tasks.length} task{tasks.length !== 1 && 's'}
              {authUser?.role === 'member' ? ' assigned to you' : ' in this space'}
            </p>
          </div>
          {selectedProject && (
            <button
              onClick={() => setIsCreatingTask(true)}
              className="flex items-center gap-2.5 text-white px-7 py-4 rounded-2xl font-bold text-[14px] transition-all hover:-translate-y-1 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Task
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-10 py-8">
          <div className="max-w-3xl mx-auto">

            {/* New Task Composer */}
            {isCreatingTask && (
              <div className="bg-white rounded-3xl border-2 border-p-accent/30 shadow-card-h mb-8 overflow-hidden animate-fade-in">
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #D4512E, #FF7A58)' }} />
                <div className="p-8">
                  <h3 className="font-display text-2xl font-bold text-p-text mb-6">New task</h3>
                  <div className="space-y-5">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-p-border px-0 py-2 text-[20px] font-semibold text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent transition-colors"
                      placeholder="What needs to be done?"
                    />
                    <textarea
                      value={newTaskDesc}
                      onChange={e => setNewTaskDesc(e.target.value)}
                      rows={2}
                      placeholder="Add details, links, or context…"
                      className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-4 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 resize-none transition-all"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Assignee</label>
                        <select
                          value={newTaskAssignee}
                          onChange={e => setNewTaskAssignee(e.target.value)}
                          className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-4 py-3 text-[13px] font-semibold text-p-text focus:outline-none focus:border-p-accent/60 cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Priority</label>
                        <select
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value as any)}
                          className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-4 py-3 text-[13px] font-semibold text-p-text focus:outline-none focus:border-p-accent/60 cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Due date</label>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={e => setNewTaskDueDate(e.target.value)}
                          className="w-full bg-p-bg border-2 border-p-border rounded-2xl px-4 py-3 text-[13px] font-semibold text-p-text focus:outline-none focus:border-p-accent/60"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => setIsCreatingTask(false)}
                        className="text-p-secondary hover:text-p-text px-6 py-3 rounded-2xl text-[14px] font-bold hover:bg-p-fill transition-all border-2 border-transparent hover:border-p-border"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTask}
                        disabled={!newTaskTitle.trim()}
                        className="text-white px-8 py-3 rounded-2xl font-bold text-[14px] disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #100F0D, #1C1916)', boxShadow: '0 4px 14px -4px rgba(16,15,13,0.4)' }}
                      >
                        Create Task
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {tasks.length === 0 && !isCreatingTask ? (
              <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-3xl bg-p-fill shadow-sm flex items-center justify-center mx-auto mb-6">
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} className="text-p-tertiary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <h3 className="font-display text-2xl font-bold text-p-text mb-3">No tasks yet</h3>
                <p className="text-[15px] text-p-secondary max-w-xs mx-auto leading-relaxed">
                  {selectedProject
                    ? 'Create a task to start tracking work in this project.'
                    : 'Select a project or create one to get started.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    index={i}
                    onStatusChange={handleStatusChange}
                    onRefresh={() => fetchTasks(selectedProject)}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

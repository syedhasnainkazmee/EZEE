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

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9F0A', '#FF2D55']
const PRIORITY_COLORS = { low: 'text-p-success bg-emerald-50', medium: 'text-amber-700 bg-amber-50', high: 'text-p-error bg-red-50' }
const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-800', in_progress: 'bg-blue-100 text-blue-800',
  in_review: 'bg-purple-100 text-purple-800', completed: 'bg-emerald-50 text-emerald-700'
}
const STATUS_STRIP = {
  open: 'bg-amber-400', in_progress: 'bg-blue-400', in_review: 'bg-purple-400', completed: 'bg-p-success'
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`
  if (b < 1048576) return `${(b/1024).toFixed(0)}KB`
  return `${(b/1048576).toFixed(1)}MB`
}

function isImage(mime: string) { return mime.startsWith('image/') }

// ── TaskCard with subtasks + attachments ─────────────────────────────────

function TaskCard({ task, users, index, onStatusChange, onRefresh }: {
  task: Task; users: User[]; index: number
  onStatusChange: (id: string, status: Task['status']) => void
  onRefresh: () => void
}) {
  const { user: authUser } = useAuth()
  const [expanded, setExpanded]     = useState(false)
  const [subtasks, setSubtasks]     = useState<Subtask[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newSubtask, setNewSubtask]   = useState('')
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const completedCount = subtasks.filter(s => s.completed).length

  return (
    <div className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 group relative overflow-hidden ${expanded ? 'border-p-accent/30 shadow-card' : 'border-p-border hover:shadow-card hover:-translate-y-0.5'}`}>
      {/* Status strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${STATUS_STRIP[task.status]}`} />

      {/* Main row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 pl-8 cursor-pointer" onClick={toggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md ${STATUS_COLORS[task.status]}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
            {task.due_date && (
              <span className={`text-[10px] font-semibold ${new Date(task.due_date) < new Date() ? 'text-p-error' : 'text-p-tertiary'}`}>
                Due {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          <h4 className="text-[17px] font-display font-semibold text-p-nav mb-1 group-hover:text-p-accent transition-colors leading-snug">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-[13px] text-p-secondary line-clamp-1 leading-relaxed">{task.description}</p>
          )}

          {subtasks.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 max-w-[120px] h-1.5 bg-p-fill rounded-full overflow-hidden">
                <div className="h-full bg-p-success rounded-full transition-all" style={{ width: `${(completedCount / subtasks.length) * 100}%` }} />
              </div>
              <span className="text-[11px] text-p-tertiary font-medium">{completedCount}/{subtasks.length} done</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {task.assignee ? (
            <div className="flex items-center gap-2 bg-p-fill pl-1.5 pr-3 py-1.5 rounded-full border border-p-border">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>
                {task.assignee.name.charAt(0)}
              </div>
              <span className="text-[12px] font-semibold text-p-nav">{task.assignee.name}</span>
            </div>
          ) : (
            <span className="text-[11px] text-p-tertiary font-medium">Unassigned</span>
          )}

          {attachments.length > 0 && (
            <div className="flex items-center gap-1 text-p-tertiary">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
              <span className="text-[11px] font-medium">{attachments.length}</span>
            </div>
          )}

          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            className={`text-p-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-p-border px-8 pb-6 pt-5 space-y-6" onClick={e => e.stopPropagation()}>
          {/* Status control */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-p-tertiary uppercase tracking-widest">Status</span>
              <select value={task.status}
                onChange={e => onStatusChange(task.id, e.target.value as Task['status'])}
                className="text-[12px] font-semibold border border-p-border rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-p-accent transition-all">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <Link href={`/submit?task_id=${task.id}`}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-p-accent hover:text-p-accent-h transition-colors">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
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
            <h5 className="text-[11px] font-bold uppercase tracking-widest text-p-tertiary mb-3">Subtasks</h5>
            {loadingSubs ? (
              <div className="text-[12px] text-p-tertiary">Loading…</div>
            ) : (
              <div className="space-y-2">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-3 group/sub">
                    <button onClick={() => toggleSubtask(s)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        s.completed ? 'bg-p-success border-p-success' : 'border-p-border hover:border-p-accent'
                      }`}>
                      {s.completed && (
                        <svg width="8" height="8" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                    </button>
                    <span className={`text-[13px] flex-1 ${s.completed ? 'line-through text-p-tertiary' : 'text-p-text'}`}>{s.title}</span>
                    <button onClick={() => deleteSubtask(s.id)}
                      className="opacity-0 group-hover/sub:opacity-100 text-p-quaternary hover:text-p-error transition-all">
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="Add a subtask…"
                    className="flex-1 text-[13px] border-b border-p-border bg-transparent pb-1 focus:outline-none focus:border-p-accent text-p-text placeholder:text-p-quaternary transition-colors" />
                  <button onClick={addSubtask} disabled={!newSubtask.trim()}
                    className="text-[12px] font-semibold text-p-accent disabled:text-p-quaternary transition-colors">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-widest text-p-tertiary mb-3">Attachments</h5>
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-p-fill border border-p-border rounded-xl p-2.5 group/att">
                    {isImage(a.mime_type) ? (
                      <img src={`/uploads/${a.filename}`} alt={a.original_name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-p-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white border border-p-border flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-p-text truncate">{a.original_name}</p>
                      <p className="text-[10px] text-p-tertiary">{formatBytes(a.size)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/att:opacity-100 transition-all">
                      <a href={`/uploads/${a.filename}`} target="_blank" rel="noopener"
                        className="text-p-tertiary hover:text-p-accent transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </a>
                      <button onClick={() => deleteAttachment(a.id)}
                        className="text-p-quaternary hover:text-p-error transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={uploadFile}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 text-[12px] font-semibold text-p-secondary hover:text-p-accent border border-dashed border-p-border hover:border-p-accent/40 rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 bg-p-fill hover:bg-white">
              {uploading ? (
                <span className="w-3 h-3 border border-p-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
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
  const [projects, setProjects]         = useState<Project[]>([])
  const [tasks, setTasks]               = useState<Task[]>([])
  const [users, setUsers]               = useState<User[]>([])
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

  return (
    <div className="flex flex-1 min-h-screen bg-p-bg text-p-text select-none">

      {/* ── Secondary Sidebar: Projects ── */}
      <div className="w-72 bg-[#F6F5F2] border-r border-[#EAE5E0] flex flex-col flex-shrink-0 relative z-10 shadow-sm">
        <div className="p-8 pb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-p-tertiary mb-6">Projects</h2>
          <div className="space-y-1.5">
            <button onClick={() => setSelectedProject(null)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all duration-300 ${!selectedProject ? 'bg-white text-p-nav shadow-sm border border-black/5' : 'text-p-secondary hover:bg-black/5 hover:text-p-nav'}`}>
              <span>All Tasks</span>
              {!selectedProject && <span className="w-1.5 h-1.5 rounded-full bg-p-accent animate-pulse" />}
            </button>
            {projects.map(p => (
              <button key={p.id} onClick={() => setSelectedProject(p.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all duration-300 ${selectedProject === p.id ? 'bg-white text-p-nav shadow-sm border border-black/5' : 'text-p-secondary hover:bg-black/5 hover:text-p-nav'}`}>
                <span className="truncate pr-2">{p.name}</span>
                {selectedProject === p.id && <span className="w-1.5 h-1.5 rounded-full bg-p-accent animate-pulse flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-[#EAE5E0]">
          {isCreatingProject ? (
            <div className="bg-white p-4 rounded-3xl shadow-card border border-p-border">
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                placeholder="Name your project…"
                className="w-full bg-p-surface border border-p-border rounded-xl px-3 py-2 text-[13px] font-medium text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent mb-3 transition-all" />
              <div className="flex gap-2">
                <button onClick={handleCreateProject} disabled={!newProjectName.trim()}
                  className="flex-1 bg-p-nav text-white rounded-xl py-2 text-[12px] font-semibold disabled:opacity-50 hover:bg-black transition-colors">
                  Create
                </button>
                <button onClick={() => setIsCreatingProject(false)}
                  className="flex-1 bg-p-fill text-p-secondary hover:text-p-text rounded-xl py-2 text-[12px] font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsCreatingProject(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-p-border text-p-secondary hover:text-p-accent hover:border-p-accent/40 transition-all font-semibold text-[13px] bg-white/50 hover:bg-white">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              New Project
            </button>
          )}
        </div>
      </div>

      {/* ── Main Task Feed ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative h-screen">

        {/* Header */}
        <div className="h-28 flex items-end justify-between px-10 pb-6 border-b border-p-border bg-white/80 backdrop-blur-xl flex-shrink-0 z-20 sticky top-0">
          <div>
            <h1 className="text-4xl font-display font-semibold text-p-nav tracking-tight">
              {selectedProject ? projects.find(p => p.id === selectedProject)?.name : 'All Tasks'}
            </h1>
            <p className="text-[14px] text-p-secondary mt-1">
              {tasks.length} task{tasks.length !== 1 && 's'}
              {authUser?.role === 'member' ? ' assigned to you' : ' in this space'}
            </p>
          </div>

          {selectedProject && (
            <button onClick={() => setIsCreatingTask(true)}
              className="bg-p-accent hover:bg-p-accent-h text-white px-6 py-3 rounded-full font-semibold text-[14px] transition-transform shadow-accent hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Create Task
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-4xl mx-auto">

            {/* New Task Composer */}
            {isCreatingTask && (
              <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-p-border mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-p-accent" />
                <h3 className="text-xl font-display font-semibold mb-6 text-p-nav">New task</h3>
                <div className="space-y-4">
                  <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-[#EAE5E0] px-0 py-3 text-xl font-medium text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent transition-colors"
                    placeholder="What needs to be done?" />
                  <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}
                    rows={3} placeholder="Add details, links, or context…"
                    className="w-full bg-p-bg border-2 border-[#EAE5E0] rounded-2xl px-5 py-4 text-[14px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent resize-none transition-all" />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-p-tertiary mb-1.5 uppercase tracking-widest">Assignee</label>
                      <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}
                        className="w-full bg-p-bg border-2 border-[#EAE5E0] rounded-xl px-3 py-2.5 text-[13px] font-medium text-p-text focus:outline-none focus:border-p-accent cursor-pointer">
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-p-tertiary mb-1.5 uppercase tracking-widest">Priority</label>
                      <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)}
                        className="w-full bg-p-bg border-2 border-[#EAE5E0] rounded-xl px-3 py-2.5 text-[13px] font-medium text-p-text focus:outline-none focus:border-p-accent cursor-pointer">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-p-tertiary mb-1.5 uppercase tracking-widest">Due date</label>
                      <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)}
                        className="w-full bg-p-bg border-2 border-[#EAE5E0] rounded-xl px-3 py-2.5 text-[13px] font-medium text-p-text focus:outline-none focus:border-p-accent" />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button onClick={() => setIsCreatingTask(false)} className="text-p-secondary hover:bg-p-fill px-5 py-3 rounded-xl text-[14px] font-semibold transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}
                      className="bg-p-nav text-white disabled:opacity-50 px-8 py-3 rounded-full font-semibold text-[14px] hover:bg-black hover:shadow-lg transition-all hover:-translate-y-0.5">
                      Create Task
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {tasks.length === 0 && !isCreatingTask ? (
              <div className="text-center py-32">
                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm border border-p-border flex items-center justify-center mx-auto mb-6 opacity-80">
                  <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <h3 className="font-display text-2xl font-semibold text-p-nav mb-2">No tasks yet</h3>
                <p className="text-[15px] text-p-secondary font-medium max-w-sm mx-auto">
                  {selectedProject ? 'Create a task to get started.' : 'No tasks across any projects.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} users={users} index={i}
                    onStatusChange={handleStatusChange} onRefresh={() => fetchTasks(selectedProject)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

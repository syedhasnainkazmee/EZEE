'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type User = { id: string; name: string; email: string; role: 'admin' | 'member'; token: string; password_hash: string | null; status: string; created_at: string }
type Workflow = { id: string; name: string; description: string; is_active: boolean; steps: any[]; submission_count: number }
type Invitation = { id: string; email: string; role: string; used: boolean; expires_at: string }

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9F0A', '#FF2D55']

export default function AdminPage() {
  const [tab, setTab] = useState<'members' | 'workflows' | 'invitations' | 'requests'>('members')
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingWf, setLoadingWf] = useState(true)

  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member')
  const [addingMember, setAddingMember] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member')

  const [showWfForm, setShowWfForm] = useState(false)
  const [newWfName, setNewWfName] = useState('')
  const [newWfDesc, setNewWfDesc] = useState('')
  const [addingWf, setAddingWf] = useState(false)

  const [copied, setCopied] = useState<string | null>(null)

  function loadUsers() {
    setLoadingUsers(true)
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users ?? [])).finally(() => setLoadingUsers(false))
  }
  function loadPendingUsers() {
    fetch('/api/admin/users?status=pending').then(r => r.json()).then(d => setPendingUsers(d.users ?? []))
  }
  function loadWorkflows() {
    setLoadingWf(true)
    fetch('/api/admin/workflows').then(r => r.json()).then(d => setWorkflows(d.workflows ?? [])).finally(() => setLoadingWf(false))
  }
  function loadInvitations() {
    fetch('/api/org').then(r => r.json()).then(d => setInvitations((d.invitations ?? []).filter((i: Invitation) => !i.used)))
  }

  useEffect(() => { loadUsers(); loadWorkflows(); loadInvitations(); loadPendingUsers() }, [])

  async function addMember() {
    if (!newEmail.trim()) return
    setAddingMember(true)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
    })
    const d = await res.json()
    if (res.ok) {
      setInviteMsg(`Invitation sent to ${newEmail}!`)
      setNewEmail(''); setNewRole('member'); setShowMemberForm(false)
      loadInvitations()
    } else {
      setInviteMsg(d.error ?? 'Failed to send invitation')
    }
    setAddingMember(false)
    setTimeout(() => setInviteMsg(''), 4000)
  }

  async function revokeInvite(id: string) {
    await fetch('/api/org', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: id }),
    })
    loadInvitations()
  }

  async function saveUser(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
    })
    setEditingUser(null); loadUsers()
  }

  async function deleteUser(id: string) {
    if (!confirm('Remove this team member?')) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    loadUsers()
  }

  async function addWorkflow() {
    if (!newWfName.trim()) return
    setAddingWf(true)
    const res = await fetch('/api/admin/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWfName.trim(), description: newWfDesc.trim() }),
    })
    const { workflow } = await res.json()
    setNewWfName(''); setNewWfDesc(''); setShowWfForm(false); setAddingWf(false)
    loadWorkflows()
    window.location.href = `/admin/workflows/${workflow.id}`
  }

  async function toggleWorkflow(id: string, current: boolean) {
    await fetch(`/api/admin/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    loadWorkflows()
  }

  async function deleteWorkflow(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/workflows/${id}`, { method: 'DELETE' })
    loadWorkflows()
  }

  async function approveUser(id: string) {
    await fetch(`/api/admin/users/${id}/approve`, { method: 'POST' })
    loadPendingUsers(); loadUsers()
  }

  async function rejectUser(id: string) {
    if (!confirm('Reject this access request? The user will be removed.')) return
    await fetch(`/api/admin/users/${id}/reject`, { method: 'POST' })
    loadPendingUsers()
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${token}`)
    setCopied(token); setTimeout(() => setCopied(null), 2000)
  }

  const inputClass = "w-full border-2 border-p-border rounded-2xl px-5 py-3.5 text-[13px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent/60 bg-p-bg transition-all font-sans"

  return (
    <div className="flex-1 bg-p-bg">

      <main className="max-w-5xl mx-auto px-8 lg:px-12 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-p-text leading-tight">Admin Panel</h1>
            <p className="text-[15px] text-p-secondary mt-2.5">Manage your team and configure approval workflows.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-p-fill rounded-2xl p-1.5 mb-8 w-fit border-2 border-p-border">
          {(['members', 'workflows', 'invitations', 'requests'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 capitalize flex items-center gap-2
                ${tab === t ? 'bg-white text-p-text shadow-sm' : 'text-p-tertiary hover:text-p-secondary'}`}>
              {t === 'requests' ? 'Access Requests' : t}
              {t === 'invitations' && invitations.length > 0 && (
                <span className="bg-p-accent text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
              {t === 'requests' && pendingUsers.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {inviteMsg && (
          <div className={`mb-6 px-5 py-4 rounded-2xl text-[13px] font-medium border-2 ${inviteMsg.includes('!') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {inviteMsg}
          </div>
        )}

        {/* ── Members tab ── */}
        {tab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[13px] text-p-tertiary">
                {users.length} team member{users.length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => setShowMemberForm(v => !v)}
                className="inline-flex items-center gap-2.5 text-white text-[14px] font-bold px-7 py-4 rounded-2xl hover:-translate-y-1 active:translate-y-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Add Member
              </button>
            </div>

            {/* Invite member form */}
            {showMemberForm && (
              <div className="bg-white border-2 border-p-border rounded-3xl p-8 mb-6 shadow-sm">
                <h3 className="font-bold text-p-text text-[18px] mb-1">Invite Team Member</h3>
                <p className="text-[14px] text-p-secondary mb-6">They&apos;ll receive an email invitation to set up their account.</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Work Email *</label>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="colleague@company.com" type="email" onKeyDown={e => e.key === 'Enter' && addMember()}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Role</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value as any)}
                      className={inputClass}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={addMember} disabled={addingMember || !newEmail.trim()}
                    className="bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white text-[14px] font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                    {addingMember ? 'Sending…' : 'Send Invitation'}
                  </button>
                  <button onClick={() => setShowMemberForm(false)} className="text-[14px] font-bold text-p-tertiary hover:text-p-text px-5 py-4 transition-colors rounded-2xl hover:bg-p-fill">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="bg-white border-2 border-transparent rounded-3xl overflow-hidden shadow-sm">
              {loadingUsers ? (
                <div className="p-12 text-center text-[13px] text-p-tertiary">Loading…</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-p-border bg-p-bg/60">
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Member</th>
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Role</th>
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Status</th>
                      <th className="px-6 py-4 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-p-border last:border-0 ${editingUser === u.id ? 'bg-p-accent-soft/50' : 'hover:bg-p-bg/40'} transition-colors`}>
                        {editingUser === u.id ? (
                          <>
                            <td className="px-6 py-4 space-y-2">
                              <input value={editName} onChange={e => setEditName(e.target.value)}
                                className="w-full border-2 border-p-border rounded-2xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-p-accent/60 font-sans bg-p-bg" />
                              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email"
                                className="w-full border-2 border-p-border rounded-2xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-p-accent/60 font-sans bg-p-bg" />
                            </td>
                            <td className="px-6 py-4">
                              <select value={editRole} onChange={e => setEditRole(e.target.value as any)}
                                className="border-2 border-p-border rounded-2xl px-4 py-2.5 text-[13px] bg-p-bg font-sans focus:outline-none focus:border-p-accent/60">
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-4"><span className="text-[11px] font-medium text-p-tertiary">Editing…</span></td>
                            <td className="px-6 py-4">
                              <div className="flex gap-3">
                                <button onClick={() => saveUser(u.id)} className="text-[13px] font-bold text-p-accent hover:text-p-accent-h transition-colors">Save</button>
                                <button onClick={() => setEditingUser(null)} className="text-[13px] text-p-tertiary hover:text-p-text transition-colors">Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
                                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                                >
                                  {u.name[0]}
                                </div>
                                <div>
                                  <div className="font-semibold text-[13px] text-p-text">{u.name}</div>
                                  <div className="text-[11px] text-p-tertiary mt-0.5">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                                u.role === 'admin'
                                  ? 'bg-p-accent/10 text-p-accent border-p-accent/20'
                                  : 'bg-p-fill text-p-secondary border-p-border'
                              }`}>
                                {u.role === 'admin' ? 'Admin' : 'Member'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                                u.password_hash ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {u.password_hash ? 'Active' : 'Invite pending'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4 justify-end">
                                <button onClick={() => { setEditingUser(u.id); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role) }}
                                  className="text-[13px] text-p-tertiary hover:text-p-text transition-colors font-semibold">Edit</button>
                                <button onClick={() => deleteUser(u.id)}
                                  className="text-[13px] text-p-tertiary hover:text-p-error transition-colors font-semibold">Remove</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Workflows tab ── */}
        {tab === 'workflows' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[14px] text-p-secondary max-w-md leading-relaxed">
                Workflows define the approval chain. Each submission goes through steps in order.
              </p>
              <button onClick={() => setShowWfForm(v => !v)}
                className="inline-flex items-center gap-2.5 text-white text-[14px] font-bold px-7 py-4 rounded-2xl hover:-translate-y-1 active:translate-y-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                New Workflow
              </button>
            </div>

            {showWfForm && (
              <div className="bg-white border-2 border-p-border rounded-3xl p-8 mb-6 shadow-sm">
                <h3 className="font-bold text-p-text text-[18px] mb-6">New Workflow</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Name *</label>
                    <input value={newWfName} onChange={e => setNewWfName(e.target.value)}
                      placeholder="e.g. Email Campaign Approval"
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Description</label>
                    <input value={newWfDesc} onChange={e => setNewWfDesc(e.target.value)}
                      placeholder="What does this workflow cover?"
                      className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={addWorkflow} disabled={addingWf || !newWfName.trim()}
                    className="bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white text-[14px] font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                    {addingWf ? 'Creating…' : 'Create & Configure Steps →'}
                  </button>
                  <button onClick={() => setShowWfForm(false)} className="text-[14px] font-bold text-p-tertiary hover:text-p-text px-5 py-4 transition-colors rounded-2xl hover:bg-p-fill">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {loadingWf ? (
                <div className="bg-white border-2 border-transparent rounded-2xl p-12 text-center text-[13px] text-p-tertiary shadow-sm">Loading…</div>
              ) : workflows.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <p className="text-[15px] text-p-secondary">No workflows yet. Create one to define your approval chain.</p>
                </div>
              ) : workflows.map(wf => (
                <div key={wf.id} className="bg-white border-2 border-transparent hover:border-p-border/60 rounded-2xl p-6 shadow-sm hover:shadow-card transition-all duration-300 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-p-text text-[16px]">{wf.name}</h3>
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                          wf.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-p-fill text-p-tertiary border-p-border'
                        }`}>
                          {wf.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {wf.description && <p className="text-[13px] text-p-secondary mb-4">{wf.description}</p>}

                      {/* Steps */}
                      {wf.steps.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {wf.steps.map((step, i) => (
                            <div key={step.id} className="flex items-center gap-2">
                              {i > 0 && (
                                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-border flex-shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                </svg>
                              )}
                              <span className="bg-p-fill border-2 border-p-border text-[11px] font-bold text-p-text px-3 py-1.5 rounded-full">
                                {step.user?.name ?? 'Unassigned'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-p-quaternary italic">No steps configured yet.</p>
                      )}

                      <p className="text-[11px] text-p-quaternary mt-3">{wf.submission_count} submission{wf.submission_count !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Link href={`/admin/workflows/${wf.id}`}
                        className="text-[13px] font-bold text-p-accent hover:text-p-accent-h transition-colors">
                        Edit steps
                      </Link>
                      <button onClick={() => toggleWorkflow(wf.id, wf.is_active)}
                        className="text-[13px] text-p-tertiary hover:text-p-text transition-colors font-semibold">
                        {wf.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteWorkflow(wf.id, wf.name)}
                        className="text-[13px] text-p-tertiary hover:text-p-error transition-colors font-semibold">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Invitations tab ── */}
        {tab === 'invitations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[14px] text-p-secondary">Pending email invitations. Members must accept before they can log in.</p>
              <button onClick={() => setShowMemberForm(v => !v)}
                className="inline-flex items-center gap-2.5 text-white text-[14px] font-bold px-7 py-4 rounded-2xl hover:-translate-y-1 active:translate-y-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 6px 20px -4px rgba(212,81,46,0.42)' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Invite Member
              </button>
            </div>

            {showMemberForm && (
              <div className="bg-white border-2 border-p-border rounded-3xl p-8 mb-6 shadow-sm">
                <h3 className="font-bold text-p-text text-[18px] mb-1">Invite Team Member</h3>
                <p className="text-[14px] text-p-secondary mb-6">They&apos;ll receive an email invitation to set up their account.</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Work Email *</label>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="colleague@company.com" type="email" onKeyDown={e => e.key === 'Enter' && addMember()}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Role</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value as any)}
                      className={inputClass}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={addMember} disabled={addingMember || !newEmail.trim()}
                    className="bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white text-[14px] font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5 active:translate-y-0">
                    {addingMember ? 'Sending…' : 'Send Invitation'}
                  </button>
                  <button onClick={() => setShowMemberForm(false)} className="text-[14px] font-bold text-p-tertiary hover:text-p-text px-5 py-4 transition-colors rounded-2xl hover:bg-p-fill">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {invitations.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center flex flex-col items-center justify-center">
                <p className="text-[15px] text-p-secondary">No pending invitations. Use the Members tab to invite someone.</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-transparent rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-p-border bg-p-bg/60">
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Email</th>
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Role</th>
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Expires</th>
                      <th className="px-6 py-4 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map(inv => (
                      <tr key={inv.id} className="border-b border-p-border last:border-0 hover:bg-p-bg/40 transition-colors">
                        <td className="px-6 py-5 text-[13px] font-semibold text-p-text">{inv.email}</td>
                        <td className="px-6 py-5">
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                            inv.role === 'admin' ? 'bg-p-accent/10 text-p-accent border-p-accent/20' : 'bg-p-fill text-p-secondary border-p-border'
                          }`}>{inv.role}</span>
                        </td>
                        <td className="px-6 py-5 text-[13px] text-p-tertiary">
                          {new Date(inv.expires_at) < new Date()
                            ? <span className="text-p-error font-semibold">Expired</span>
                            : new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          }
                        </td>
                        <td className="px-6 py-5">
                          <button onClick={() => revokeInvite(inv.id)}
                            className="text-[13px] text-p-tertiary hover:text-p-error transition-colors font-semibold">
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* ── Access Requests tab ── */}
        {tab === 'requests' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[14px] text-p-secondary">
                Users who requested access via your domain. Approve to activate their account, or reject to remove the request.
              </p>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-p-border rounded-[3rem] p-24 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-p-fill flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <p className="text-[15px] text-p-secondary">No pending access requests.</p>
              </div>
            ) : (
              <div className="bg-white border-2 border-transparent rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-p-border bg-p-bg/60">
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Requester</th>
                      <th className="text-left text-[11px] font-bold text-p-tertiary uppercase tracking-widest px-6 py-4">Requested</th>
                      <th className="px-6 py-4 w-48" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u.id} className="border-b border-p-border last:border-0 hover:bg-p-bg/40 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
                              style={{ background: '#5856D6' }}>
                              {u.name[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-[13px] text-p-text">{u.name}</div>
                              <div className="text-[11px] text-p-tertiary mt-0.5">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[13px] text-p-tertiary">
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4 justify-end">
                            <button
                              onClick={() => approveUser(u.id)}
                              className="text-[13px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectUser(u.id)}
                              className="text-[13px] font-bold text-red-600 hover:text-red-700 transition-colors px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProcessLogo from '@/components/ProcessLogo'

type User = { id: string; name: string; email: string; role: 'admin' | 'member'; token: string; password_hash: string | null; created_at: string }
type Workflow = { id: string; name: string; description: string; is_active: boolean; steps: any[]; submission_count: number }
type Invitation = { id: string; email: string; role: string; used: boolean; expires_at: string }

const AVATAR_COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9F0A', '#FF2D55']

export default function AdminPage() {
  const [tab, setTab] = useState<'members' | 'workflows' | 'invitations'>('members')
  const [users, setUsers] = useState<User[]>([])
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
  function loadWorkflows() {
    setLoadingWf(true)
    fetch('/api/admin/workflows').then(r => r.json()).then(d => setWorkflows(d.workflows ?? [])).finally(() => setLoadingWf(false))
  }
  function loadInvitations() {
    fetch('/api/org').then(r => r.json()).then(d => setInvitations((d.invitations ?? []).filter((i: Invitation) => !i.used)))
  }

  useEffect(() => { loadUsers(); loadWorkflows(); loadInvitations() }, [])

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

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/review/${token}`)
    setCopied(token); setTimeout(() => setCopied(null), 2000)
  }

  const inputClass = "w-full border border-p-border rounded-xl px-3.5 py-2.5 text-[13px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/10 bg-white transition-all font-sans"

  return (
    <div className="min-h-screen bg-p-bg">

      {/* Nav */}
      <header className="bg-p-nav sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ProcessLogo height={18} />
            <div className="w-px h-4 bg-white/10" />
            <span className="text-white/80 text-[13px] font-semibold">Admin</span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-[13px] transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-p-text">Admin Panel</h1>
          <p className="text-[13px] text-p-secondary mt-1">Manage your team and configure approval workflows.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-p-surface border border-p-border rounded-2xl p-1 mb-7 w-fit shadow-card">
          {(['members', 'workflows', 'invitations'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 capitalize flex items-center gap-2
                ${tab === t ? 'bg-p-nav text-white shadow-sm' : 'text-p-secondary hover:text-p-text'}`}>
              {t}
              {t === 'invitations' && invitations.length > 0 && (
                <span className="bg-p-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {inviteMsg && (
          <div className={`mb-4 px-4 py-3 rounded-2xl text-[13px] font-medium ${inviteMsg.includes('!') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {inviteMsg}
          </div>
        )}

        {/* ── Members tab ── */}
        {tab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[12px] text-p-tertiary">
                {users.length} team member{users.length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => setShowMemberForm(v => !v)}
                className="flex items-center gap-1.5 bg-p-accent hover:bg-p-accent-h text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-all duration-150 shadow-sm hover:shadow-md">
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                Add Member
              </button>
            </div>

            {/* Invite member form */}
            {showMemberForm && (
              <div className="bg-p-surface border border-p-border rounded-2xl p-5 mb-5 shadow-card">
                <h3 className="font-semibold text-p-text text-[14px] mb-1">Invite Team Member</h3>
                <p className="text-[12px] text-p-secondary mb-4">They&apos;ll receive an email invitation to set up their account.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Work Email *</label>
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="colleague@company.com" type="email" onKeyDown={e => e.key === 'Enter' && addMember()}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Role</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value as any)}
                      className={inputClass}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addMember} disabled={addingMember || !newEmail.trim()}
                    className="bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all">
                    {addingMember ? 'Sending…' : 'Send Invitation'}
                  </button>
                  <button onClick={() => setShowMemberForm(false)} className="text-[13px] text-p-tertiary hover:text-p-text px-3 py-2.5 transition-colors rounded-xl hover:bg-p-fill">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="bg-p-surface border border-p-border rounded-2xl overflow-hidden shadow-card">
              {loadingUsers ? (
                <div className="p-10 text-center text-[13px] text-p-tertiary">Loading…</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-p-border bg-p-bg/60">
                      <th className="text-left text-[11px] font-semibold text-p-tertiary uppercase tracking-wide px-5 py-3">Member</th>
                      <th className="text-left text-[11px] font-semibold text-p-tertiary uppercase tracking-wide px-5 py-3">Role</th>
                      <th className="text-left text-[11px] font-semibold text-p-tertiary uppercase tracking-wide px-5 py-3">Status</th>
                      <th className="px-5 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-p-border last:border-0 ${editingUser === u.id ? 'bg-p-accent-soft/50' : 'hover:bg-p-bg/40'} transition-colors`}>
                        {editingUser === u.id ? (
                          <>
                            <td className="px-5 py-3 space-y-2">
                              <input value={editName} onChange={e => setEditName(e.target.value)}
                                className="w-full border border-p-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-p-accent font-sans" />
                              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email"
                                className="w-full border border-p-border rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-p-accent font-sans" />
                            </td>
                            <td className="px-5 py-3">
                              <select value={editRole} onChange={e => setEditRole(e.target.value as any)}
                                className="border border-p-border rounded-xl px-3 py-2 text-[13px] bg-white font-sans focus:outline-none focus:border-p-accent">
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-5 py-3"><span className="text-[11px] font-medium text-p-tertiary">Editing…</span></td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => saveUser(u.id)} className="text-[12px] font-semibold text-p-accent hover:text-p-accent-h transition-colors">Save</button>
                                <button onClick={() => setEditingUser(null)} className="text-[12px] text-p-tertiary hover:text-p-text transition-colors">Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-[13px] flex-shrink-0"
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
                            <td className="px-5 py-4">
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                u.role === 'admin'
                                  ? 'bg-p-accent/10 text-p-accent'
                                  : 'bg-p-fill text-p-secondary'
                              }`}>
                                {u.role === 'admin' ? 'Admin' : 'Member'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                u.password_hash ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {u.password_hash ? 'Active' : 'Invite pending'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3 justify-end">
                                <button onClick={() => { setEditingUser(u.id); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role) }}
                                  className="text-[12px] text-p-tertiary hover:text-p-text transition-colors font-medium">Edit</button>
                                <button onClick={() => deleteUser(u.id)}
                                  className="text-[12px] text-p-tertiary hover:text-p-error transition-colors font-medium">Remove</button>
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
            <div className="flex items-center justify-between mb-5">
              <p className="text-[12px] text-p-tertiary max-w-md leading-relaxed">
                Workflows define the approval chain. Each submission goes through steps in order.
              </p>
              <button onClick={() => setShowWfForm(v => !v)}
                className="flex items-center gap-1.5 bg-p-accent hover:bg-p-accent-h text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-all duration-150 shadow-sm hover:shadow-md">
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                New Workflow
              </button>
            </div>

            {showWfForm && (
              <div className="bg-p-surface border border-p-border rounded-2xl p-5 mb-5 shadow-card">
                <h3 className="font-semibold text-p-text text-[14px] mb-4">New Workflow</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Name *</label>
                    <input value={newWfName} onChange={e => setNewWfName(e.target.value)}
                      placeholder="e.g. Email Campaign Approval"
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-p-tertiary mb-1.5 uppercase tracking-wide">Description</label>
                    <input value={newWfDesc} onChange={e => setNewWfDesc(e.target.value)}
                      placeholder="What does this workflow cover?"
                      className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addWorkflow} disabled={addingWf || !newWfName.trim()}
                    className="bg-p-accent hover:bg-p-accent-h disabled:opacity-50 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all">
                    {addingWf ? 'Creating…' : 'Create & Configure Steps →'}
                  </button>
                  <button onClick={() => setShowWfForm(false)} className="text-[13px] text-p-tertiary hover:text-p-text px-3 py-2.5 transition-colors rounded-xl hover:bg-p-fill">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {loadingWf ? (
                <div className="bg-p-surface border border-p-border rounded-2xl p-10 text-center text-[13px] text-p-tertiary shadow-card">Loading…</div>
              ) : workflows.length === 0 ? (
                <div className="bg-p-surface border border-p-border rounded-2xl p-16 text-center shadow-card">
                  <div className="w-12 h-12 rounded-2xl bg-p-fill flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-tertiary">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <p className="text-[13px] text-p-tertiary">No workflows yet. Create one to define your approval chain.</p>
                </div>
              ) : workflows.map(wf => (
                <div key={wf.id} className="bg-p-surface border border-p-border rounded-2xl p-5 shadow-card hover:border-p-border-strong transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-bold text-p-text text-[15px]">{wf.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          wf.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-p-fill text-p-tertiary'
                        }`}>
                          {wf.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {wf.description && <p className="text-[12px] text-p-secondary mb-3">{wf.description}</p>}

                      {/* Steps */}
                      {wf.steps.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {wf.steps.map((step, i) => (
                            <div key={step.id} className="flex items-center gap-1.5">
                              {i > 0 && (
                                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-border flex-shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                </svg>
                              )}
                              <span className="bg-p-fill border border-p-border text-[11px] font-semibold text-p-text px-2.5 py-1 rounded-full">
                                {step.user?.name ?? 'Unassigned'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-p-quaternary italic">No steps configured yet.</p>
                      )}

                      <p className="text-[11px] text-p-quaternary mt-2.5">{wf.submission_count} submission{wf.submission_count !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Link href={`/admin/workflows/${wf.id}`}
                        className="text-[13px] font-semibold text-p-accent hover:text-p-accent-h transition-colors">
                        Edit steps
                      </Link>
                      <button onClick={() => toggleWorkflow(wf.id, wf.is_active)}
                        className="text-[12px] text-p-tertiary hover:text-p-text transition-colors">
                        {wf.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteWorkflow(wf.id, wf.name)}
                        className="text-[12px] text-p-tertiary hover:text-p-error transition-colors">
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
            <p className="text-[12px] text-p-tertiary mb-5">Pending email invitations. Members must accept before they can log in.</p>
            {invitations.length === 0 ? (
              <div className="bg-p-surface border border-p-border rounded-2xl p-12 text-center shadow-card">
                <p className="text-[13px] text-p-tertiary">No pending invitations. Use the Members tab to invite someone.</p>
              </div>
            ) : (
              <div className="bg-p-surface border border-p-border rounded-2xl overflow-hidden shadow-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-p-border bg-p-bg/60">
                      <th className="text-left text-[11px] font-semibold text-p-tertiary uppercase tracking-wide px-5 py-3">Email</th>
                      <th className="text-left text-[11px] font-semibold text-p-tertiary uppercase tracking-wide px-5 py-3">Role</th>
                      <th className="text-left text-[11px] font-semibold text-p-tertiary uppercase tracking-wide px-5 py-3">Expires</th>
                      <th className="px-5 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map(inv => (
                      <tr key={inv.id} className="border-b border-p-border last:border-0 hover:bg-p-bg/40 transition-colors">
                        <td className="px-5 py-4 text-[13px] font-medium text-p-text">{inv.email}</td>
                        <td className="px-5 py-4">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            inv.role === 'admin' ? 'bg-p-accent/10 text-p-accent' : 'bg-p-fill text-p-secondary'
                          }`}>{inv.role}</span>
                        </td>
                        <td className="px-5 py-4 text-[12px] text-p-tertiary">
                          {new Date(inv.expires_at) < new Date()
                            ? <span className="text-p-error">Expired</span>
                            : new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          }
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => revokeInvite(inv.id)}
                            className="text-[12px] text-p-tertiary hover:text-p-error transition-colors font-medium">
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
      </main>
    </div>
  )
}

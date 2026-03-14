'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/components/AuthProvider'

type Invitation = {
  id: string; email: string; role: string
  used: boolean; expires_at: string; created_at: string
}

type OrgInfo = { id: string; name: string; domain: string }

export default function SettingsPage() {
  const { user, refetch }    = useAuth()
  const [tab, setTab]        = useState<'profile' | 'notifications' | 'org'>('profile')

  // Profile
  const [name, setName]         = useState(user?.name ?? '')
  const [notifyEmail, setNotify] = useState(user?.notify_email ?? true)
  const [profileMsg, setProfileMsg] = useState('')

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg]         = useState('')

  // Org
  const [org, setOrg]               = useState<OrgInfo | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [orgName, setOrgName]         = useState('')
  const [orgDomain, setOrgDomain]     = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<'member' | 'admin'>('member')
  const [orgMsg, setOrgMsg]           = useState('')

  useEffect(() => {
    if (user?.name) setName(user.name)
    if (typeof user?.notify_email !== 'undefined') setNotify(user.notify_email)
  }, [user])

  useEffect(() => {
    if (tab === 'org' && user?.role === 'admin') {
      fetch('/api/org').then(r => r.json()).then(d => {
        if (d.org) {
          setOrg(d.org)
          setOrgName(d.org.name)
          setOrgDomain(d.org.domain)
        }
        setInvitations(d.invitations ?? [])
      })
    }
  }, [tab, user?.role])

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), notify_email: notifyEmail }),
    })
    if (res.ok) { setProfileMsg('Saved!'); refetch() }
    else { const d = await res.json(); setProfileMsg(d.error ?? 'Failed to save') }
    setTimeout(() => setProfileMsg(''), 3000)
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return }
    if (newPw.length < 8) { setPwMsg('Password must be at least 8 characters'); return }
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
    })
    const d = await res.json()
    setPwMsg(res.ok ? 'Password changed!' : (d.error ?? 'Failed to change password'))
    if (res.ok) { setCurrentPw(''); setNewPw(''); setConfirmPw('') }
    setTimeout(() => setPwMsg(''), 4000)
  }

  async function saveOrg(e: FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName, domain: orgDomain }),
    })
    const d = await res.json()
    if (res.ok && d.org) { setOrg(d.org); setOrgMsg('Saved!') }
    else setOrgMsg(d.error ?? 'Failed to save')
    setTimeout(() => setOrgMsg(''), 3000)
  }

  async function sendInvite(e: FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const d = await res.json()
    if (res.ok) {
      setOrgMsg('Invitation sent!')
      setInviteEmail('')
      // Refresh invitations
      fetch('/api/org').then(r => r.json()).then(d => setInvitations(d.invitations ?? []))
    } else {
      setOrgMsg(d.error ?? 'Failed to send invite')
    }
    setTimeout(() => setOrgMsg(''), 3000)
  }

  async function revokeInvite(id: string) {
    await fetch('/api/org', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: id }),
    })
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
    ...(user?.role === 'admin' ? [{ key: 'org', label: 'Organization' }] : []),
  ] as { key: typeof tab; label: string }[]

  return (
    <div className="flex-1 bg-p-bg min-h-screen">
      <main className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-p-text">Settings</h1>
          <p className="text-[15px] text-p-secondary mt-1.5">Manage your account and workspace preferences.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-p-fill rounded-2xl p-1 w-fit border border-p-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                tab === t.key ? 'bg-p-surface text-p-text shadow-sm border border-p-border' : 'text-p-secondary hover:text-p-text'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-p-surface rounded-3xl border border-p-border p-6">
              <h2 className="font-semibold text-[16px] text-p-text mb-5">Personal information</h2>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-p-accent flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    {user?.name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-[15px] text-p-text">{user?.name}</p>
                    <p className="text-[13px] text-p-secondary">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-p-fill border border-p-border text-[11px] font-semibold text-p-tertiary uppercase tracking-widest">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Display name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Email</label>
                  <input type="email" value={user?.email ?? ''} disabled
                    className="w-full bg-p-fill border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-tertiary cursor-not-allowed" />
                  <p className="text-[11px] text-p-quaternary mt-1">Email cannot be changed.</p>
                </div>

                {profileMsg && (
                  <p className={`text-[13px] font-medium ${profileMsg === 'Saved!' ? 'text-p-success' : 'text-p-error'}`}>{profileMsg}</p>
                )}

                <button type="submit"
                  className="bg-p-accent hover:bg-p-accent-h text-white font-semibold px-6 py-2.5 rounded-2xl transition-all shadow-accent text-[14px]">
                  Save changes
                </button>
              </form>
            </div>

            <div className="bg-p-surface rounded-3xl border border-p-border p-6">
              <h2 className="font-semibold text-[16px] text-p-text mb-5">Change password</h2>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Current password</label>
                  <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">New password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8}
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Confirm new password</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                </div>
                {pwMsg && (
                  <p className={`text-[13px] font-medium ${pwMsg.includes('!') ? 'text-p-success' : 'text-p-error'}`}>{pwMsg}</p>
                )}
                <button type="submit"
                  className="bg-p-nav hover:bg-p-accent text-white font-semibold px-6 py-2.5 rounded-2xl transition-all text-[14px]">
                  Change password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <div className="bg-p-surface rounded-3xl border border-p-border p-6">
            <h2 className="font-semibold text-[16px] text-p-text mb-5">Notification preferences</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-2xl border border-p-border hover:bg-p-fill transition-colors cursor-pointer">
                <div>
                  <p className="text-[14px] font-medium text-p-text">Email notifications</p>
                  <p className="text-[12px] text-p-secondary mt-0.5">Receive emails for task assignments and review requests</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${notifyEmail ? 'bg-p-accent' : 'bg-p-fill border border-p-border'}`}
                  onClick={() => setNotify(v => !v)}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${notifyEmail ? 'left-6' : 'left-1'}`} />
                </div>
              </label>

              {profileMsg && (
                <p className={`text-[13px] font-medium ${profileMsg === 'Saved!' ? 'text-p-success' : 'text-p-error'}`}>{profileMsg}</p>
              )}
              <button type="submit"
                className="bg-p-accent hover:bg-p-accent-h text-white font-semibold px-6 py-2.5 rounded-2xl transition-all shadow-accent text-[14px]">
                Save preferences
              </button>
            </form>
          </div>
        )}

        {/* Org Tab (admin only) */}
        {tab === 'org' && user?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-p-surface rounded-3xl border border-p-border p-6">
              <h2 className="font-semibold text-[16px] text-p-text mb-5">Organization settings</h2>
              <form onSubmit={saveOrg} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">Organization name</label>
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required
                    className="w-full bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-p-text mb-1.5">
                    Allowed email domain
                    <span className="ml-1 text-p-tertiary font-normal">(Google Workspace)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-p-quaternary text-[14px]">@</span>
                    <input type="text" value={orgDomain} onChange={e => setOrgDomain(e.target.value.replace('@', ''))}
                      className="w-full bg-p-bg border border-p-border rounded-2xl pl-8 pr-4 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                  </div>
                </div>
                {orgMsg && (
                  <p className={`text-[13px] font-medium ${orgMsg.includes('!') ? 'text-p-success' : 'text-p-error'}`}>{orgMsg}</p>
                )}
                <button type="submit"
                  className="bg-p-accent hover:bg-p-accent-h text-white font-semibold px-6 py-2.5 rounded-2xl transition-all shadow-accent text-[14px]">
                  Save organization
                </button>
              </form>
            </div>

            <div className="bg-p-surface rounded-3xl border border-p-border p-6">
              <h2 className="font-semibold text-[16px] text-p-text mb-5">Invite team member</h2>
              <form onSubmit={sendInvite} className="flex gap-3">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder={`colleague@${org?.domain || 'company.com'}`} required
                  className="flex-1 bg-p-bg border border-p-border rounded-2xl px-4 py-3 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition-all" />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                  className="bg-p-bg border border-p-border rounded-2xl px-3 py-3 text-[14px] text-p-text focus:outline-none focus:border-p-accent transition-all">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit"
                  className="bg-p-accent hover:bg-p-accent-h text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-accent text-[14px] flex-shrink-0">
                  Invite
                </button>
              </form>
            </div>

            {invitations.length > 0 && (
              <div className="bg-p-surface rounded-3xl border border-p-border p-6">
                <h2 className="font-semibold text-[16px] text-p-text mb-5">Pending invitations</h2>
                <div className="space-y-2">
                  {invitations.filter(i => !i.used).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-2xl border border-p-border bg-p-fill">
                      <div>
                        <p className="text-[14px] font-medium text-p-text">{inv.email}</p>
                        <p className="text-[11px] text-p-tertiary mt-0.5">
                          {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => revokeInvite(inv.id)}
                        className="text-[12px] font-semibold text-p-error hover:text-p-error px-3 py-1.5 rounded-xl hover:bg-p-error-soft transition-colors">
                        Revoke
                      </button>
                    </div>
                  ))}
                  {invitations.filter(i => !i.used).length === 0 && (
                    <p className="text-[13px] text-p-tertiary">No pending invitations.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

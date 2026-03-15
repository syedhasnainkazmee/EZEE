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

  // Reset
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting]       = useState(false)
  const [resetMsg, setResetMsg]         = useState('')

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

  async function resetWorkspace() {
    if (resetConfirm !== 'RESET') return
    setResetting(true)
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'RESET' }),
    })
    if (res.ok) {
      setResetMsg('Workspace data cleared.')
      setResetConfirm('')
    } else {
      const d = await res.json()
      setResetMsg(d.error ?? 'Reset failed')
    }
    setResetting(false)
    setTimeout(() => setResetMsg(''), 5000)
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

  const inputCls = "w-full bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text focus:outline-none focus:border-p-accent/60 transition-all"

  return (
    <div className="flex-1 bg-p-bg">
      <main className="max-w-3xl mx-auto px-8 lg:px-12 py-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-p-text leading-tight">Settings</h1>
          <p className="text-[15px] text-p-secondary mt-2.5">Manage your account and workspace preferences.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mb-10 bg-p-fill rounded-2xl p-1.5 w-fit border-2 border-p-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                tab === t.key ? 'bg-white text-p-text shadow-sm' : 'text-p-tertiary hover:text-p-secondary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
              <h2 className="font-bold text-[18px] text-p-text mb-6">Personal information</h2>
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-20 h-20 rounded-[2rem] bg-p-accent flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                    {user?.name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-bold text-[16px] text-p-text">{user?.name}</p>
                    <p className="text-[14px] text-p-secondary mt-0.5">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-p-fill border-2 border-p-border text-[11px] font-bold text-p-tertiary uppercase tracking-widest">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Display name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Email</label>
                  <input type="email" value={user?.email ?? ''} disabled
                    className="w-full bg-p-fill border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-tertiary cursor-not-allowed" />
                  <p className="text-[12px] text-p-quaternary mt-2">Email cannot be changed.</p>
                </div>

                {profileMsg && (
                  <p className={`text-[13px] font-bold ${profileMsg === 'Saved!' ? 'text-p-success' : 'text-p-error'}`}>{profileMsg}</p>
                )}

                <button type="submit"
                  className="bg-p-accent hover:bg-p-accent-h text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-accent text-[14px] hover:-translate-y-0.5 active:translate-y-0">
                  Save changes
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
              <h2 className="font-bold text-[18px] text-p-text mb-6">Change password</h2>
              <form onSubmit={changePassword} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Current password</label>
                  <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">New password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Confirm new password</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required className={inputCls} />
                </div>
                {pwMsg && (
                  <p className={`text-[13px] font-bold ${pwMsg.includes('!') ? 'text-p-success' : 'text-p-error'}`}>{pwMsg}</p>
                )}
                <button type="submit"
                  className="bg-p-nav hover:bg-p-accent text-white font-bold px-8 py-4 rounded-2xl transition-all text-[14px] hover:-translate-y-0.5 active:translate-y-0">
                  Change password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
            <h2 className="font-bold text-[18px] text-p-text mb-6">Notification preferences</h2>
            <form onSubmit={saveProfile} className="space-y-5">
              <label className="flex items-center justify-between p-5 rounded-3xl border-2 border-p-border hover:border-p-border-strong transition-colors cursor-pointer bg-p-bg/50">
                <div>
                  <p className="text-[15px] font-bold text-p-text">Email notifications</p>
                  <p className="text-[13px] text-p-secondary mt-1">Receive emails for task assignments and review requests</p>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ml-6 ${notifyEmail ? 'bg-p-accent' : 'bg-p-fill border-2 border-p-border'}`}
                  onClick={() => setNotify(v => !v)}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${notifyEmail ? 'left-7' : 'left-1'}`} />
                </div>
              </label>

              {profileMsg && (
                <p className={`text-[13px] font-bold ${profileMsg === 'Saved!' ? 'text-p-success' : 'text-p-error'}`}>{profileMsg}</p>
              )}
              <button type="submit"
                className="bg-p-accent hover:bg-p-accent-h text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-accent text-[14px] hover:-translate-y-0.5 active:translate-y-0">
                Save preferences
              </button>
            </form>
          </div>
        )}

        {/* Org Tab (admin only) */}
        {tab === 'org' && user?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
              <h2 className="font-bold text-[18px] text-p-text mb-6">Organization settings</h2>
              <form onSubmit={saveOrg} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">Organization name</label>
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">
                    Allowed email domain <span className="text-p-quaternary font-normal normal-case">(Google Workspace)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-p-quaternary text-[14px]">@</span>
                    <input type="text" value={orgDomain} onChange={e => setOrgDomain(e.target.value.replace('@', ''))}
                      className="w-full bg-p-bg border-2 border-p-border rounded-2xl pl-9 pr-5 py-3.5 text-[14px] text-p-text focus:outline-none focus:border-p-accent/60 transition-all" />
                  </div>
                </div>
                {orgMsg && (
                  <p className={`text-[13px] font-bold ${orgMsg.includes('!') ? 'text-p-success' : 'text-p-error'}`}>{orgMsg}</p>
                )}
                <button type="submit"
                  className="bg-p-accent hover:bg-p-accent-h text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-accent text-[14px] hover:-translate-y-0.5 active:translate-y-0">
                  Save organization
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
              <h2 className="font-bold text-[18px] text-p-text mb-6">Invite team member</h2>
              <form onSubmit={sendInvite} className="flex gap-3">
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder={`colleague@${org?.domain || 'company.com'}`} required
                  className="flex-1 bg-p-bg border-2 border-p-border rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-p-accent/60 transition-all" />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                  className="bg-p-bg border-2 border-p-border rounded-2xl px-4 py-3.5 text-[14px] font-semibold text-p-text focus:outline-none focus:border-p-accent/60 transition-all">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit"
                  className="bg-p-accent hover:bg-p-accent-h text-white font-bold px-6 py-3.5 rounded-2xl transition-all shadow-accent text-[14px] flex-shrink-0 hover:-translate-y-0.5 active:translate-y-0">
                  Invite
                </button>
              </form>
            </div>

            {invitations.length > 0 && (
              <div className="bg-white rounded-3xl border-2 border-transparent shadow-sm p-8">
                <h2 className="font-bold text-[18px] text-p-text mb-6">Pending invitations</h2>
                <div className="space-y-3">
                  {invitations.filter(i => !i.used).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-5 rounded-2xl border-2 border-p-border bg-p-bg/50">
                      <div>
                        <p className="text-[15px] font-semibold text-p-text">{inv.email}</p>
                        <p className="text-[12px] text-p-tertiary mt-1">
                          {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => revokeInvite(inv.id)}
                        className="text-[12px] font-bold text-p-error hover:text-white hover:bg-p-error px-4 py-2 rounded-xl transition-all border-2 border-p-error/30 hover:border-p-error">
                        Revoke
                      </button>
                    </div>
                  ))}
                  {invitations.filter(i => !i.used).length === 0 && (
                    <p className="text-[14px] text-p-tertiary">No pending invitations.</p>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-white rounded-3xl border-2 border-red-200 shadow-sm p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-error" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-p-text">Danger Zone</h2>
                  <p className="text-[13px] text-p-secondary mt-1">These actions are permanent and cannot be undone.</p>
                </div>
              </div>

              <div className="border-2 border-red-100 rounded-2xl p-6 bg-red-50/40">
                <p className="font-bold text-[15px] text-p-text mb-1">Reset workspace data</p>
                <p className="text-[13px] text-p-secondary mb-5">
                  Permanently deletes all submissions, designs, reviews, tasks, projects, and notifications.
                  Team members, workflows, and org settings are preserved.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-p-tertiary mb-2 uppercase tracking-widest">
                      Type <span className="text-p-error font-mono">RESET</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={resetConfirm}
                      onChange={e => setResetConfirm(e.target.value)}
                      placeholder="RESET"
                      className="w-full bg-white border-2 border-red-200 rounded-2xl px-5 py-3.5 text-[14px] text-p-text placeholder:text-p-quaternary focus:outline-none focus:border-red-400 transition-all font-mono"
                    />
                  </div>
                  {resetMsg && (
                    <p className={`text-[13px] font-bold ${resetMsg.includes('cleared') ? 'text-p-success' : 'text-p-error'}`}>{resetMsg}</p>
                  )}
                  <button
                    onClick={resetWorkspace}
                    disabled={resetting || resetConfirm !== 'RESET'}
                    className="bg-p-error hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3.5 rounded-2xl transition-all text-[14px] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {resetting ? 'Resetting…' : 'Reset workspace data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

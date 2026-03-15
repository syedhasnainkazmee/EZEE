'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/components/AuthProvider'

type Invitation = {
  id: string; email: string; role: string
  used: boolean; expires_at: string; created_at: string
}

type OrgInfo = { id: string; name: string; domain: string }

type Integration = {
  id: string
  name: string
  description: string
  category: string
  icon: React.ReactNode
  connected: boolean
  connectedAs?: string
}

export default function SettingsPage() {
  const { user, refetch }    = useAuth()
  const [tab, setTab]        = useState<'profile' | 'notifications' | 'org' | 'integrations'>('profile')

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

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Import design files directly from Google Drive and share approved assets.',
      category: 'Storage',
      connected: false,
      icon: (
        <svg viewBox="0 0 87.3 78" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      ),
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Link Figma frames directly to submissions and keep designs in sync.',
      category: 'Design',
      connected: false,
      icon: (
        <svg viewBox="0 0 38 57" width="20" height="24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1abcfe"/>
          <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0acf83"/>
          <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#ff7262"/>
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#f24e1e"/>
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#a259ff"/>
        </svg>
      ),
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get review updates and approvals posted directly to your Slack channels.',
      category: 'Communication',
      connected: false,
      icon: (
        <svg viewBox="0 0 122.8 122.8" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z" fill="#e01e5a"/>
          <path d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a"/>
          <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z" fill="#36c5f0"/>
          <path d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9H45.2z" fill="#36c5f0"/>
          <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z" fill="#2eb67d"/>
          <path d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d"/>
          <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z" fill="#ecb22e"/>
          <path d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e"/>
        </svg>
      ),
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Attach Notion pages to projects and tasks for detailed documentation.',
      category: 'Productivity',
      connected: false,
      icon: (
        <svg viewBox="0 0 100 100" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 7.5C6 4.46 8.46 2 11.5 2h65.17c1.59 0 3.12.65 4.23 1.8l13.33 13.83c1.06 1.1 1.65 2.57 1.65 4.1V92.5c0 3.04-2.46 5.5-5.5 5.5H11.5C8.46 98 6 95.54 6 92.5V7.5z" fill="white"/>
          <path d="M11.5 2C8.46 2 6 4.46 6 7.5v85c0 3.04 2.46 5.5 5.5 5.5H90.38c3.04 0 5.5-2.46 5.5-5.5V21.73c0-1.53-.59-3-1.65-4.1L80.9 3.8A5.97 5.97 0 0 0 76.67 2H11.5zm58.57 8.37c-1-1.04-2.67-.32-2.67 1.11V21a3 3 0 0 0 3 3h8.98c1.37 0 2.1-1.59 1.18-2.63L70.07 10.37z" fill="black" fillOpacity=".05"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M27.63 22.43c-2.5.17-4.3.33-5.93 1.38-1.62 1.04-2.6 2.56-2.6 4.62v.13c0 2.33 1.04 3.76 3.02 5.2 0 0 .05.03.13.08l28.67 20.3c.97.69 1.63 1.06 2.45 1.1.8.03 1.56-.27 2.64-1.02l19.78-14.16c.43-.31.73-.5 1.1-.64.37-.14.77-.18 1.4-.18H80v34.3c0 2.08-1.69 3.77-3.77 3.77H23.77A3.77 3.77 0 0 1 20 73.54V26.43c0-1.69 1.12-3.18 2.73-3.63.98-.27 2.7-.47 4.9-.37zm26.34 4.82L27.46 45.7l-.03-.03-3.35-2.53 26.85-18.3 3.04 2.4z" fill="black"/>
        </svg>
      ),
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      description: 'Browse and attach files from your Dropbox folders to any submission.',
      category: 'Storage',
      connected: false,
      icon: (
        <svg viewBox="0 0 43.8 40" width="24" height="22" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.1 0L0 8.3l9 7.3-13.1 8.2L9 32.1l13.2-8.3 13.1 8.3 13-8.3-13-8.2 8.9-7.3L31.9 0 21.9 7.6z" fill="none"/>
          <path d="M13.1 0L0 8.3l9 7.3-9 5.7 13.1 8.2 9-5.9 9.1 5.9 13.1-8.2-9.1-5.7 9-7.3L31.9 0 21.9 7.6z" fill="#0061ff"/>
          <path d="M13.1 31.5l3.4 2.1 5.4 3.4 5.4-3.4 3.4-2.1-3.4-2.1-5.4 3.3-5.4-3.3z" fill="#0061ff"/>
        </svg>
      ),
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync tasks and track design tickets alongside your engineering sprints.',
      category: 'Project Management',
      connected: false,
      icon: (
        <svg viewBox="0 0 32 32" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="jira-a" x1="98%" x2="58%" y1="0.2%" y2="40.9%">
              <stop offset="0%" stopColor="#0052cc"/>
              <stop offset="100%" stopColor="#2684ff"/>
            </linearGradient>
            <linearGradient id="jira-b" x1="2%" x2="42%" y1="99.8%" y2="59.1%">
              <stop offset="0%" stopColor="#0052cc"/>
              <stop offset="100%" stopColor="#2684ff"/>
            </linearGradient>
          </defs>
          <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0z" fill="#2684ff"/>
          <path d="M15.955 7.994l-7.961 7.961 7.961 7.962 7.961-7.962z" fill="url(#jira-a)"/>
          <path d="M10.016 13.933L16 7.994l5.984 5.939L16 19.917z" fill="url(#jira-b)"/>
        </svg>
      ),
    },
  ])

  // Load connected state from API on mount
  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.ok ? r.json() : { integrations: [] })
      .then(({ integrations: connected }: { integrations: { tool_id: string }[] }) => {
        const connectedIds = new Set(connected.map((c: { tool_id: string }) => c.tool_id))
        setIntegrations(prev => prev.map(i => ({
          ...i,
          connected: connectedIds.has(i.id),
          connectedAs: connectedIds.has(i.id) ? user?.email : undefined,
        })))
      })
  }, [user?.email])

  async function toggleIntegration(id: string) {
    const item = integrations.find(i => i.id === id)
    if (!item) return
    if (item.connected) {
      await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: id }),
      })
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: false, connectedAs: undefined } : i))
    } else {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: id }),
      })
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: true, connectedAs: user?.email } : i))
    }
  }

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
    { key: 'integrations', label: 'Integrations' },
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

        {/* Integrations Tab */}
        {tab === 'integrations' && (
          <div className="space-y-8">
            <div>
              <p className="text-[14px] text-p-secondary">
                Connect your favourite tools to streamline your design review workflow.
              </p>
            </div>

            {/* Group by category */}
            {['Storage', 'Design', 'Communication', 'Productivity', 'Project Management'].map(category => {
              const items = integrations.filter(i => i.category === category)
              if (items.length === 0) return null
              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold text-p-tertiary uppercase tracking-widest">{category}</span>
                    <div className="flex-1 h-px bg-p-border" />
                  </div>
                  <div className="space-y-3">
                    {items.map(integration => (
                      <div
                        key={integration.id}
                        className="bg-white rounded-3xl border-2 shadow-sm p-6 flex items-center gap-5 transition-all"
                        style={{ borderColor: integration.connected ? 'rgba(14,165,114,0.25)' : 'transparent' }}
                      >
                        {/* Icon */}
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2"
                          style={{ background: '#F4F2EE', borderColor: '#E5E0D8' }}
                        >
                          {integration.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1">
                            <p className="text-[15px] font-bold text-p-text">{integration.name}</p>
                            {integration.connected && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                style={{ background: 'rgba(14,165,114,0.1)', color: '#0EA572' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-p-secondary leading-relaxed">{integration.description}</p>
                          {integration.connected && integration.connectedAs && (
                            <p className="text-[11.5px] text-p-tertiary mt-1.5">
                              Connected as <span className="font-semibold text-p-secondary">{integration.connectedAs}</span>
                            </p>
                          )}
                        </div>

                        {/* Action */}
                        <div className="flex-shrink-0">
                          {integration.connected ? (
                            <button
                              onClick={() => toggleIntegration(integration.id)}
                              className="px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all border-2"
                              style={{ color: '#DC3545', borderColor: 'rgba(220,53,69,0.25)', background: 'rgba(220,53,69,0.05)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,53,69,0.1)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,53,69,0.05)' }}
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleIntegration(integration.id)}
                              className="px-5 py-2.5 rounded-2xl text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                              style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 4px 12px -3px rgba(212,81,46,0.4)' }}
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Request integration */}
            <div className="rounded-3xl border-2 border-dashed border-p-border p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-p-fill flex items-center justify-center mb-4">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} className="text-p-tertiary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </div>
              <p className="text-[15px] font-bold text-p-text mb-1">Need another integration?</p>
              <p className="text-[13px] text-p-secondary">Let us know which tool you&apos;d like to connect and we&apos;ll add it.</p>
              <button className="mt-5 px-6 py-2.5 rounded-2xl text-[13px] font-bold border-2 border-p-border text-p-secondary hover:border-p-border-strong hover:text-p-text transition-all">
                Request an integration
              </button>
            </div>
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

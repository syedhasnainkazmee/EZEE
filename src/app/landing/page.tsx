'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// Placeholder colors for when real images aren't loaded yet
const PLACEHOLDER_COLORS = ['#D4512E','#8B5CF6','#3B82F6','#0EA572','#F59E0B']

// ─── Animations ───────────────────────────────────────────────────────────────
const CSS = `
  @keyframes lp-up   { from { opacity:0; transform:translateY(32px) } to { opacity:1; transform:translateY(0) } }
  @keyframes lp-left { from { opacity:0; transform:translateX(-32px)} to { opacity:1; transform:translateX(0) } }
  @keyframes lp-right{ from { opacity:0; transform:translateX(32px) } to { opacity:1; transform:translateX(0) } }
  @keyframes lp-scale{ from { opacity:0; transform:scale(0.96)      } to { opacity:1; transform:scale(1)     } }
  @keyframes float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes float-toast{ 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-6px) rotate(-1deg)} }
  @keyframes marquee  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes dot-pulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
  @keyframes badge-pop{ 0%{opacity:0;transform:scale(.8) translateY(8px)} 100%{opacity:1;transform:scale(1) translateY(0)} }

  .lp-up   { opacity:0 }
  .lp-left { opacity:0 }
  .lp-right{ opacity:0 }
  .lp-scale{ opacity:0 }
  .lp-up.in   { animation:lp-up    .75s cubic-bezier(.16,1,.3,1) forwards }
  .lp-left.in { animation:lp-left  .75s cubic-bezier(.16,1,.3,1) forwards }
  .lp-right.in{ animation:lp-right .75s cubic-bezier(.16,1,.3,1) forwards }
  .lp-scale.in{ animation:lp-scale .6s  cubic-bezier(.16,1,.3,1) forwards }
  .d1{animation-delay:.08s} .d2{animation-delay:.18s} .d3{animation-delay:.3s}
  .d4{animation-delay:.44s} .d5{animation-delay:.58s} .d6{animation-delay:.72s}

  * { box-sizing:border-box; margin:0; padding:0 }
  a { text-decoration:none; color:inherit }
  ::selection { background:#D4512E22 }
`

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.lp-up,.lp-left,.lp-right,.lp-scale').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useCount(to: number, active: boolean) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf: number
    const t0 = performance.now()
    const dur = 1800
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      setV(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, to])
  return v
}

// ─── Real App UI Components ───────────────────────────────────────────────────

/** Exact replica of the app's sidebar */
function AppSidebar({ active = 'submissions' }: { active?: string }) {
  const items = [
    { id: 'dashboard',   label: 'Dashboard',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'submissions', label: 'Submissions',   icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
    { id: 'tasks',       label: 'Tasks',         icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'reviews',     label: 'Reviews',       icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { id: 'library',     label: 'Library',       icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ]
  return (
    <div style={{ width: 200, background: '#100F0D', height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/WhiteLogo.png" alt="EZEE" style={{ height: 18, objectFit: 'contain' }} />
      </div>
      {/* New Request */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div style={{ background: 'linear-gradient(135deg,#D4512E,#C04428)', borderRadius: 12, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'white', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>+</span> New Request
        </div>
      </div>
      {/* Nav */}
      <div style={{ flex: 1, padding: '4px 8px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 8px 6px' }}>Workspace</div>
        {items.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 10, marginBottom: 1,
            background: active === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: active === item.id ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)',
            fontSize: 11, fontWeight: 600, position: 'relative',
          }}>
            {active === item.id && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 2, height: 16, background: '#D4512E', borderRadius: 1 }} />}
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: active === item.id ? '#D4512E' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </div>
        ))}
      </div>
      {/* User row */}
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#D4512E,#FF8A65)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0 }}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Minhal K.</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>Admin</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Status badge matching the real app */
function StatusBadge({ status }: { status: 'approved' | 'in_review' | 'changes_requested' | 'draft' }) {
  const map = {
    approved:           { label: 'Approved',          bg: 'rgba(14,165,114,0.1)', color: '#0EA572', border: 'rgba(14,165,114,0.2)' },
    in_review:          { label: 'In Review',         bg: 'rgba(245,158,11,0.1)', color: '#D97706', border: 'rgba(245,158,11,0.2)' },
    changes_requested:  { label: 'Revisions',         bg: 'rgba(239,68,68,0.08)', color: '#DC2626', border: 'rgba(239,68,68,0.15)' },
    draft:              { label: 'Draft',              bg: 'rgba(0,0,0,0.04)',     color: '#9E9892', border: 'rgba(0,0,0,0.08)' },
  }
  const s = map[status]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

/** The hero app screen — full app with sidebar + submission review */
function HeroAppScreen({ imgs }: { imgs: string[] }) {
  const labels = ['A','B','C','D']
  return (
    <div style={{ animation: 'float-slow 8s ease-in-out infinite', transformOrigin: 'center' }}>
      {/* Browser frame */}
      <div style={{
        background: '#FDFCFB',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 32px 80px -16px rgba(28,25,23,0.22), 0 0 0 1px rgba(28,25,23,0.08)',
        width: '100%',
        maxWidth: 680,
      }}>
        {/* Chrome bar */}
        <div style={{ background: '#F0EDEA', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #E5E0D8' }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
          <div style={{ flex: 1, margin: '0 10px', background: 'rgba(0,0,0,0.06)', borderRadius: 5, height: 18, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0EA572', opacity: 0.8 }} />
            <span style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.35)', fontFamily: 'monospace' }}>ezee.design/submissions</span>
          </div>
        </div>

        {/* App body */}
        <div style={{ display: 'flex', height: 420 }}>
          <AppSidebar active="submissions" />

          {/* Main content — submission review page */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F4F2EE' }}>
            {/* Page header */}
            <div style={{ padding: '14px 18px', background: '#FDFCFB', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1917' }}>Q4 Campaign Ads — v2</div>
                <div style={{ fontSize: 10, color: '#9E9892', marginTop: 1 }}>Social Media Campaign · 4 designs</div>
              </div>
              <StatusBadge status="in_review" />
            </div>

            {/* Split: designs left, review chain right */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Design grid */}
              <div style={{ flex: 1, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start', overflowY: 'hidden' }}>
                {labels.map((label, i) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #E5E0D8', position: 'relative', aspectRatio: '3/4' }}>
                    {imgs[i] ? (
                      <img src={imgs[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${PLACEHOLDER_COLORS[i]}22, ${PLACEHOLDER_COLORS[i]}44)` }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 8, fontWeight: 800, color: 'white', background: '#D4512E', padding: '1px 5px', borderRadius: 3 }}>{label}</div>
                    {i === 0 && (
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: '#D4512E', fontSize: 8, color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Review chain */}
              <div style={{ width: 176, padding: '12px 10px', borderLeft: '1px solid #E5E0D8', background: '#FDFCFB', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9E9892', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Review Chain</div>
                {[
                  { name: 'Minhal K.', role: 'Creative',  status: 'approved' as const },
                  { name: 'Meeran A.', role: 'Brand',     status: 'in_review' as const },
                  { name: 'Daniyal S.', role: 'Final',    status: 'draft' as const },
                ].map((r, i) => (
                  <div key={r.name} style={{ padding: '8px 8px', borderRadius: 8, background: r.status === 'approved' ? 'rgba(14,165,114,0.05)' : r.status === 'in_review' ? 'rgba(212,81,46,0.05)' : '#F4F2EE', border: `1px solid ${r.status === 'approved' ? 'rgba(14,165,114,0.15)' : r.status === 'in_review' ? 'rgba(212,81,46,0.15)' : '#E5E0D8'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg, ${['#D4512E','#8B5CF6','#3B82F6'][i]}40, ${['#D4512E','#8B5CF6','#3B82F6'][i]}20)`, border: `1.5px solid ${['#D4512E','#8B5CF6','#3B82F6'][i]}50`, fontSize: 9, fontWeight: 800, color: ['#D4512E','#8B5CF6','#3B82F6'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.name[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1C1917' }}>{r.name}</div>
                        <div style={{ fontSize: 8.5, color: '#9E9892' }}>{r.role}</div>
                      </div>
                      {r.status === 'approved' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0EA572" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                      {r.status === 'in_review' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ padding: '7px', borderRadius: 8, background: '#0EA572', color: 'white', fontSize: 10, fontWeight: 700, textAlign: 'center' }}>✓ Approve</div>
                  <div style={{ padding: '7px', borderRadius: 8, background: '#F4F2EE', border: '1px solid #E5E0D8', color: '#6B6560', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>Request Changes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating approval toast */}
      <div style={{
        position: 'absolute', bottom: -20, left: -24,
        background: '#FDFCFB', border: '1px solid #E5E0D8',
        borderRadius: 12, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 24px rgba(28,25,23,0.12)',
        animation: 'float-toast 5s ease-in-out infinite',
        animationDelay: '1s',
        zIndex: 10,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0EA572,#059952)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1917' }}>Step 1 approved</div>
          <div style={{ fontSize: 10.5, color: '#9E9892', marginTop: 1 }}>Minhal K. · Creative review</div>
        </div>
      </div>
    </div>
  )
}

/** The library screen */
function LibraryScreen({ items }: { items: { thumbnail: string | null; title: string; tags: string[] }[] }) {
  const cards = items.slice(0, 3)
  return (
    <div style={{
      background: '#FDFCFB', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 24px 60px -12px rgba(28,25,23,0.18), 0 0 0 1px rgba(28,25,23,0.07)',
    }}>
      {/* Chrome */}
      <div style={{ background: '#F0EDEA', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5, borderBottom: '1px solid #E5E0D8' }}>
        {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, margin: '0 8px', background: 'rgba(0,0,0,0.05)', borderRadius: 4, height: 16, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>ezee.design/library</span>
        </div>
      </div>

      <div style={{ display: 'flex', height: 360 }}>
        <AppSidebar active="library" />
        <div style={{ flex: 1, background: '#F4F2EE', padding: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1C1917', fontFamily: "'Fraunces', serif" }}>Approved Library</div>
              <div style={{ fontSize: 10, color: '#9E9892', marginTop: 1 }}>{items.length} approved assets</div>
            </div>
          </div>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {['All', 'Banner', 'Instagram Story', 'Email Header'].map((tag, i) => (
              <div key={tag} style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: i === 0 ? 'rgba(212,81,46,0.1)' : '#FDFCFB', border: `1px solid ${i === 0 ? 'rgba(212,81,46,0.3)' : '#E5E0D8'}`, color: i === 0 ? '#D4512E' : '#6B6560' }}>{tag}</div>
            ))}
          </div>
          {/* 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {(cards.length > 0 ? cards : [
              { thumbnail: null, title: 'Campaign Ad', tags: ['Banner'] },
              { thumbnail: null, title: 'Social Story', tags: ['Instagram Story'] },
              { thumbnail: null, title: 'Email Header', tags: ['Email Header'] },
            ]).map((c, i) => (
              <div key={i} style={{ background: '#FDFCFB', borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E0D8' }}>
                <div style={{ height: 80, overflow: 'hidden' }}>
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${PLACEHOLDER_COLORS[i]}22, ${PLACEHOLDER_COLORS[i]}55)` }} />
                  )}
                </div>
                <div style={{ padding: '7px 8px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1C1917', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 8.5, color: '#D4512E', background: 'rgba(212,81,46,0.08)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{c.tags[0] ?? 'Design'}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#0EA572' }}>Drive →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type LibraryItem = { thumbnail: string | null; title: string; tags: string[] }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled]         = useState(false)
  const [statsOn, setStatsOn]           = useState(false)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const statsRef = useRef<HTMLDivElement>(null)

  useReveal()

  useEffect(() => {
    fetch('/api/library')
      .then(r => r.json())
      .then(d => setLibraryItems((d.items ?? []).slice(0, 5)))
      .catch(() => {/* silently fall back to placeholders */})
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsOn(true) }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  const c1 = useCount(500, statsOn)
  const c2 = useCount(3,   statsOn)
  const c3 = useCount(12,  statsOn)

  return (
    <div style={{ background: '#F4F2EE', color: '#1C1917', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <style>{CSS}</style>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 48px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(244,242,238,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid #E5E0D8' : '1px solid transparent',
        transition: 'all 0.35s ease',
      }}>
        <img src="/BlackLogo.png" alt="EZEE" style={{ height: 22, objectFit: 'contain' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {['Features', 'How it works', 'Library'].map(label => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g,'-')}`}
              style={{ fontSize: 14, fontWeight: 500, color: '#6B6560', transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#1C1917'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B6560'}
            >{label}</a>
          ))}
        </div>

        <Link href="/login" style={{
          padding: '9px 22px', borderRadius: 100,
          background: '#1C1917', color: '#FDFCFB',
          fontSize: 13.5, fontWeight: 700,
          transition: 'all .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#D4512E' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1C1917' }}
        >
          Get started
        </Link>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px 64px 80px', maxWidth: 1360, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'center', width: '100%' }}>

          {/* Left copy */}
          <div>
            {/* Eyebrow */}
            <div className="lp-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28, padding: '6px 12px', background: '#FDFCFB', border: '1px solid #E5E0D8', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#6B6560', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0EA572', animation: 'dot-pulse 2s ease-in-out infinite' }} />
              Design reviews, handled.
            </div>

            <h1 className="lp-up d1" style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(44px, 5vw, 76px)',
              fontWeight: 900, lineHeight: 1.0,
              letterSpacing: '-0.03em',
              color: '#1C1917',
              marginBottom: 24,
            }}>
              Stop losing<br />
              designs in<br />
              <span style={{ color: '#D4512E' }}>email threads.</span>
            </h1>

            <p className="lp-up d2" style={{ fontSize: 17, color: '#6B6560', lineHeight: 1.7, marginBottom: 40, maxWidth: 400 }}>
              EZEE gives your design team a structured review workflow — submit, review, annotate, approve, and deliver. One place. Zero chaos.
            </p>

            <div className="lp-up d3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 100,
                background: '#D4512E', color: '#fff',
                fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 20px rgba(212,81,46,0.3)',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(212,81,46,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(212,81,46,0.3)' }}
              >
                Start for free
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              <span style={{ fontSize: 13, color: '#9E9892' }}>No credit card required</span>
            </div>

            {/* Proof strip */}
            <div className="lp-up d4" style={{ display: 'flex', gap: 28, marginTop: 52, paddingTop: 40, borderTop: '1px solid #E5E0D8' }}>
              {[{ n: '500+', l: 'submissions' }, { n: '3×', l: 'faster approvals' }, { n: '100%', l: 'audit trail' }].map(s => (
                <div key={s.n}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 900, color: '#1C1917', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: '#9E9892', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — real app screen */}
          <div className="lp-right d1" style={{ position: 'relative' }}>
            <HeroAppScreen imgs={libraryItems.map(i => i.thumbnail ?? '')} />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #E5E0D8', borderBottom: '1px solid #E5E0D8', padding: '14px 0', overflow: 'hidden', background: '#FDFCFB' }}>
        <div style={{ display: 'flex', animation: 'marquee 30s linear infinite', width: 'max-content' }}>
          {[...Array(2)].flatMap(() =>
            ['Multi-step Workflows', 'Annotation Pins', 'Google Drive Sync', 'Approved Library', 'Real-time Status', 'Background Uploads', 'Version Tracking', 'Email Notifications', 'Role-based Access'].map((item, i) => (
              <div key={`${item}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 40, whiteSpace: 'nowrap' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#D4512E', opacity: 0.5, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9E9892', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── THE STORY: HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '120px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="lp-up" style={{ marginBottom: 72 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#1C1917', lineHeight: 1.05, maxWidth: 540 }}>
            From first draft to final delivery.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[
            {
              num: '01', title: 'Designer submits.',
              body: 'Upload your files, add context, pick an approval workflow. Files upload in the background the second you drag them in — no waiting.',
              detail: 'Supports PNG, JPG, WEBP · Full quality preserved · Up to 15 variations',
              side: <div style={{ background: '#FDFCFB', borderRadius: 14, border: '1px solid #E5E0D8', padding: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9E9892', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>New Request</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', marginBottom: 4 }}>Emporia Q4 Ads</div>
                <div style={{ fontSize: 11, color: '#9E9892', marginBottom: 12 }}>Approval Workflow: Full Review Chain</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[libraryItems[0]?.thumbnail, libraryItems[1]?.thumbnail].map((src, i) => (
                    <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E0D8', aspectRatio: '3/4', position: 'relative' }}>
                      {src ? (
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${PLACEHOLDER_COLORS[i]}22, ${PLACEHOLDER_COLORS[i]}55)` }} />
                      )}
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#0EA572', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="8" height="8" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: '#D4512E', color: 'white', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>Send for Review →</div>
              </div>,
            },
            {
              num: '02', title: 'Team reviews — their way.',
              body: 'Each reviewer gets a magic link by email. They open it, see the designs, click anywhere to leave pinned annotations, and approve or request changes. No login needed.',
              detail: 'Numbered annotation pins · Inline comments · Multi-step chain',
              side: <div style={{ background: '#FDFCFB', borderRadius: 14, border: '1px solid #E5E0D8', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1C1917' }}>Emporia Q4 Ads</span>
                  <StatusBadge status="in_review" />
                </div>
                <div style={{ padding: 12, position: 'relative' }}>
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E0D8', position: 'relative', marginBottom: 10 }}>
                    {libraryItems[0]?.thumbnail ? (
                      <img src={libraryItems[0].thumbnail} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: 120, background: `linear-gradient(135deg, ${PLACEHOLDER_COLORS[0]}22, ${PLACEHOLDER_COLORS[0]}55)` }} />
                    )}
                    <div style={{ position: 'absolute', top: '30%', left: '60%', width: 20, height: 20, borderRadius: '50% 50% 50% 0', background: '#D4512E', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 900, boxShadow: '0 2px 8px rgba(212,81,46,0.4)' }}>
                      <span style={{ transform: 'rotate(45deg)' }}>1</span>
                    </div>
                    <div style={{ position: 'absolute', top: '55%', left: '25%', width: 20, height: 20, borderRadius: '50% 50% 50% 0', background: '#D4512E', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 900, boxShadow: '0 2px 8px rgba(212,81,46,0.4)' }}>
                      <span style={{ transform: 'rotate(45deg)' }}>2</span>
                    </div>
                  </div>
                  <div style={{ background: '#F4F2EE', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#D4512E', fontSize: 8, color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>1</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#1C1917' }}>Meeran A.</div>
                      <div style={{ fontSize: 10, color: '#6B6560', marginTop: 1 }}>Check the contrast on the headline — hard to read on orange</div>
                    </div>
                  </div>
                </div>
              </div>,
            },
            {
              num: '03', title: 'Approved. Delivered automatically.',
              body: 'Once all steps sign off, the designs go straight to Google Drive — organized by submission and task. The library updates. The team gets notified. Nothing falls through.',
              detail: 'Auto-organized Drive folders · In-app + email alerts · Permanent audit trail',
              side: <div>
                <div style={{ background: '#FDFCFB', borderRadius: 14, border: '1px solid #E5E0D8', padding: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1C1917' }}>Emporia Q4 Ads</span>
                    <StatusBadge status="approved" />
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(14,165,114,0.07)', border: '1px solid rgba(14,165,114,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0EA572', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0EA572' }}>All steps approved</div>
                      <div style={{ fontSize: 10, color: '#6B6560', marginTop: 1 }}>Uploading to Google Drive…</div>
                    </div>
                  </div>
                </div>
                <div style={{ background: '#FDFCFB', borderRadius: 14, border: '1px solid #E5E0D8', padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10, animation: 'badge-pop .6s ease .4s both' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(14,165,114,0.08)', border: '1px solid rgba(14,165,114,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="14" viewBox="0 0 87 78" fill="none"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0EA572"/><path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 49.5C.4 50.9 0 52.45 0 54h27.5l16.15-29z" fill="#0EA572"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.65 7.9 12.15z" fill="#0EA572"/><path d="M43.65 25L57.4 1.2C56.05.43 54.55 0 52.95 0H34.35c-1.6 0-3.1.43-4.45 1.2L43.65 25z" fill="#0EA572"/><path d="M59.8 54H27.5L13.75 77.8c1.35.77 2.85 1.2 4.45 1.2h50.9c1.6 0 3.1-.43 4.45-1.2L59.8 54z" fill="#0EA572"/><path d="M73.4 27L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 29H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 27z" fill="#0EA572"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1C1917' }}>Delivered to Google Drive</div>
                    <div style={{ fontSize: 10, color: '#6B6560', marginTop: 1 }}>4 files · /Emporia/Q4 Campaign</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0EA572' }}>Open →</span>
                </div>
              </div>,
            },
          ].map((step, i) => (
            <div key={step.num} className={i % 2 === 0 ? 'lp-up' : 'lp-up'} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center',
              padding: '64px 0',
              borderTop: i > 0 ? '1px solid #E5E0D8' : 'none',
            }}>
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 96, fontWeight: 900, color: 'rgba(0,0,0,0.05)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: -20, userSelect: 'none' }}>{step.num}</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#1C1917', marginBottom: 16, lineHeight: 1.1 }}>{step.title}</h3>
                <p style={{ fontSize: 16, color: '#6B6560', lineHeight: 1.7, marginBottom: 20 }}>{step.body}</p>
                <div style={{ fontSize: 12, color: '#9E9892', padding: '10px 14px', background: '#FDFCFB', border: '1px solid #E5E0D8', borderRadius: 8, display: 'inline-block' }}>{step.detail}</div>
              </div>
              <div style={{ order: i % 2 === 0 ? 1 : 0 }}>{step.side}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIBRARY SHOWCASE ─────────────────────────────────────────── */}
      <section id="library" style={{ padding: '80px 64px 120px', background: '#FDFCFB', borderTop: '1px solid #E5E0D8', borderBottom: '1px solid #E5E0D8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="lp-up" style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Approved Library</div>
              <h2 className="lp-up d1" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(30px, 3.5vw, 48px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#1C1917', marginBottom: 18, lineHeight: 1.08 }}>
                Every approved asset, always findable.
              </h2>
              <p className="lp-up d2" style={{ fontSize: 16, color: '#6B6560', lineHeight: 1.7, marginBottom: 28 }}>
                Social leads and content teams browse a searchable gallery of everything that ever got approved — tagged by content type, linked directly to Google Drive.
              </p>
              <div className="lp-up d3" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Filter by content type: Story, Banner, Email, Ad', 'One click to open the Google Drive folder', 'Full history — every version, every reviewer'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#6B6560' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(14,165,114,0.1)', border: '1px solid rgba(14,165,114,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="8" height="8" fill="none" stroke="#0EA572" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-right d1">
              <LibraryScreen items={libraryItems} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ padding: '100px 64px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
          {[
            { val: `${c1}+`, label: 'Designs reviewed through EZEE' },
            { val: `${c2}×`,  label: 'Faster than email-based review' },
            { val: `${c3}h`,  label: 'Average hours to full approval' },
          ].map((s, i) => (
            <div key={s.label} style={{ textAlign: 'center', padding: '0 32px', borderRight: i < 2 ? '1px solid #E5E0D8' : 'none' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 72, fontWeight: 900, letterSpacing: '-0.04em', color: '#1C1917', lineHeight: 1 }}>
                {s.val}
              </div>
              <div style={{ fontSize: 14, color: '#9E9892', marginTop: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 64px 120px', background: '#FDFCFB', borderTop: '1px solid #E5E0D8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="lp-up" style={{ marginBottom: 60 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#1C1917', marginBottom: 8 }}>Built for teams who ship.</h2>
            <p style={{ fontSize: 16, color: '#9E9892' }}>Everything you need, nothing you don't.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, border: '1px solid #E5E0D8', borderRadius: 16, overflow: 'hidden' }}>
            {[
              { icon: '⚡', title: 'Real-time status', body: 'Live updates push the moment a reviewer acts. No refresh, no chasing.' },
              { icon: '📁', title: 'Background uploads', body: 'Files upload as you add them. Hit submit in seconds, not minutes.' },
              { icon: '📌', title: 'Annotation pins', body: 'Click on any pixel. Leave a pinned comment. Designers know exactly what to fix.' },
              { icon: '🔄', title: 'Version tracking', body: 'Every revision stored. Compare V1 to V4 side by side with full context.' },
              { icon: '✉️', title: 'Smart notifications', body: 'Reviewers emailed when it\'s their turn. Magic links — no login required.' },
              { icon: '🔒', title: 'Role-based access', body: 'Admins configure workflows. Members submit. Reviewers get magic links.' },
            ].map((f, i) => (
              <div key={f.title} className="lp-scale" style={{
                padding: '32px 28px', background: '#FDFCFB',
                borderRight: (i + 1) % 3 !== 0 ? '1px solid #E5E0D8' : 'none',
                borderBottom: i < 3 ? '1px solid #E5E0D8' : 'none',
                transition: 'background .2s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F2EE'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FDFCFB'}
              >
                <div style={{ fontSize: 24, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13.5, color: '#6B6560', lineHeight: 1.65 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 64px', background: '#100F0D', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle warm glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,81,46,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <img src="/WhiteLogo.png" alt="EZEE" style={{ height: 28, objectFit: 'contain', marginBottom: 40, opacity: 0.8 }} />
          <h2 className="lp-up" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FDFCFB', lineHeight: 1.0, marginBottom: 20 }}>
            Your designs deserve better than an inbox.
          </h2>
          <p className="lp-up d1" style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 44 }}>
            Set up your first workflow in minutes. Your team will wonder how they ever approved anything without it.
          </p>
          <div className="lp-up d2" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{
              padding: '14px 32px', borderRadius: 100,
              background: '#D4512E', color: 'white', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 24px rgba(212,81,46,0.4)',
              transition: 'all .2s', display: 'inline-block',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(212,81,46,0.5)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(212,81,46,0.4)' }}
            >
              Get started — it's free
            </Link>
            <Link href="/login" style={{
              padding: '14px 28px', borderRadius: 100,
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.12)',
              transition: 'all .2s', display: 'inline-block',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)' }}
            >
              See all features
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background: '#100F0D', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 64px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <img src="/WhiteLogo.png" alt="EZEE" style={{ height: 20, objectFit: 'contain', opacity: 0.6 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 EZEE. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Features', 'Library', 'Privacy', 'Terms'].map(link => (
              <a key={link} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}
              >{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

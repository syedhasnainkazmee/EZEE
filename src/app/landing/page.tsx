'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Animation CSS ───────────────────────────────────────────────────────────
const CSS = `
  @keyframes float-card {
    0%,100%{transform:perspective(1200px) rotateX(8deg) rotateY(-6deg) translateY(0px) translateZ(0)}
    50%{transform:perspective(1200px) rotateX(5deg) rotateY(-3deg) translateY(-18px) translateZ(20px)}
  }
  @keyframes float-toast {
    0%,100%{transform:translateY(0px)}
    50%{transform:translateY(-10px)}
  }
  @keyframes float-badge {
    0%,100%{transform:translateY(0px) rotate(-2deg)}
    50%{transform:translateY(-6px) rotate(-2deg)}
  }
  @keyframes lp-orb-1 {
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(80px,-60px) scale(1.2)}
    66%{transform:translate(-30px,40px) scale(0.9)}
  }
  @keyframes lp-orb-2 {
    0%,100%{transform:translate(0,0) scale(1)}
    33%{transform:translate(-60px,70px) scale(0.85)}
    66%{transform:translate(50px,-30px) scale(1.1)}
  }
  @keyframes lp-orb-3 {
    0%,100%{transform:translate(0,0) scale(1)}
    50%{transform:translate(30px,50px) scale(1.15)}
  }
  @keyframes lp-marquee {
    0%{transform:translateX(0)}
    100%{transform:translateX(-50%)}
  }
  @keyframes lp-reveal {
    from{opacity:0;transform:translateY(48px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes lp-reveal-right {
    from{opacity:0;transform:translateX(60px)}
    to{opacity:1;transform:translateX(0)}
  }
  @keyframes lp-reveal-left {
    from{opacity:0;transform:translateX(-60px)}
    to{opacity:1;transform:translateX(0)}
  }
  @keyframes lp-scale {
    from{opacity:0;transform:scale(0.92)}
    to{opacity:1;transform:scale(1)}
  }
  @keyframes pulse-ring {
    0%{box-shadow:0 0 0 0 rgba(212,81,46,0.5)}
    100%{box-shadow:0 0 0 10px rgba(212,81,46,0)}
  }
  @keyframes dash-flow {
    to{stroke-dashoffset:-20}
  }
  @keyframes shimmer {
    0%{background-position:-200% 0}
    100%{background-position:200% 0}
  }
  .lp-reveal{opacity:0}
  .lp-reveal.vis{animation:lp-reveal 0.85s cubic-bezier(0.16,1,0.3,1) forwards}
  .lp-reveal-right{opacity:0}
  .lp-reveal-right.vis{animation:lp-reveal-right 0.85s cubic-bezier(0.16,1,0.3,1) forwards}
  .lp-reveal-left{opacity:0}
  .lp-reveal-left.vis{animation:lp-reveal-left 0.85s cubic-bezier(0.16,1,0.3,1) forwards}
  .lp-scale{opacity:0}
  .lp-scale.vis{animation:lp-scale 0.7s cubic-bezier(0.16,1,0.3,1) forwards}
  .delay-1{animation-delay:0.1s}
  .delay-2{animation-delay:0.2s}
  .delay-3{animation-delay:0.35s}
  .delay-4{animation-delay:0.5s}
  .delay-5{animation-delay:0.65s}
  .delay-6{animation-delay:0.8s}
  a{text-decoration:none}
  *{box-sizing:border-box}
`

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal,.lp-reveal-right,.lp-reveal-left,.lp-scale')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') })
    }, { threshold: 0.12 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useAnimatedCount(target: number, suffix = '', running: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!running) return
    let raf: number
    const start = performance.now()
    const dur = 1600
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 4)
      setVal(Math.round(e * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [running, target])
  return val
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Grain() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.032,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat', backgroundSize: '200px 200px',
    }} />
  )
}

function Nav({ mouse }: { mouse: { x: number; y: number } }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 48px',
      height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(8,7,6,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      transition: 'all 0.4s ease',
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 900, color: '#FDFCFB', letterSpacing: '-0.02em' }}>
        EZ<span style={{ color: '#D4512E' }}>EE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {['Features', 'Library', 'Pricing'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)', transition: 'color 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FDFCFB'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'}
          >{item}</a>
        ))}
      </div>
      <Link href="/login" style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 22px', borderRadius: 100,
        background: '#D4512E', color: '#fff',
        fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
        boxShadow: '0 4px 20px rgba(212,81,46,0.35)',
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(212,81,46,0.45)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(212,81,46,0.35)' }}
      >
        Get Started <span style={{ fontSize: 16 }}>→</span>
      </Link>
    </nav>
  )
}

function AppMockup() {
  return (
    <div style={{ position: 'relative', animation: 'float-card 7s ease-in-out infinite' }}>
      {/* Toast notification */}
      <div style={{
        position: 'absolute', top: -28, right: -20, zIndex: 10,
        background: 'rgba(14,18,16,0.96)',
        border: '1px solid rgba(14,165,114,0.35)',
        borderRadius: 14, padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,114,0.08)',
        animation: 'float-toast 4s ease-in-out infinite',
        whiteSpace: 'nowrap',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0EA572,#059952)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>Step 2 approved</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>Meeran · just now</div>
        </div>
      </div>

      {/* Floating annotation pin */}
      <div style={{
        position: 'absolute', bottom: 80, left: -18, zIndex: 10,
        animation: 'float-badge 5s ease-in-out infinite',
        animationDelay: '-1.5s',
      }}>
        <div style={{
          background: '#D4512E', borderRadius: '50% 50% 50% 0', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 800,
          boxShadow: '0 4px 16px rgba(212,81,46,0.5)',
          transform: 'rotate(-45deg)',
        }}>
          <span style={{ transform: 'rotate(45deg)' }}>2</span>
        </div>
        <div style={{
          position: 'absolute', left: 38, top: -8,
          background: 'rgba(14,12,11,0.96)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '8px 12px', width: 160, whiteSpace: 'normal',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#FDFCFB' }}>Minhal K.</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Check the contrast on the CTA — feels off on dark bg</div>
        </div>
      </div>

      {/* Main card */}
      <div style={{
        width: 560,
        background: 'rgba(16,14,12,0.97)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 48px 96px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {/* Browser chrome */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.018)' }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
          <div style={{ flex: 1, margin: '0 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 7, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(14,165,114,0.7)' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>ezee.design/submission/q4-assets</span>
          </div>
        </div>

        {/* App body */}
        <div style={{ display: 'flex', height: 350 }}>
          {/* Left: designs */}
          <div style={{ flex: 1, padding: 16, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Q4 Campaign Assets</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'A', grad: 'radial-gradient(circle at 40% 35%, #8B5CF633, transparent 65%)', bg: '#1E1628', acc: '#8B5CF6', lines: [[20,38],[60,52],[45,62]] },
                { label: 'B', grad: 'radial-gradient(circle at 60% 40%, #10B98133, transparent 65%)', bg: '#121E18', acc: '#10B981', lines: [[30,30],[65,45],[40,60]] },
                { label: 'C', grad: 'radial-gradient(circle at 35% 60%, #F59E0B33, transparent 65%)', bg: '#1E1A12', acc: '#F59E0B', lines: [[25,40],[70,35],[50,65]] },
                { label: 'D', grad: 'radial-gradient(circle at 65% 35%, #3B82F633, transparent 65%)', bg: '#121628', acc: '#3B82F6', lines: [[40,30],[20,55],[65,60]] },
              ].map((d, idx) => (
                <div key={d.label} style={{ background: d.bg, borderRadius: 10, aspectRatio: '1', position: 'relative', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: d.grad }} />
                  {/* Fake design elements */}
                  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}>
                    <rect x="15" y="15" width="70" height="8" rx="2" fill={`${d.acc}40`} />
                    <rect x="15" y="30" width="50" height="5" rx="2" fill={`${d.acc}25`} />
                    <rect x="15" y="42" width="65" height="5" rx="2" fill={`${d.acc}20`} />
                    <rect x="15" y="58" width="42" height="22" rx="4" fill={`${d.acc}30`} />
                    <rect x="62" y="58" width="23" height="22" rx="4" fill={`${d.acc}18`} />
                    <rect x="15" y="84" width="70" height="4" rx="2" fill={`${d.acc}15`} />
                  </svg>
                  <div style={{ position: 'absolute', bottom: 5, left: 5, fontSize: 9, fontWeight: 800, color: 'white', background: d.acc, padding: '2px 6px', borderRadius: 4 }}>{d.label}</div>
                  {idx === 1 && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#D4512E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 900, boxShadow: '0 2px 8px rgba(212,81,46,0.6)' }}>1</div>
                  )}
                  {idx === 0 && (
                    <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 8, fontWeight: 700, color: '#0EA572', background: 'rgba(14,165,114,0.15)', border: '1px solid rgba(14,165,114,0.3)', borderRadius: 4, padding: '1px 5px' }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Review chain */}
          <div style={{ width: 196, padding: '16px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Review Chain</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {[
                { name: 'Minhal K.', role: 'Creative Lead', status: 'approved', color: '#0EA572' },
                { name: 'Meeran A.', role: 'Brand', status: 'approved', color: '#0EA572' },
                { name: 'Daniyal S.', role: 'Final Sign-off', status: 'pending', color: '#F59E0B' },
              ].map((r, i) => (
                <div key={r.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
                  background: r.status === 'approved' ? 'rgba(14,165,114,0.06)' : r.status === 'pending' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${r.status === 'approved' ? 'rgba(14,165,114,0.18)' : r.status === 'pending' ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${r.color}55, ${r.color}22)`,
                    border: `1.5px solid ${r.color}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: r.color,
                  }}>{r.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{r.role}</div>
                  </div>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    background: r.status === 'approved' ? '#0EA572' : r.status === 'pending' ? 'transparent' : 'rgba(255,255,255,0.06)',
                    border: r.status === 'pending' ? '2px solid #F59E0B' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {r.status === 'approved' && <svg width="7" height="7" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {r.status === 'pending' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={{ padding: '9px 0', borderRadius: 10, background: '#0EA572', color: 'white', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'default', letterSpacing: '0.02em' }}>
                ✓ Approve
              </button>
              <button style={{ padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)', cursor: 'default' }}>
                Request Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCounter({ target, suffix, label, running }: { target: number; suffix: string; label: string; running: boolean }) {
  const count = useAnimatedCount(target, suffix, running)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: "'Fraunces', serif",
        fontSize: 64, fontWeight: 900, lineHeight: 1,
        color: '#FDFCFB',
        letterSpacing: '-0.03em',
      }}>
        {count}<span style={{ color: '#D4512E' }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function WorkflowMockup() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20, padding: '32px 28px',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 28 }}>Approval Flow</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          { name: 'Minhal K.', role: 'Creative Lead', focus: 'Visual consistency & brand alignment', color: '#8B5CF6', status: 'done' },
          { name: 'Meeran A.', role: 'Marketing', focus: 'Messaging and campaign fit', color: '#0EA572', status: 'done' },
          { name: 'Daniyal S.', role: 'Head of Design', focus: 'Final quality sign-off', color: '#3B82F6', status: 'active' },
        ].map((node, i) => (
          <div key={node.name} style={{ position: 'relative' }}>
            {i < 2 && (
              <div style={{ position: 'absolute', left: 20, top: 64, width: 1, height: 32, zIndex: 0 }}>
                <svg width="2" height="32" viewBox="0 0 2 32" style={{ display: 'block' }}>
                  <line x1="1" y1="0" x2="1" y2="32" stroke={node.status === 'done' ? node.color : 'rgba(255,255,255,0.12)'} strokeWidth="1.5" strokeDasharray="4 3" style={{ animation: node.status === 'done' ? 'dash-flow 1s linear infinite' : 'none' }} />
                </svg>
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px', borderRadius: 14, marginBottom: i < 2 ? 32 : 0,
              background: node.status === 'active' ? `rgba(${node.color === '#3B82F6' ? '59,130,246' : '0,0,0'},0.08)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${node.status === 'done' ? node.color + '30' : node.status === 'active' ? node.color + '40' : 'rgba(255,255,255,0.06)'}`,
              boxShadow: node.status === 'active' ? `0 0 0 3px ${node.color}12, 0 8px 24px -8px ${node.color}30` : 'none',
              position: 'relative', zIndex: 1,
              transition: 'all 0.3s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${node.color}50, ${node.color}20)`,
                border: `2px solid ${node.color}${node.status === 'active' ? '' : '60'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: node.color,
                boxShadow: node.status === 'active' ? `0 0 16px ${node.color}40` : 'none',
              }}>{node.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{node.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{node.role}</div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                    background: node.status === 'done' ? 'rgba(14,165,114,0.15)' : node.status === 'active' ? `rgba(59,130,246,0.15)` : 'rgba(255,255,255,0.05)',
                    color: node.status === 'done' ? '#0EA572' : node.status === 'active' ? '#60A5FA' : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${node.status === 'done' ? 'rgba(14,165,114,0.25)' : node.status === 'active' ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    letterSpacing: '0.05em',
                  }}>{node.status === 'done' ? '✓ Approved' : node.status === 'active' ? '● In Review' : 'Waiting'}</div>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', marginTop: 6, lineHeight: 1.4 }}>{node.focus}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnotationMockup() {
  const pins = [
    { x: 32, y: 22, n: 1, comment: 'Logo feels too small here — bump it up by 20%', author: 'Meeran A.' },
    { x: 68, y: 55, n: 2, comment: 'Check contrast on dark bg', author: 'Minhal K.' },
    { x: 20, y: 72, n: 3, comment: 'Great call on the typography', author: 'Daniyal S.' },
  ]
  const [activePin, setActivePin] = useState<number | null>(1)

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
      <div style={{
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.6)',
      }}>
        {/* Design canvas */}
        <div style={{ position: 'relative', height: 280, background: 'linear-gradient(145deg, #1a0e28, #0e1a20, #1a1208)', overflow: 'hidden' }}>
          {/* Fake design content */}
          <svg viewBox="0 0 460 280" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#D4512E" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <rect x="40" y="30" width="180" height="12" rx="3" fill="url(#g1)" />
            <rect x="40" y="54" width="120" height="7" rx="2" fill="rgba(255,255,255,0.12)" />
            <rect x="40" y="72" width="150" height="7" rx="2" fill="rgba(255,255,255,0.08)" />
            <rect x="40" y="106" width="100" height="50" rx="8" fill="rgba(212,81,46,0.35)" />
            <rect x="155" y="106" width="100" height="50" rx="8" fill="rgba(139,92,246,0.25)" />
            <rect x="270" y="106" width="150" height="50" rx="8" fill="rgba(255,255,255,0.06)" />
            <rect x="40" y="180" width="380" height="6" rx="2" fill="rgba(255,255,255,0.07)" />
            <rect x="40" y="198" width="300" height="6" rx="2" fill="rgba(255,255,255,0.05)" />
            <rect x="40" y="216" width="340" height="6" rx="2" fill="rgba(255,255,255,0.04)" />
          </svg>

          {/* Pins */}
          {pins.map(pin => (
            <div key={pin.n}>
              <div
                onMouseEnter={() => setActivePin(pin.n)}
                onMouseLeave={() => setActivePin(1)}
                style={{
                  position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`,
                  width: 24, height: 24, borderRadius: '50% 50% 50% 0',
                  background: activePin === pin.n ? '#D4512E' : 'rgba(212,81,46,0.6)',
                  border: '2px solid rgba(212,81,46,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'white', fontWeight: 900,
                  transform: 'rotate(-45deg)',
                  cursor: 'pointer', zIndex: 2,
                  boxShadow: activePin === pin.n ? '0 0 0 4px rgba(212,81,46,0.2), 0 4px 12px rgba(212,81,46,0.4)' : '0 2px 8px rgba(212,81,46,0.3)',
                  transition: 'all 0.2s',
                }}>
                <span style={{ transform: 'rotate(45deg)' }}>{pin.n}</span>
              </div>
              {activePin === pin.n && (
                <div style={{
                  position: 'absolute',
                  left: `${Math.min(pin.x + 4, 55)}%`,
                  top: `${Math.max(pin.y - 18, 5)}%`,
                  background: 'rgba(14,12,11,0.97)',
                  border: '1px solid rgba(212,81,46,0.25)',
                  borderRadius: 12, padding: '10px 14px', width: 180, zIndex: 5,
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  animation: 'float-toast 3s ease-in-out infinite',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#D4512E', marginBottom: 4 }}>{pin.author}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 }}>{pin.comment}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comment list */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pins.slice(0, 2).map(pin => (
            <div key={pin.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,81,46,0.2)', border: '1px solid rgba(212,81,46,0.4)', fontSize: 9, color: '#D4512E', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{pin.n}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{pin.author} </span>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>{pin.comment.slice(0, 38)}…</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LibraryMockup() {
  const cards = [
    { title: 'Q4 Social Pack', tags: ['Instagram Story', 'Facebook Ad'], color: '#8B5CF6', bg: '#1E1628' },
    { title: 'Brand Refresh', tags: ['Logo', 'Branding'], color: '#0EA572', bg: '#121E18' },
    { title: 'Email Header', tags: ['Email Header', 'Banner'], color: '#F59E0B', bg: '#1E1A12' },
  ]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20, padding: 24, backdropFilter: 'blur(12px)',
    }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {['All', 'Instagram Story', 'Branding', 'Banner'].map((tag, i) => (
          <div key={tag} style={{
            padding: '5px 12px', borderRadius: 100,
            background: i === 0 ? 'rgba(212,81,46,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${i === 0 ? 'rgba(212,81,46,0.4)' : 'rgba(255,255,255,0.08)'}`,
            fontSize: 11, fontWeight: 600,
            color: i === 0 ? '#D4512E' : 'rgba(255,255,255,0.45)',
          }}>{tag}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map(card => (
          <div key={card.title} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '10px 14px',
          }}>
            <div style={{ width: 52, height: 40, background: card.bg, borderRadius: 8, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 40% 40%, ${card.color}40, transparent 70%)` }} />
              <svg viewBox="0 0 52 40" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <rect x="6" y="8" width="40" height="4" rx="1" fill={`${card.color}50`} />
                <rect x="6" y="16" width="28" height="3" rx="1" fill={`${card.color}30`} />
                <rect x="6" y="26" width="40" height="10" rx="2" fill={`${card.color}20`} />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 5 }}>{card.title}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {card.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 100, background: `${card.color}15`, color: card.color, fontWeight: 600, border: `1px solid ${card.color}25` }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(14,165,114,0.15)', border: '1px solid rgba(14,165,114,0.25)', fontSize: 10, fontWeight: 700, color: '#0EA572', whiteSpace: 'nowrap' }}>
              Open Drive →
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(600px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg) translateZ(8px)`
    el.style.boxShadow = `${-x * 12}px ${-y * 12}px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)`
  }, [])

  const handleMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)'
    el.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)'
  }, [])

  return (
    <div
      ref={ref}
      className={`lp-scale delay-${delay}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '28px 26px',
        backdropFilter: 'blur(12px)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default', willChange: 'transform',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14, marginBottom: 18,
        background: 'rgba(212,81,46,0.12)', border: '1px solid rgba(212,81,46,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#D4512E',
      }}>{icon}</div>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: '#FDFCFB', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  )
}

const MARQUEE_ITEMS = [
  'Multi-step Workflows', 'Annotation Pins', 'Google Drive Sync', 'Approved Library', 'Real-time Updates',
  'Background Uploads', 'Version Tracking', 'Email Notifications', 'Role-based Access', 'Cycle Time Analytics',
]

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useScrollReveal()

  useEffect(() => {
    const handler = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true) }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ background: '#080706', color: '#FDFCFB', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{CSS}</style>

      {/* Cursor glow */}
      <div style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 9998,
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,81,46,0.05) 0%, transparent 65%)',
        transform: `translate(${mouse.x - 350}px, ${mouse.y - 350}px)`,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }} />

      <Nav mouse={mouse} />

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: 68 }}>
        <Grain />

        {/* Orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,81,46,0.12) 0%, transparent 70%)', animation: 'lp-orb-1 18s ease-in-out infinite', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '5%', right: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', animation: 'lp-orb-2 22s ease-in-out infinite', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', top: '40%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', animation: 'lp-orb-3 14s ease-in-out infinite', filter: 'blur(30px)' }} />
        </div>

        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '80px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', width: '100%' }}>
          {/* Left */}
          <div>
            <div className="lp-reveal" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 100, marginBottom: 36,
              background: 'rgba(212,81,46,0.1)', border: '1px solid rgba(212,81,46,0.3)',
              fontSize: 12.5, fontWeight: 700, color: '#D4512E', letterSpacing: '0.02em',
              animation: 'pulse-ring 2.5s infinite',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4512E', display: 'inline-block' }} />
              Now with Approved Library
              <span style={{ opacity: 0.7 }}>→</span>
            </div>

            <h1 className="lp-reveal delay-1" style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(56px, 5.5vw, 92px)',
              fontWeight: 900, lineHeight: 1.0,
              letterSpacing: '-0.035em', color: '#FDFCFB', margin: '0 0 28px',
            }}>
              Design<br />
              review,<br />
              <span style={{
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundImage: 'linear-gradient(135deg, #D4512E 0%, #FF8A65 50%, #D4512E 100%)',
                backgroundClip: 'text',
                backgroundSize: '200% auto',
                animation: 'shimmer 4s linear infinite',
              }}>done right.</span>
            </h1>

            <p className="lp-reveal delay-2" style={{ fontSize: 18, color: 'rgba(255,255,255,0.52)', lineHeight: 1.65, margin: '0 0 44px', maxWidth: 420, fontWeight: 400 }}>
              Multi-step approval workflows, pinpoint annotations, and automatic Google Drive delivery. From first draft to final approval — faster than ever.
            </p>

            <div className="lp-reveal delay-3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 32px', borderRadius: 100,
                background: '#D4512E', color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
                boxShadow: '0 8px 32px rgba(212,81,46,0.4), 0 0 0 1px rgba(212,81,46,0.3)',
                transition: 'all 0.25s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(212,81,46,0.5), 0 0 0 1px rgba(212,81,46,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(212,81,46,0.4), 0 0 0 1px rgba(212,81,46,0.3)' }}
              >
                Get Started — it's free
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 28px', borderRadius: 100,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.2s', cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; (e.currentTarget as HTMLElement).style.color = '#FDFCFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.72)' }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Watch demo
              </button>
            </div>

            <div className="lp-reveal delay-4" style={{ display: 'flex', gap: 24, marginTop: 48, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {[{ n: '500+', l: 'Submissions reviewed' }, { n: '3×', l: 'Faster than email' }, { n: '100%', l: 'Audit trail' }].map(s => (
                <div key={s.n}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#FDFCFB', letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3, fontWeight: 500 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3D Mockup */}
          <div className="lp-reveal-right" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', padding: '40px 0' }}>
            <AppMockup />
          </div>
        </div>
      </section>

      {/* ─── MARQUEE ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '18px 0', overflow: 'hidden', background: 'rgba(255,255,255,0.015)', position: 'relative' }}>
        <div style={{ display: 'flex', animation: 'lp-marquee 28s linear infinite', willChange: 'transform', width: 'max-content' }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, paddingRight: 48, whiteSpace: 'nowrap' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4512E', flexShrink: 0, display: 'inline-block', opacity: 0.6 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── STATS ───────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ padding: '100px 64px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
          {[
            { target: 500, suffix: '+', label: 'Submissions reviewed' },
            { target: 12, suffix: 'h', label: 'Avg. hours to approval' },
            { target: 3, suffix: '×', label: 'Faster than email chains' },
            { target: 100, suffix: '%', label: 'Design decisions tracked' },
          ].map(s => (
            <StatCounter key={s.label} target={s.target} suffix={s.suffix} label={s.label} running={statsVisible} />
          ))}
        </div>
      </section>

      {/* ─── FEATURE 1: Workflows ─────────────────────────────────────── */}
      <section id="features" style={{ padding: '120px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,81,46,0.06) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
          <div className="lp-reveal-left">
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 140, fontWeight: 900, color: 'rgba(255,255,255,0.04)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: -40, userSelect: 'none' }}>01</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Approval Workflows</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px, 3.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FDFCFB', margin: '0 0 20px', lineHeight: 1.08 }}>
              Define exactly who reviews what — and when.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: '0 0 36px' }}>
              Build multi-step approval chains with per-reviewer focus areas. Creative lead checks brand alignment, marketing checks messaging, leadership gives final sign-off. No more confusion about who's next.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Ordered reviewer chains with role-based focus', 'Magic review links — no login required for reviewers', 'Real-time status updates via live feed'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  <svg width="16" height="16" style={{ color: '#0EA572', flexShrink: 0, marginTop: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="lp-reveal-right">
            <WorkflowMockup />
          </div>
        </div>
      </section>

      {/* ─── FEATURE 2: Annotations ───────────────────────────────────── */}
      <section style={{ padding: '120px 64px', background: 'rgba(255,255,255,0.012)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '10%', left: '-8%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
          <div className="lp-reveal-left" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <AnnotationMockup />
          </div>
          <div className="lp-reveal-right">
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 140, fontWeight: 900, color: 'rgba(255,255,255,0.04)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: -40, userSelect: 'none' }}>02</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Pinpoint Annotations</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px, 3.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FDFCFB', margin: '0 0 20px', lineHeight: 1.08 }}>
              Click anywhere on a design to leave feedback.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: '0 0 36px' }}>
              Stop writing vague emails like "fix the thing in the top right." Reviewers click directly on the design — numbered pins attach comments to exact pixels. Designers know precisely what to fix.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Numbered pins with threaded comments', 'Comments visible to all reviewers in the chain', 'Persisted across versions for reference'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  <svg width="16" height="16" style={{ color: '#0EA572', flexShrink: 0, marginTop: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURE 3: Library ───────────────────────────────────────── */}
      <section id="library" style={{ padding: '120px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,114,0.07) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 96, alignItems: 'center' }}>
          <div className="lp-reveal-left">
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 140, fontWeight: 900, color: 'rgba(255,255,255,0.04)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: -40, userSelect: 'none' }}>03</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Approved Library</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px, 3.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FDFCFB', margin: '0 0 20px', lineHeight: 1.08 }}>
              Every approved asset, in one searchable place.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: '0 0 36px' }}>
              Social leads and content teams finally have a single source of truth. Filter by content type — Instagram Story, Banner, Email Header — and download directly from Google Drive. No more hunting through Slack or email.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Tag designs by content type on submission', 'Filter and search the full approval history', 'One-click access to Google Drive deliverables'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  <svg width="16" height="16" style={{ color: '#0EA572', flexShrink: 0, marginTop: 2 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="lp-reveal-right">
            <LibraryMockup />
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ───────────────────────────────────────────── */}
      <section style={{ padding: '120px 64px', background: 'rgba(255,255,255,0.012)', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div className="lp-reveal" style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Built for modern design teams</div>
            <h2 className="lp-reveal delay-1" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px, 4vw, 60px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FDFCFB', margin: 0 }}>
              Everything your team needs
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, title: 'Real-time updates', desc: 'Live SSE feed pushes status changes the moment a reviewer acts. No refreshing.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>, title: 'Background uploads', desc: 'Files start uploading the second you add them. Submit instantly, no waiting.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>, title: 'Google Drive sync', desc: 'Approved designs auto-upload to Drive, organized by submission and task.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Full version history', desc: 'Every revision is tracked. Compare V1 to V3 side-by-side with review context.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, title: 'Smart email alerts', desc: "Reviewers are emailed when it's their turn. Submitters notified on every decision." },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: 'Role-based access', desc: 'Admins configure workflows. Members submit and track. Reviewers get magic links.' },
            ].map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={((i % 3) + 1) as 1 | 2 | 3} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section style={{ padding: '120px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="lp-reveal" style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Simple by design</div>
            <h2 className="lp-reveal delay-1" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(36px, 4vw, 60px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FDFCFB', margin: 0 }}>
              From file to approved in 3 steps
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr 64px 1fr', alignItems: 'center', gap: 0 }}>
            {[
              { n: '01', icon: <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>, title: 'Submit your designs', desc: 'Upload files, add context, pick a workflow. Files are already uploading in the background.' },
              { n: '02', icon: <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>, title: 'Reviewers get notified', desc: 'Each reviewer gets an email with a magic link. They approve or annotate — no account needed.' },
              { n: '03', icon: <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Delivered to Drive', desc: 'On full approval, files auto-organize in Google Drive. The library updates instantly.' },
            ].map((step, i) => (
              <>
                <div key={step.n} className={`lp-reveal delay-${i + 1}`} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20, padding: '36px 28px',
                  backdropFilter: 'blur(12px)', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 48, fontWeight: 900, color: 'rgba(212,81,46,0.15)', letterSpacing: '-0.03em', marginBottom: 20, lineHeight: 1 }}>{step.n}</div>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(212,81,46,0.1)', border: '1px solid rgba(212,81,46,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4512E', margin: '0 auto 20px' }}>{step.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#FDFCFB', marginBottom: 10 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>{step.desc}</div>
                </div>
                {i < 2 && (
                  <div key={`arrow-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" fill="none" stroke="rgba(212,81,46,0.4)" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ margin: '0 48px 80px', position: 'relative', overflow: 'hidden', borderRadius: 28 }}>
        <div style={{ position: 'relative', padding: '100px 80px', background: 'linear-gradient(135deg, #1a0d08 0%, #0f0908 40%, #080b14 100%)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <Grain />
          {/* Dot grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.5, pointerEvents: 'none' }} />
          {/* Orb */}
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,81,46,0.12) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div className="lp-reveal" style={{ fontSize: 12, fontWeight: 700, color: '#D4512E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Start today — it's free</div>
            <h2 className="lp-reveal delay-1" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 900, letterSpacing: '-0.035em', color: '#FDFCFB', margin: '0 0 20px', lineHeight: 1.0 }}>
              Ready to ship<br />faster?
            </h2>
            <p className="lp-reveal delay-2" style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', margin: '0 auto 48px', maxWidth: 480, lineHeight: 1.6 }}>
              Set up your first approval workflow in minutes. Your team will wonder how they ever worked without it.
            </p>
            <div className="lp-reveal delay-3" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 36px', borderRadius: 100,
                background: '#D4512E', color: 'white', fontSize: 15.5, fontWeight: 700,
                boxShadow: '0 8px 32px rgba(212,81,46,0.45)',
                transition: 'all 0.25s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 40px rgba(212,81,46,0.55)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(212,81,46,0.45)' }}
              >
                Get Started — free
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              <Link href="/landing#features" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 32px', borderRadius: 100,
                background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 15.5, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.11)'; (e.currentTarget as HTMLElement).style.color = '#FDFCFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
              >
                See all features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ padding: '64px 64px 48px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 64 }}>
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#FDFCFB', letterSpacing: '-0.02em', marginBottom: 14 }}>
                EZ<span style={{ color: '#D4512E' }}>EE</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, maxWidth: 260 }}>
                Design review and approval workflows for modern creative teams.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                {[
                  <path key="tw" d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />,
                  <><rect key="ig1" x="2" y="2" width="20" height="20" rx="5" ry="5" /><path key="ig2" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01" /></>,
                  <path key="li" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" />,
                ].map((p, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,81,46,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,81,46,0.3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
                  >
                    <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.45)" viewBox="0 0 24 24" strokeWidth={1.8}>{p}</svg>
                  </div>
                ))}
              </div>
            </div>
            {[
              { heading: 'Product', links: ['Features', 'Approved Library', 'Pricing', 'Roadmap', 'Changelog'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>{col.heading}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {col.links.map(link => (
                    <a key={link} href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', transition: 'color 0.2s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FDFCFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}
                    >{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)' }}>© 2026 EZEE. All rights reserved.</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }}>Designed for teams who ship.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

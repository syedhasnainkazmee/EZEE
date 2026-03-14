'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

type Pin = {
  id: string
  design_id: string
  x: number
  y: number
  comment: string
  number: number
  reviewer?: { name: string; role: string } | null
  reviewer_id?: string
}

type Props = {
  src: string
  variationLabel: string
  designId: string
  submissionId: string
  reviewerToken: string
  existingPins: Pin[]
  onPinAdded?: (pin: Pin) => void
  onPinDeleted?: (pinId: string) => void
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  readOnly?: boolean
}

type PendingPin = { x: number; y: number; containerX: number; containerY: number }

export default function AnnotationCanvas({
  src, variationLabel, designId, submissionId, reviewerToken,
  existingPins, onPinAdded, onPinDeleted, onClose,
  onPrev, onNext, readOnly,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null)
  const [pendingComment, setPendingComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [activePin, setActivePin] = useState<string | null>(null)
  const [annotateMode, setAnnotateMode] = useState(false)
  const [imgBounds, setImgBounds] = useState({ left: 0, top: 0, width: 0, height: 0 })

  const calcBounds = useCallback(() => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container || !imgLoaded) return

    const cW = container.clientWidth
    const cH = container.clientHeight
    const iW = img.naturalWidth || cW
    const iH = img.naturalHeight || cH

    const cRatio = cW / cH
    const iRatio = iW / iH

    let rW: number, rH: number
    if (iRatio > cRatio) {
      rW = cW; rH = cW / iRatio
    } else {
      rH = cH; rW = cH * iRatio
    }
    const left = (cW - rW) / 2
    const top = (cH - rH) / 2
    setImgBounds({ left, top, width: rW, height: rH })
  }, [imgLoaded])

  useEffect(() => {
    calcBounds()
    window.addEventListener('resize', calcBounds)
    return () => window.removeEventListener('resize', calcBounds)
  }, [calcBounds])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingPin) { setPendingPin(null); return }
        onClose()
      }
      if (e.key === 'ArrowLeft' && onPrev && !pendingPin) onPrev()
      if (e.key === 'ArrowRight' && onNext && !pendingPin) onNext()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [onClose, onPrev, onNext, pendingPin])

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!annotateMode || !reviewerToken || readOnly) return
    if (pendingPin) { setPendingPin(null); return }

    const rect = containerRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    const { left, top, width, height } = imgBounds
    const ix = cx - left
    const iy = cy - top
    if (ix < 0 || ix > width || iy < 0 || iy > height) return

    const xRel = ix / width
    const yRel = iy / height

    const popW = 256
    const popH = 130
    let popX = cx + 14
    let popY = cy - 44
    const cW = containerRef.current!.clientWidth
    const cH = containerRef.current!.clientHeight
    if (popX + popW > cW - 8) popX = cx - popW - 14
    if (popY + popH > cH - 8) popY = cH - popH - 8
    if (popY < 8) popY = 8

    setPendingPin({ x: xRel, y: yRel, containerX: popX, containerY: popY })
    setPendingComment('')
  }

  async function savePin() {
    if (!pendingPin || !pendingComment.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: reviewerToken,
          design_id: designId,
          submission_id: submissionId,
          x: pendingPin.x,
          y: pendingPin.y,
          comment: pendingComment.trim(),
        }),
      })
      const data = await res.json()
      if (data.annotation) onPinAdded?.(data.annotation)
      setPendingPin(null)
      setPendingComment('')
    } finally {
      setSaving(false)
    }
  }

  async function deletePin(pinId: string) {
    const res = await fetch(`/api/annotations?id=${pinId}&token=${reviewerToken}`, { method: 'DELETE' })
    if (res.ok) onPinDeleted?.(pinId)
    setActivePin(null)
  }

  const myPins = existingPins

  function pinStyle(pin: Pin) {
    const { left, top, width, height } = imgBounds
    return {
      left: `${left + pin.x * width}px`,
      top: `${top + pin.y * height}px`,
      transform: 'translate(-50%, -50%)',
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b"
        style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[13px] font-medium transition-colors rounded-xl px-3 py-1.5 hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Close
          </button>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-white/10 text-white text-[11px] font-bold flex items-center justify-center">{variationLabel}</span>
            <span className="text-[13px] font-medium text-white">Variation {variationLabel}</span>
          </div>
          {existingPins.length > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,122,255,0.15)', color: '#007AFF' }}>
              {existingPins.length} pin{existingPins.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && reviewerToken && (
            <button
              onClick={() => { setAnnotateMode(a => !a); setPendingPin(null) }}
              className={`flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full transition-all duration-150 ${
                annotateMode
                  ? 'bg-p-accent text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              style={annotateMode ? { background: '#007AFF' } : {}}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              {annotateMode ? 'Click to pin' : 'Annotate'}
            </button>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-1">
            {onPrev && (
              <button
                onClick={onPrev}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                ←
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm"
              >
                →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main: image + sidebar */}
      <div className="flex flex-1 min-h-0">

        {/* Image canvas */}
        <div
          ref={containerRef}
          className={`flex-1 relative overflow-hidden select-none ${annotateMode ? 'cursor-crosshair' : 'cursor-default'}`}
          onClick={handleContainerClick}
        >
          <img
            ref={imgRef}
            src={src}
            alt={`Variation ${variationLabel}`}
            onLoad={() => { setImgLoaded(true); setTimeout(calcBounds, 50) }}
            style={{
              position: 'absolute',
              left: `${imgBounds.left}px`,
              top: `${imgBounds.top}px`,
              width: `${imgBounds.width}px`,
              height: `${imgBounds.height}px`,
              maxWidth: 'none',
              display: 'block',
              borderRadius: '8px',
            }}
            draggable={false}
          />

          {/* Annotate mode hint */}
          {annotateMode && !pendingPin && (
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-[12px] font-medium px-4 py-2 rounded-full pointer-events-none shadow-lg"
              style={{ background: '#007AFF' }}
            >
              Click anywhere on the image to drop a pin
            </div>
          )}

          {/* Existing pins */}
          {imgLoaded && myPins.map(pin => (
            <button
              key={pin.id}
              style={{ position: 'absolute', ...pinStyle(pin), zIndex: 10, background: '#007AFF' }}
              onClick={e => { e.stopPropagation(); setActivePin(activePin === pin.id ? null : pin.id) }}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-lg ring-2 ring-white/40 transition-all hover:scale-110 hover:ring-white active:scale-95 ${
                activePin === pin.id ? 'scale-125 ring-white ring-4 shadow-xl' : ''
              }`}
            >
              {pin.number}
            </button>
          ))}

          {/* Active pin popover */}
          {activePin && (() => {
            const pin = myPins.find(p => p.id === activePin)
            if (!pin) return null
            const { left, top, width, height } = imgBounds
            const px = left + pin.x * width
            const py = top + pin.y * height
            const cW = containerRef.current?.clientWidth ?? 800
            const cH = containerRef.current?.clientHeight ?? 600
            let popLeft = px + 16
            let popTop = py - 12
            if (popLeft + 232 > cW - 8) popLeft = px - 248
            if (popTop + 90 > cH - 8) popTop = cH - 98
            if (popTop < 8) popTop = 8

            return (
              <div
                className="absolute rounded-2xl p-4 w-60 z-20 shadow-popup border"
                style={{ left: popLeft, top: popTop, background: '#1C1C1E', borderColor: 'rgba(255,255,255,0.08)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: '#007AFF' }}>
                      {pin.number}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{pin.reviewer?.name ?? 'Reviewer'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!readOnly && reviewerToken && (
                      <button onClick={() => deletePin(pin.id)} className="transition-colors p-1 rounded-lg hover:bg-red-500/20" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    )}
                    <button onClick={() => setActivePin(null)} className="transition-colors p-1 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{pin.comment}</p>
              </div>
            )
          })()}

          {/* Pending pin */}
          {pendingPin && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${imgBounds.left + pendingPin.x * imgBounds.width}px`,
                  top: `${imgBounds.top + pendingPin.y * imgBounds.height}px`,
                  transform: 'translate(-50%,-50%)',
                  zIndex: 15,
                  background: '#007AFF',
                }}
                className="w-7 h-7 rounded-full ring-2 ring-white/50 flex items-center justify-center text-[11px] font-bold text-white animate-pulse shadow-lg"
              >
                {existingPins.length + 1}
              </div>

              <div
                className="absolute rounded-2xl p-4 w-64 z-20 shadow-popup border"
                style={{ left: pendingPin.containerX, top: pendingPin.containerY, background: '#1C1C1E', borderColor: 'rgba(255,255,255,0.10)' }}
                onClick={e => e.stopPropagation()}
              >
                <p className="text-[11px] font-semibold mb-2.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Add annotation</p>
                <textarea
                  autoFocus
                  value={pendingComment}
                  onChange={e => setPendingComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); savePin() } }}
                  placeholder="Describe the issue here…"
                  rows={2}
                  className="w-full text-[13px] rounded-xl px-3 py-2.5 resize-none focus:outline-none mb-3 leading-relaxed font-sans"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,122,255,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={savePin}
                    disabled={saving || !pendingComment.trim()}
                    className="flex-1 text-white text-[12px] font-semibold py-2 rounded-xl transition-all disabled:opacity-40"
                    style={{ background: '#007AFF' }}
                  >
                    {saving ? '…' : 'Pin it'}
                  </button>
                  <button
                    onClick={() => setPendingPin(null)}
                    className="text-[12px] px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.18)' }}>↵ Enter to save</p>
              </div>
            </>
          )}
        </div>

        {/* Annotations sidebar */}
        {existingPins.length > 0 && (
          <div
            className="w-64 flex flex-col overflow-y-auto flex-shrink-0 border-l"
            style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Pins ({existingPins.length})
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {existingPins.map(pin => (
                <button
                  key={pin.id}
                  onClick={() => setActivePin(activePin === pin.id ? null : pin.id)}
                  className="w-full text-left rounded-2xl p-3.5 transition-all border"
                  style={{
                    background: activePin === pin.id ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)',
                    borderColor: activePin === pin.id ? 'rgba(0,122,255,0.3)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: '#007AFF' }}
                    >
                      {pin.number}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{pin.reviewer?.name ?? 'Reviewer'}</span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{pin.comment}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

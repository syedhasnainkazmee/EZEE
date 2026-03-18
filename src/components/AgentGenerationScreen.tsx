'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────

export interface AgentPayload {
  title: string
  description?: string
  tags?: string[]
  workflow_id: string
  task_id?: string | null
}

interface ImageSlot {
  state:        'pending' | 'generating' | 'done' | 'error'
  model:        string
  modelDisplay: string
  label:        string
  url?:         string
}

interface Props {
  payload:  AgentPayload
  onDone:   (submissionId: string) => void
  onError:  () => void
}

// ── Constants ────────────────────────────────────────────────────────────────

const MODEL_COLOR: Record<string, { ring: string; badge: string; dot: string }> = {
  'flux':       { ring: 'ring-blue-300',   badge: 'bg-blue-500/90 text-white',   dot: 'bg-blue-400'   },
  'sd3-medium': { ring: 'ring-purple-300', badge: 'bg-purple-500/90 text-white', dot: 'bg-purple-400' },
  'sd3-large':  { ring: 'ring-violet-300', badge: 'bg-violet-500/90 text-white', dot: 'bg-violet-400' },
  'dalle3':     { ring: 'ring-emerald-300',badge: 'bg-emerald-500/90 text-white',dot: 'bg-emerald-400'},
}

// Mirror DISABLED_MODELS from the API routes — keep in sync
const DISABLED_MODELS: Record<string, boolean> = {
  dalle3: true,
}

const MODELS = [
  { key: 'flux',       label: 'Flux 2 Klein',  short: 'Flux'  },
  { key: 'sd3-medium', label: 'SD3 Medium',    short: 'SD3'   },
  { key: 'sd3-large',  label: 'SD3.5 Large',   short: 'SD3.5' },
  // { key: 'dalle3', label: 'GPT Image 1.5', short: 'GPT' }, // disabled — no budget set
]

function resolveModel(i: number): string {
  const mod = i % 4
  if (mod === 0) return 'flux'
  if (mod === 1) return 'sd3-medium'
  if (mod === 2) return DISABLED_MODELS['dalle3'] ? 'flux' : 'dalle3'
  return 'sd3-large'
}

function makeDefaultSlots(): ImageSlot[] {
  return Array.from({ length: 10 }, (_, i) => {
    const model = resolveModel(i)
    const disp  = MODELS.find(m => m.key === model)?.label ?? model
    const label = 'ABCDEFGHIJ'[i]
    return { state: 'pending', model, modelDisplay: disp, label }
  })
}

// ── Image card ───────────────────────────────────────────────────────────────

function SlotCard({ slot }: { slot: ImageSlot }) {
  const colors = MODEL_COLOR[slot.model] ?? { ring: 'ring-gray-300', badge: 'bg-gray-500/90 text-white', dot: 'bg-gray-400' }

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-p-fill transition-all duration-300 ${
      slot.state === 'generating' ? `ring-2 ${colors.ring}` : 'ring-1 ring-p-border'
    }`} style={{ aspectRatio: '1/1' }}>

      {/* Skeleton shimmer */}
      {slot.state === 'pending' && (
        <div className="absolute inset-0 bg-p-fill">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
        </div>
      )}

      {/* Generating pulse */}
      {slot.state === 'generating' && (
        <div className="absolute inset-0 bg-p-fill flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
          <svg className="animate-spin relative z-10" width="20" height="20" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-60" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}

      {/* Error */}
      {slot.state === 'error' && (
        <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
            <svg width="12" height="12" fill="none" stroke="#dc2626" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <span className="text-[10px] text-red-500 font-semibold">Failed</span>
        </div>
      )}

      {/* Done: actual image */}
      {slot.state === 'done' && slot.url && (
        <img
          src={slot.url}
          alt={`Variation ${slot.label}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Variation label */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
          {slot.label}
        </span>
      </div>

      {/* Model badge — only show when generating or done */}
      {(slot.state === 'generating' || slot.state === 'done') && (
        <div className="absolute bottom-2 right-2 z-10">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${colors.badge}`}>
            {slot.modelDisplay}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AgentGenerationScreen({ payload, onDone, onError }: Props) {
  const [kimiDone,    setKimiDone]    = useState(false)
  const [slots,       setSlots]       = useState<ImageSlot[]>(makeDefaultSlots)
  const [doneCount,   setDoneCount]   = useState(0)
  const [fatalError,  setFatalError]  = useState('')
  const [finished,    setFinished]    = useState(false)

  const handleEvent = useCallback((ev: any) => {
    switch (ev.type) {
      case 'kimi_done':
        setKimiDone(true)
        break
      case 'image_start':
        setSlots(prev => prev.map((s, i) => i === ev.index
          ? { ...s, state: 'generating', model: ev.model, modelDisplay: ev.modelDisplay, label: ev.label }
          : s))
        break
      case 'image_done':
        setSlots(prev => prev.map((s, i) => i === ev.index
          ? { ...s, state: 'done', url: ev.url, model: ev.model, modelDisplay: ev.modelDisplay, label: ev.label }
          : s))
        setDoneCount(c => c + 1)
        break
      case 'image_error':
        setSlots(prev => prev.map((s, i) => i === ev.index
          ? { ...s, state: 'error', model: ev.model, modelDisplay: ev.modelDisplay, label: ev.label }
          : s))
        setDoneCount(c => c + 1)
        break
      case 'done':
        setFinished(true)
        setTimeout(() => onDone(ev.submissionId), 1200)
        break
      case 'error':
        setFatalError(ev.message ?? 'Generation failed')
        break
    }
  }, [onDone])

  useEffect(() => {
    let cancelled = false
    async function run() {
      let res: Response
      try {
        res = await fetch('/api/agent/designer/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (e: any) {
        if (!cancelled) setFatalError(e?.message ?? 'Network error')
        return
      }
      if (!res.ok || !res.body) {
        if (!cancelled) setFatalError(`Request failed (${res.status})`)
        return
      }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (!cancelled) {
        let chunk: { done: boolean; value?: Uint8Array }
        try { chunk = await reader.read() } catch { break }
        if (chunk.done) break
        buf += decoder.decode(chunk.value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { if (!cancelled) handleEvent(JSON.parse(line.slice(6))) } catch {}
          }
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round((doneCount / 10) * 100)

  // ── Per-model counts ──────────────────────────────────────────────────────
  const modelCounts = MODELS.map(m => ({
    ...m,
    total: slots.filter(s => s.model === m.key).length,
    done:  slots.filter(s => s.model === m.key && (s.state === 'done' || s.state === 'error')).length,
  }))

  return (
    <div className="flex flex-col h-full bg-p-bg">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-p-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Animated star */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              finished ? 'bg-emerald-100' : 'bg-violet-100'
            }`}>
              {finished ? (
                <svg width="14" height="14" fill="none" stroke="#10b981" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c3aed">
                  <path d="M12 2a1 1 0 01.894.553l2.184 4.424 4.882.71a1 1 0 01.554 1.706l-3.532 3.442.834 4.862a1 1 0 01-1.451 1.054L12 16.347l-4.365 2.404a1 1 0 01-1.451-1.054l.834-4.862L3.486 9.393a1 1 0 01.554-1.706l4.882-.71L11.106 2.553A1 1 0 0112 2z"/>
                </svg>
              )}
            </div>
            <div>
              <p className="text-[13px] font-bold text-p-text leading-none">
                {finished ? 'All done — redirecting…' : fatalError ? 'Generation failed' : 'AI Designer is working'}
              </p>
              <p className="text-[11px] text-p-tertiary mt-0.5">
                {!kimiDone
                  ? 'Kimi K2 is analyzing the brief and writing concepts…'
                  : finished
                  ? `${doneCount} designs generated`
                  : `${doneCount} / 10 images complete`}
              </p>
            </div>
          </div>
          <span className="text-[12px] font-bold text-p-secondary tabular-nums">{doneCount}/10</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-p-fill rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${finished ? 'bg-emerald-500' : 'bg-violet-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Phase pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Kimi pill */}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
            kimiDone
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-violet-50 text-violet-700 border border-violet-200'
          }`}>
            {kimiDone ? (
              <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            ) : (
              <svg className="animate-spin" width="9" height="9" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            Kimi K2
          </span>

          {/* Per-model pills — only visible once Kimi is done */}
          {kimiDone && modelCounts.map(m => {
            const colors = MODEL_COLOR[m.key]
            const allDone = m.done === m.total
            return (
              <span key={m.key} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                allDone
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-p-fill text-p-secondary border-p-border'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${allDone ? 'bg-emerald-400' : colors?.dot ?? 'bg-gray-400'} ${!allDone && m.done < m.total ? 'animate-pulse' : ''}`} />
                {m.short} {m.done}/{m.total}
              </span>
            )
          })}
        </div>

        {/* Error */}
        {fatalError && (
          <div className="mt-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <p className="text-[12px] text-red-700 font-medium">{fatalError}</p>
            <button onClick={onError} className="text-[12px] font-bold text-red-600 hover:text-red-800 transition-colors ml-4">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ── Image grid ── */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {slots.map((slot, i) => <SlotCard key={i} slot={slot} />)}
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        .animate-shimmer { animation: shimmer 1.6s infinite linear; }
      `}</style>
    </div>
  )
}

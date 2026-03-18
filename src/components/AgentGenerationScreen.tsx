'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface AgentPayload {
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
  copy?:        { headline: string; body: string }
  concept_notes?: string
}

interface Props {
  payload:  AgentPayload
  onDone:   (submissionId: string) => void
  onCancel: () => void
}

// ── Model badge colours ────────────────────────────────────────────────────

const MODEL_BADGE: Record<string, string> = {
  'flux':       'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'sd3-medium': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'sd3-large':  'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  'dalle3':     'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
}

const MODEL_BADGE_MUTED: Record<string, string> = {
  'flux':       'bg-blue-950/40 text-blue-800 border border-blue-900/30',
  'sd3-medium': 'bg-purple-950/40 text-purple-800 border border-purple-900/30',
  'sd3-large':  'bg-violet-950/40 text-violet-800 border border-violet-900/30',
  'dalle3':     'bg-emerald-950/40 text-emerald-800 border border-emerald-900/30',
}

const DEFAULT_SLOTS: ImageSlot[] = Array.from({ length: 10 }, (_, i) => {
  const mod = i % 4
  const model = mod === 0 ? 'flux' : mod === 1 ? 'sd3-medium' : mod === 2 ? 'dalle3' : 'sd3-large'
  const modelDisplay = model === 'flux' ? 'Flux 2 Klein' : model === 'sd3-medium' ? 'SD3 Medium' : model === 'sd3-large' ? 'SD3.5 Large' : 'GPT Image 1.5'
  const label = ['A','B','C','D','E','F','G','H','I','J'][i]
  return { state: 'pending', model, modelDisplay, label }
})

// ── Sub-components ─────────────────────────────────────────────────────────

function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg className="animate-spin" width={size} height={size} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={color} strokeWidth="4"/>
      <path className="opacity-75" fill={color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
  )
}

function ImageSlotCard({ slot, index }: { slot: ImageSlot; index: number }) {
  const badgeClass = slot.state === 'done'
    ? (MODEL_BADGE[slot.model] ?? 'bg-gray-700 text-gray-300 border border-gray-600')
    : (MODEL_BADGE_MUTED[slot.model] ?? 'bg-gray-900 text-gray-700 border border-gray-800')

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-500 ${
        slot.state === 'generating'
          ? 'ring-2 ring-white/20 animate-pulse'
          : slot.state === 'done'
          ? 'ring-1 ring-white/10'
          : ''
      }`}
      style={{ aspectRatio: '1 / 1', background: '#1a1a1a' }}
    >
      {/* Shimmer for pending/generating */}
      {(slot.state === 'pending' || slot.state === 'generating') && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
      )}

      {/* Error state */}
      {slot.state === 'error' && (
        <div className="absolute inset-0 bg-red-950/50 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-900/80 flex items-center justify-center">
            <svg width="14" height="14" fill="none" stroke="#f87171" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <span className="text-[10px] text-red-400 font-medium">Failed</span>
        </div>
      )}

      {/* Image when done */}
      {slot.state === 'done' && slot.url && (
        <img
          src={slot.url}
          alt={`Variation ${slot.label}`}
          className="w-full h-full object-cover transition-opacity duration-700"
        />
      )}

      {/* Generating spinner overlay */}
      {slot.state === 'generating' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={24} color="#6b7280" />
        </div>
      )}

      {/* Label badge (bottom-left) */}
      <div className="absolute bottom-2 left-2">
        <span className="text-[10px] font-bold text-white/60 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {slot.label}
        </span>
      </div>

      {/* Model badge (bottom-right) */}
      <div className="absolute bottom-2 right-2">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm ${badgeClass}`}>
          {slot.modelDisplay}
        </span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AgentGenerationScreen({ payload, onDone, onCancel }: Props) {
  const [kimiDone,    setKimiDone]    = useState(false)
  const [slots,       setSlots]       = useState<ImageSlot[]>(DEFAULT_SLOTS)
  const [doneCount,   setDoneCount]   = useState(0)
  const [fatalError,  setFatalError]  = useState('')
  const [finished,    setFinished]    = useState(false)
  const [submissionId, setSubmissionId] = useState('')
  const [allDoneMsg,  setAllDoneMsg]  = useState(false)

  const totalCount = slots.length

  const handleEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'kimi_start':
        // Kimi is running — already reflected by kimiDone=false
        break

      case 'kimi_done':
        setKimiDone(true)
        break

      case 'submission_created':
        setSubmissionId(event.submissionId)
        break

      case 'image_start':
        setSlots(prev => prev.map((s, i) =>
          i === event.index
            ? { ...s, state: 'generating', model: event.model, modelDisplay: event.modelDisplay, label: event.label }
            : s
        ))
        break

      case 'image_done':
        setSlots(prev => prev.map((s, i) =>
          i === event.index
            ? {
                ...s,
                state:         'done',
                url:           event.url,
                copy:          event.copy,
                concept_notes: event.concept_notes,
                model:         event.model,
                modelDisplay:  event.modelDisplay,
                label:         event.label,
              }
            : s
        ))
        setDoneCount(prev => prev + 1)
        break

      case 'image_error':
        setSlots(prev => prev.map((s, i) =>
          i === event.index
            ? { ...s, state: 'error', model: event.model, modelDisplay: event.modelDisplay, label: event.label }
            : s
        ))
        setDoneCount(prev => prev + 1)
        break

      case 'done':
        setSubmissionId(event.submissionId)
        setFinished(true)
        setAllDoneMsg(true)
        setTimeout(() => { onDone(event.submissionId) }, 1500)
        break

      case 'error':
        setFatalError(event.message ?? 'An unexpected error occurred.')
        break
    }
  }, [onDone])

  useEffect(() => {
    let cancelled = false

    async function run() {
      let res: Response
      try {
        res = await fetch('/api/agent/designer/stream', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
      } catch (e: any) {
        if (!cancelled) setFatalError(e.message ?? 'Network error')
        return
      }

      if (!res.ok || !res.body) {
        if (!cancelled) setFatalError(`Request failed: ${res.status}`)
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (!cancelled) {
        let chunk: { done: boolean; value?: Uint8Array }
        try {
          chunk = await reader.read()
        } catch {
          break
        }
        if (chunk.done) break

        buffer += decoder.decode(chunk.value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              if (!cancelled) handleEvent(event)
            } catch {}
          }
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0D0D0D' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Star icon */}
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-violet-400">
              <path d="M12 2a1 1 0 01.894.553l2.184 4.424 4.882.71a1 1 0 01.554 1.706l-3.532 3.442.834 4.862a1 1 0 01-1.451 1.054L12 16.347l-4.365 2.404a1 1 0 01-1.451-1.054l.834-4.862L3.486 9.393a1 1 0 01.554-1.706l4.882-.71L11.106 2.553A1 1 0 0112 2z"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold text-white">AI Designer</span>
        </div>

        {/* Progress pill */}
        {!fatalError && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-white/40 font-medium">
              {doneCount} / {totalCount} images
            </span>
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Close button — only when finished or error */}
        {(finished || fatalError) && (
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
            aria-label="Close"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-6 px-6 py-7 border-r border-white/[0.06] overflow-y-auto">

          {/* Phase 1: Kimi K2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                kimiDone ? 'bg-emerald-500' : 'bg-violet-500'
              }`}>
                {kimiDone
                  ? <CheckIcon size={10} />
                  : <Spinner size={10} color="white" />
                }
              </div>
              <span className={`text-[13px] font-semibold transition-colors ${kimiDone ? 'text-white/50' : 'text-white'}`}>
                Kimi K2 Concepts
              </span>
            </div>

            {!kimiDone && (
              <p className="text-[11.5px] text-white/30 leading-relaxed pl-7">
                Analyzing brief and writing 10 creative concepts…
              </p>
            )}
            {kimiDone && (
              <p className="text-[11.5px] text-emerald-500/70 pl-7 font-medium">
                10 concepts ready
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Phase 2: Images */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                finished
                  ? 'bg-emerald-500'
                  : kimiDone
                  ? 'bg-violet-500'
                  : 'bg-white/10'
              }`}>
                {finished
                  ? <CheckIcon size={10} />
                  : kimiDone
                  ? <Spinner size={10} color="white" />
                  : null
                }
              </div>
              <span className={`text-[13px] font-semibold transition-colors ${
                finished ? 'text-white/50' : kimiDone ? 'text-white' : 'text-white/30'
              }`}>
                Images Rendering
              </span>
            </div>

            <p className={`text-[11.5px] pl-7 font-medium transition-colors ${
              finished ? 'text-emerald-500/70' : 'text-white/30'
            }`}>
              {doneCount} / {totalCount} complete
            </p>

            {/* Per-model progress */}
            {kimiDone && (
              <div className="pl-7 space-y-1 pt-1">
                {[
                  { model: 'flux',       label: 'Flux 2 Klein',   badge: 'text-blue-400' },
                  { model: 'sd3-medium', label: 'SD3 Medium',     badge: 'text-purple-400' },
                  { model: 'dalle3',     label: 'GPT Image 1.5',  badge: 'text-emerald-400' },
                  { model: 'sd3-large',  label: 'SD3.5 Large',    badge: 'text-violet-400' },
                ].map(({ model, label, badge }) => {
                  const modelSlots = slots.filter(s => s.model === model)
                  const doneCt = modelSlots.filter(s => s.state === 'done' || s.state === 'error').length
                  return (
                    <div key={model} className="flex items-center justify-between">
                      <span className={`text-[10.5px] font-medium ${badge}`}>{label}</span>
                      <span className="text-[10px] text-white/20">{doneCt}/{modelSlots.length}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* All done message */}
          {allDoneMsg && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex flex-col items-start gap-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckIcon size={14} />
                  <span className="text-[13px] font-bold">All done!</span>
                </div>
                <p className="text-[11px] text-white/30">Redirecting to your designs…</p>
              </div>
            </>
          )}

          {/* Fatal error */}
          {fatalError && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <svg width="14" height="14" fill="none" stroke="#f87171" viewBox="0 0 24 24" strokeWidth={2} className="flex-shrink-0 mt-px">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <p className="text-[11.5px] text-red-400 leading-relaxed">{fatalError}</p>
                </div>
                <button
                  onClick={onCancel}
                  className="text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors underline"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Right panel: image grid ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3 auto-rows-fr">
            {slots.map((slot, i) => (
              <ImageSlotCard key={i} slot={slot} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Global shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%) }
          100% { transform: translateX(100%) }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  )
}

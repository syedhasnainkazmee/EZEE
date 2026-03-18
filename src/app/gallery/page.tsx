'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

type GalleryDesign = {
  id: string
  filename: string
  original_name: string
  variation_label: string
  model: string | null
  copy: string | null
  concept_notes: string | null
  liked: boolean
  submission_id: string
  submission_title: string
  submission_tags: string | null
  submission_created_at: string
}

const MODEL_FILTERS = ['All', 'Flux', 'SD3', 'SD3.5', 'GPT-1.5'] as const
type ModelFilter = typeof MODEL_FILTERS[number]

type SortKey = 'newest' | 'oldest' | 'liked'

function modelLabel(model: string | null) {
  if (model === 'flux')       return 'Flux'
  if (model === 'sd3-medium') return 'SD3'
  if (model === 'sd3-large')  return 'SD3.5'
  if (model === 'dalle3')     return 'GPT-1.5'
  return null
}

function modelColors(model: string | null) {
  if (model === 'flux')       return 'bg-blue-50 text-blue-600 border-blue-100'
  if (model === 'sd3-medium') return 'bg-purple-50 text-purple-600 border-purple-100'
  if (model === 'sd3-large')  return 'bg-orange-50 text-orange-600 border-orange-100'
  if (model === 'dalle3')     return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  return 'bg-p-fill text-p-tertiary'
}

function matchesModelFilter(design: GalleryDesign, filter: ModelFilter) {
  if (filter === 'All')     return true
  if (filter === 'Flux')    return design.model === 'flux'
  if (filter === 'SD3')     return design.model === 'sd3-medium'
  if (filter === 'SD3.5')   return design.model === 'sd3-large'
  if (filter === 'GPT-1.5') return design.model === 'dalle3'
  return true
}

export default function GalleryPage() {
  const [designs, setDesigns]   = useState<GalleryDesign[]>([])
  const [loading, setLoading]   = useState(true)
  const [modelFilter, setModelFilter] = useState<ModelFilter>('All')
  const [likedOnly, setLikedOnly] = useState(false)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState<SortKey>('newest')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => {
        const rows: GalleryDesign[] = d.designs ?? []
        setDesigns(rows)
        setLikedIds(new Set(rows.filter(r => r.liked).map(r => r.id)))
      })
      .catch(err => console.error('[gallery] fetch error:', err))
      .finally(() => setLoading(false))
  }, [])

  async function toggleLike(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    const res = await fetch(`/api/designs/${id}/like`, { method: 'POST' })
    if (!res.ok) return
    const { liked } = await res.json()
    setLikedIds(prev => {
      const next = new Set(prev)
      liked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = designs
      .filter(d => matchesModelFilter(d, modelFilter))
      .filter(d => !likedOnly || likedIds.has(d.id))
      .filter(d => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        const title = d.submission_title.replace(/^\[AI\]\s*/i, '').toLowerCase()
        const concept = (d.concept_notes ?? '').toLowerCase()
        const adCopy = d.copy ? (() => { try { const p = JSON.parse(d.copy!); return `${p.headline ?? ''} ${p.body ?? ''}`.toLowerCase() } catch { return '' } })() : ''
        return title.includes(q) || concept.includes(q) || adCopy.includes(q)
      })

    if (sort === 'newest') list = [...list].sort((a, b) => b.submission_created_at.localeCompare(a.submission_created_at))
    if (sort === 'oldest') list = [...list].sort((a, b) => a.submission_created_at.localeCompare(b.submission_created_at))
    if (sort === 'liked')  list = [...list].sort((a, b) => (likedIds.has(b.id) ? 1 : 0) - (likedIds.has(a.id) ? 1 : 0))

    return list
  }, [designs, modelFilter, likedOnly, likedIds, search, sort])

  const counts = {
    All:      designs.length,
    Flux:     designs.filter(d => d.model === 'flux').length,
    SD3:      designs.filter(d => d.model === 'sd3-medium').length,
    'SD3.5':  designs.filter(d => d.model === 'sd3-large').length,
    'GPT-1.5':designs.filter(d => d.model === 'dalle3').length,
  }

  const likedCount = likedIds.size

  return (
    <div className="flex-1 bg-p-bg min-h-screen">
      {/* Header */}
      <header className="bg-p-bg/90 border-b-2 border-p-border sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 space-y-3">

          {/* Top row: title + search + sort */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-violet-600">
                  <path d="M12 2a1 1 0 01.894.553l2.184 4.424 4.882.71a1 1 0 01.554 1.706l-3.532 3.442.834 4.862a1 1 0 01-1.451 1.054L12 16.347l-4.365 2.404a1 1 0 01-1.451-1.054l.834-4.862L3.486 9.393a1 1 0 01.554-1.706l4.882-.71L11.106 2.553A1 1 0 0112 2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-p-text leading-none">AI Studio</h1>
                <p className="text-[11px] text-p-quaternary mt-0.5">{designs.length} generated images</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-p-quaternary" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                placeholder="Search concepts…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 border-2 border-p-border rounded-xl text-[12px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent/60 bg-white transition-colors w-44"
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="border-2 border-p-border rounded-xl text-[12px] text-p-secondary bg-white px-3 py-2 focus:outline-none focus:border-p-accent/60 transition-colors cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="liked">Liked first</option>
            </select>

            {/* Liked toggle */}
            <button
              onClick={() => setLikedOnly(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${
                likedOnly
                  ? 'bg-pink-50 border-pink-300 text-pink-600'
                  : 'bg-white border-p-border text-p-tertiary hover:border-pink-200 hover:text-pink-500'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={likedOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              Liked
              {likedCount > 0 && <span className="opacity-60">{likedCount}</span>}
            </button>
          </div>

          {/* Model filter pills */}
          <div className="flex items-center gap-1.5">
            {MODEL_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setModelFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  modelFilter === f
                    ? 'bg-p-nav text-white'
                    : 'bg-white border-2 border-p-border text-p-tertiary hover:border-p-text/30 hover:text-p-text'
                }`}
              >
                {f}
                <span className={`ml-1.5 text-[10px] ${modelFilter === f ? 'opacity-60' : 'opacity-50'}`}>
                  {counts[f]}
                </span>
              </button>
            ))}

            {/* Result count */}
            {(search || likedOnly || modelFilter !== 'All') && (
              <span className="ml-auto text-[11px] text-p-tertiary font-medium">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid rounded-2xl bg-white border-2 border-p-border animate-pulse"
                style={{ height: `${200 + (i % 3) * 80}px` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-3xl bg-violet-50 flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-violet-300">
                <path d="M12 2a1 1 0 01.894.553l2.184 4.424 4.882.71a1 1 0 01.554 1.706l-3.532 3.442.834 4.862a1 1 0 01-1.451 1.054L12 16.347l-4.365 2.404a1 1 0 01-1.451-1.054l.834-4.862L3.486 9.393a1 1 0 01.554-1.706l4.882-.71L11.106 2.553A1 1 0 0112 2z"/>
              </svg>
            </div>
            <p className="text-[18px] font-bold text-p-secondary font-display mb-2">
              {designs.length === 0 ? 'No AI images yet' : 'No results found'}
            </p>
            <p className="text-[13px] text-p-quaternary max-w-xs leading-relaxed">
              {designs.length === 0
                ? 'Activate the AI Designer from any submission to generate your first batch of concepts.'
                : 'Try adjusting your filters or search.'}
            </p>
            {designs.length === 0 ? (
              <Link
                href="/submit"
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #D4512E, #C04428)', boxShadow: '0 4px 14px -3px rgba(212,81,46,0.38)' }}
              >
                New Submission
              </Link>
            ) : (
              <button
                onClick={() => { setSearch(''); setModelFilter('All'); setLikedOnly(false); setSort('newest') }}
                className="mt-4 text-[12px] font-bold text-p-accent hover:text-p-accent-h transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {filtered.map(design => {
              const adCopy = design.copy ? (() => { try { return JSON.parse(design.copy!) } catch { return null } })() : null
              const isLiked = likedIds.has(design.id)
              const label = modelLabel(design.model)
              const cleanTitle = design.submission_title.replace(/^\[AI\]\s*/i, '')

              return (
                <Link
                  key={design.id}
                  href={`/submission/${design.submission_id}`}
                  className="break-inside-avoid block mb-4 group"
                >
                  <div className="rounded-2xl overflow-hidden bg-white border-2 border-transparent hover:border-p-border/60 shadow-sm hover:shadow-card transition-all duration-300">
                    {/* Image */}
                    <div className="relative overflow-hidden bg-p-bg">
                      <img
                        src={design.filename}
                        alt={design.original_name}
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-end justify-end p-3">
                        <button
                          onClick={e => toggleLike(e, design.id)}
                          title={isLiked ? 'Remove from training' : 'Like — agent learns from this'}
                          className={`opacity-0 group-hover:opacity-100 transition-all duration-200 w-8 h-8 rounded-xl flex items-center justify-center ${
                            isLiked
                              ? 'bg-pink-500 text-white'
                              : 'bg-white/90 text-p-quaternary hover:text-pink-500'
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="px-4 pt-3 pb-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] text-p-quaternary uppercase tracking-wide font-bold truncate flex-1">
                          {cleanTitle}
                        </p>
                        {label && (
                          <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${modelColors(design.model)}`}>
                            {label}
                          </span>
                        )}
                      </div>
                      {adCopy?.headline && (
                        <p className="text-[12px] font-bold text-p-text leading-snug">{adCopy.headline}</p>
                      )}
                      {adCopy?.body && (
                        <p className="text-[11px] text-p-secondary leading-relaxed line-clamp-2">{adCopy.body}</p>
                      )}
                      {design.concept_notes && !adCopy?.headline && (
                        <p className="text-[11px] text-p-tertiary leading-relaxed line-clamp-2 italic">{design.concept_notes}</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

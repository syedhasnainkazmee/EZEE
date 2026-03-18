'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

type LibraryItem = {
  id: string
  title: string
  description: string
  tags: string[]
  drive_folder_url: string | null
  created_at: string
  submitter_name: string | null
  workflow_name: string
  thumbnail: string | null
  design_count: number
}

type SortKey = 'newest' | 'oldest' | 'az' | 'za'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LibraryPage() {
  const [items, setItems]         = useState<LibraryItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState<SortKey>('newest')

  useEffect(() => {
    fetch('/api/library')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const allTags      = useMemo(() => Array.from(new Set(items.flatMap(i => i.tags))).sort(), [items])
  const allWorkflows = useMemo(() => Array.from(new Set(items.map(i => i.workflow_name).filter(Boolean))).sort(), [items])

  const filtered = useMemo(() => {
    let list = items.filter(item => {
      const matchTag      = !activeTag || item.tags.includes(activeTag)
      const matchWorkflow = !activeWorkflow || item.workflow_name === activeWorkflow
      const matchSearch   = !search.trim() || item.title.toLowerCase().includes(search.toLowerCase())
      return matchTag && matchWorkflow && matchSearch
    })

    if (sort === 'newest') list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'oldest') list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))
    if (sort === 'az')     list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'za')     list = [...list].sort((a, b) => b.title.localeCompare(a.title))

    return list
  }, [items, activeTag, activeWorkflow, search, sort])

  const hasActiveFilter = search || activeTag || activeWorkflow

  return (
    <div className="flex-1 min-h-screen bg-p-bg">
      {/* Header */}
      <div className="bg-white border-b border-p-border px-8 py-7">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-p-text tracking-tight">Approved Library</h1>
              <p className="text-[14px] text-p-secondary mt-1">All approved design deliverables — ready to use.</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 mt-1">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-p-quaternary" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2.5 border-2 border-p-border rounded-xl text-[13px] text-p-text placeholder-p-quaternary focus:outline-none focus:border-p-accent bg-p-surface transition-colors w-52"
                />
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="border-2 border-p-border rounded-xl text-[13px] text-p-secondary bg-white px-3 py-2.5 focus:outline-none focus:border-p-accent/60 transition-colors cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>

              <span className="text-[13px] text-p-tertiary font-medium">
                {loading ? '…' : `${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Filter strips */}
          {!loading && (
            <div className="mt-5 space-y-2.5">
              {/* Tag filter */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-p-quaternary uppercase tracking-widest w-16 flex-shrink-0">Tags</span>
                  <button
                    onClick={() => setActiveTag(null)}
                    className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full border-2 transition-all"
                    style={{
                      borderColor: !activeTag ? '#D4512E' : 'transparent',
                      background:  !activeTag ? 'rgba(212,81,46,0.08)' : 'rgba(0,0,0,0.05)',
                      color:       !activeTag ? '#D4512E' : '#6B6560',
                    }}
                  >
                    All
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                      className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full border-2 transition-all"
                      style={{
                        borderColor: activeTag === tag ? '#D4512E' : 'transparent',
                        background:  activeTag === tag ? 'rgba(212,81,46,0.08)' : 'rgba(0,0,0,0.05)',
                        color:       activeTag === tag ? '#D4512E' : '#6B6560',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Workflow filter */}
              {allWorkflows.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-p-quaternary uppercase tracking-widest w-16 flex-shrink-0">Workflow</span>
                  <button
                    onClick={() => setActiveWorkflow(null)}
                    className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full border-2 transition-all"
                    style={{
                      borderColor: !activeWorkflow ? '#100F0D' : 'transparent',
                      background:  !activeWorkflow ? 'rgba(16,15,13,0.08)' : 'rgba(0,0,0,0.05)',
                      color:       !activeWorkflow ? '#100F0D' : '#6B6560',
                    }}
                  >
                    All
                  </button>
                  {allWorkflows.map(wf => (
                    <button
                      key={wf}
                      onClick={() => setActiveWorkflow(wf === activeWorkflow ? null : wf)}
                      className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full border-2 transition-all"
                      style={{
                        borderColor: activeWorkflow === wf ? '#100F0D' : 'transparent',
                        background:  activeWorkflow === wf ? 'rgba(16,15,13,0.08)' : 'rgba(0,0,0,0.05)',
                        color:       activeWorkflow === wf ? '#100F0D' : '#6B6560',
                      }}
                    >
                      {wf}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-p-border animate-pulse overflow-hidden shadow-card">
                <div className="aspect-[4/3] bg-p-fill" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-p-fill rounded-lg w-3/4" />
                  <div className="h-3 bg-p-fill rounded-lg w-1/2" />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 bg-p-fill rounded-full" />
                    <div className="h-5 w-20 bg-p-fill rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white border-2 border-p-border flex items-center justify-center mb-5 shadow-card">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-quaternary" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[17px] font-bold text-p-secondary font-display">
              {items.length === 0 ? 'No approved designs yet' : 'No results found'}
            </p>
            <p className="text-[13px] text-p-tertiary mt-1.5 max-w-sm">
              {items.length === 0
                ? 'Once submissions are approved, their designs will appear here for easy access.'
                : 'Try adjusting your filters or search.'}
            </p>
            {items.length === 0 ? (
              <Link href="/submit" className="mt-6 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#D4512E' }}>
                New Request
              </Link>
            ) : hasActiveFilter && (
              <button
                onClick={() => { setSearch(''); setActiveTag(null); setActiveWorkflow(null) }}
                className="mt-4 text-[12px] font-bold text-p-accent hover:text-p-accent-h transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-p-border overflow-hidden shadow-card hover:shadow-card-h transition-all duration-200 group flex flex-col">
                {/* Thumbnail */}
                <Link href={`/submission/${item.id}`} className="block relative aspect-[4/3] bg-p-fill overflow-hidden flex-shrink-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-p-quaternary" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {item.design_count > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                      +{item.design_count - 1} more
                    </span>
                  )}
                  <span className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Approved
                  </span>
                </Link>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/submission/${item.id}`} className="group/title">
                    <h3 className="text-[14px] font-bold text-p-text leading-snug group-hover/title:text-p-accent transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-p-tertiary flex-wrap">
                    {item.submitter_name && (
                      <>
                        <span className="font-medium">{item.submitter_name}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{fmtDate(item.created_at)}</span>
                    {item.workflow_name && (
                      <>
                        <span>·</span>
                        <button
                          onClick={() => setActiveWorkflow(item.workflow_name === activeWorkflow ? null : item.workflow_name)}
                          className="font-medium hover:text-p-accent transition-colors"
                        >
                          {item.workflow_name}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map(tag => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors"
                          style={{
                            background: activeTag === tag ? 'rgba(212,81,46,0.10)' : 'rgba(0,0,0,0.05)',
                            color:      activeTag === tag ? '#D4512E' : '#6B6560',
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[11px] text-p-quaternary font-medium px-1 py-0.5">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Drive button */}
                  <div className="mt-auto pt-4">
                    {item.drive_folder_url ? (
                      <a
                        href={item.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12.5px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
                        style={{ background: '#0EA572' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 87.3 78" fill="none">
                          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#fff" fillOpacity=".9"/>
                          <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 49.5C.4 50.9 0 52.45 0 54h27.5l16.15-29z" fill="#fff" fillOpacity=".9"/>
                          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.65 7.9 12.15z" fill="#fff" fillOpacity=".9"/>
                          <path d="M43.65 25L57.4 1.2C56.05.43 54.55 0 52.95 0H34.35c-1.6 0-3.1.43-4.45 1.2L43.65 25z" fill="#fff" fillOpacity=".9"/>
                          <path d="M59.8 54H27.5L13.75 77.8c1.35.77 2.85 1.2 4.45 1.2h50.9c1.6 0 3.1-.43 4.45-1.2L59.8 54z" fill="#fff" fillOpacity=".9"/>
                          <path d="M73.4 27L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 29H87.3c0-1.55-.4-3.1-1.2-4.5L73.4 27z" fill="#fff" fillOpacity=".9"/>
                        </svg>
                        Open Drive Folder
                      </a>
                    ) : (
                      <Link
                        href={`/submission/${item.id}`}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors border-2 border-p-border text-p-secondary hover:border-p-accent hover:text-p-accent"
                      >
                        View Submission
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

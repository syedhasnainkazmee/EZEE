import { NextResponse } from 'next/server'
import { client } from '@/lib/schema'

export async function GET() {
  try {
    // Step 1: all AI submissions
    const subResult = await client.execute(
      "SELECT id, title, tags FROM submissions WHERE submitted_by = 'ai-designer-agent'"
    )
    const subs = subResult.rows as { id: string; title: string; tags: string | null }[]

    if (subs.length === 0) return NextResponse.json({ designs: [] })

    // Step 2: all designs for those submissions using parameterised IN clause
    const placeholders = subs.map((_, i) => `?${i + 1}`).join(', ')
    const ids = subs.map(s => s.id)
    const designResult = await client.execute({
      sql: `SELECT id, submission_id, filename, original_name, variation_label, model, copy, concept_notes, liked FROM designs WHERE submission_id IN (${placeholders})`,
      args: ids,
    })
    const designs = designResult.rows as {
      id: string; submission_id: string; filename: string; original_name: string
      variation_label: string; model: string | null; copy: string | null
      concept_notes: string | null; liked: number
    }[]

    // Step 3: merge
    const subMap = Object.fromEntries(subs.map(s => [s.id, s]))
    const rows = designs.map(d => ({
      id:               d.id,
      filename:         d.filename,
      original_name:    d.original_name,
      variation_label:  d.variation_label,
      model:            d.model,
      copy:             d.copy,
      concept_notes:    d.concept_notes,
      liked:            Boolean(d.liked),
      submission_id:    d.submission_id,
      submission_title: subMap[d.submission_id]?.title ?? '',
      submission_tags:  subMap[d.submission_id]?.tags ?? null,
    }))

    return NextResponse.json({ designs: rows })
  } catch (err) {
    console.error('[gallery] query error:', err)
    return NextResponse.json({ error: String(err), designs: [] }, { status: 500 })
  }
}

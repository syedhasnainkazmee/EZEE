import { NextResponse } from 'next/server'
import { db, designs as designsTable, submissions as submissionsTable } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'

export async function GET() {
  try {
    // Step 1: all AI submissions
    const subs = await db
      .select({ id: submissionsTable.id, title: submissionsTable.title, tags: submissionsTable.tags })
      .from(submissionsTable)
      .where(eq(submissionsTable.submitted_by, 'ai-designer-agent'))
      .all()

    if (subs.length === 0) return NextResponse.json({ designs: [] })

    // Step 2: all designs for those submissions
    const subIds = subs.map(s => s.id)
    const designs = await db
      .select()
      .from(designsTable)
      .where(inArray(designsTable.submission_id, subIds))
      .all()

    // Step 3: merge submission data onto each design
    const subMap = Object.fromEntries(subs.map(s => [s.id, s]))
    const rows = designs.map(d => ({
      id:               d.id,
      filename:         d.filename,
      original_name:    d.original_name,
      variation_label:  d.variation_label,
      model:            d.model,
      copy:             d.copy,
      concept_notes:    d.concept_notes,
      liked:            d.liked,
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

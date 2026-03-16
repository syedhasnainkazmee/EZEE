import { NextResponse } from 'next/server'
import { db, designs as designsTable, submissions as submissionsTable } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const rows = await db
    .select({
      id:               designsTable.id,
      filename:         designsTable.filename,
      original_name:    designsTable.original_name,
      variation_label:  designsTable.variation_label,
      model:            designsTable.model,
      copy:             designsTable.copy,
      concept_notes:    designsTable.concept_notes,
      liked:            designsTable.liked,
      submission_id:    designsTable.submission_id,
      submission_title: submissionsTable.title,
      submission_tags:  submissionsTable.tags,
    })
    .from(designsTable)
    .innerJoin(submissionsTable, eq(designsTable.submission_id, submissionsTable.id))
    .where(eq(submissionsTable.submitted_by, 'ai-designer-agent'))
    .all()

  return NextResponse.json({ designs: rows })
}

import { NextRequest, NextResponse } from 'next/server'
import { getSubmission } from '@/lib/db'
import { randomUUID } from 'crypto'
import { db, designs as designsTable } from '@/lib/schema'

export const maxDuration = 60

type DesignInput = {
  blobUrl: string
  originalName: string
  variationLabel: string
  orderIndex: number
  version: number
}

export async function POST(req: NextRequest) {
  const { submissionId, designs } = await req.json()
  if (!submissionId || !Array.isArray(designs) || designs.length === 0) {
    return NextResponse.json({ error: 'Missing submissionId or designs' }, { status: 400 })
  }

  const submission = await getSubmission(submissionId)
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const rows = (designs as DesignInput[]).map(d => ({
    id:              randomUUID(),
    submission_id:   submissionId,
    filename:        d.blobUrl,
    original_name:   d.originalName,
    variation_label: d.variationLabel,
    order_index:     d.orderIndex,
    version:         d.version,
  }))

  await db.insert(designsTable).values(rows).run()

  return NextResponse.json({ designs: rows }, { status: 201 })
}
